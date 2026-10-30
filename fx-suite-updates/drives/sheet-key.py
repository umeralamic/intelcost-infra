"""The sheet-name and scale answer key (D-843): the sheets, the drive that fetches them, and the one that measures the
api's on-load read against what each sheet really says. Kept in the fx suite, not the app.

    # the sheets of a throwaway copy's workspace, as one-page PDFs and a manifest, into /tmp/sheet-key
    docker compose exec -T api sh -lc "cd /srv && PYTHONPATH=/srv:/srv/drives python - fetch <workspace uuid>" \
        <fx-suite-updates/drives/sheet-key.py
    docker cp intelcost-bench-api-1:/tmp/sheet-key/. fx-suite-updates/sheet-key/pdfs/

    # what each sheet's text says where a title block is, and every printed scale on it: the labelling aid
    ... python - dump /tmp/sheet-key

    # the read on load against the key: each field's accuracy, time per sheet and per set, the sheets still wrong
    ... python - measure /tmp/sheet-key /tmp/sheet-key/key.json

`fetch` reads the database and the bucket and writes nothing to either. `dump` and `measure` read only the files:
the api's own readers (`naming`, `reading`, `read_on_load.read_page`'s steps) on each page, a set at a time, as the
worker reads them on load, so a template formed by a set's first sheets names the rest.
"""

import guard  # noqa: F401  (first: the protected projects refused before any read or write, D-667)

import json
import math
import pathlib
import re
import statistics
import sys
import time
from typing import Any

import pymupdf

from app.features.drawing import naming, read_on_load, reading
from app.features.drawing.read_on_load import set_key

OUT = pathlib.Path("/tmp/sheet-key")


def fetch(workspace_uuid: str, project: str = "", folder: str = str(OUT)) -> None:
    """The workspace's sheets (only a project whose name holds `project`, when given) into `folder`."""
    out = pathlib.Path(folder)
    from sqlalchemy import text

    from app.core import storage
    from app.database import SyncSessionFactory

    out.mkdir(parents=True, exist_ok=True)
    with SyncSessionFactory() as session:
        rows = session.execute(
            text(
                """
                select s.uuid, p.name, s.page_number, s.sort_order, s.source_key, s.folder_id, s.file_id,
                       f.page_count, f.display_name, s.width_pt, s.height_pt, s.text_layer_available
                from drawing_sheet s
                join project p on p.id = s.project_id
                join workspace w on w.id = s.workspace_id
                join drawing_file f on f.id = s.file_id
                where w.uuid = :ws and s.source_key is not null and p.name like :project
                order by p.name, s.folder_id nulls first, s.file_id, s.page_number
                """
            ),
            {"ws": workspace_uuid, "project": f"%{project}%"},
        ).all()
    manifest = []
    for uuid, project, page, sort, key, folder, file_id, pages, file_name, w, h, text_layer in rows:
        name = f"{uuid}.pdf"
        (out / name).write_bytes(storage.get_bytes(key))
        manifest.append(
            {
                "sheet": str(uuid),
                "project": project,
                "page": page,
                "sort": sort,
                "file": name,
                "file_name": file_name,
                "set": set_key(folder, file_id, int(pages or 1), float(w or 0), float(h or 0)),
                "text_layer": bool(text_layer),
            }
        )
    (out / "manifest.json").write_text(json.dumps(manifest, indent=1))
    print(f"fetch: {len(manifest)} sheets into {out}")


def _page(path: pathlib.Path) -> tuple[Any, Any, dict[str, Any], list[reading.Piece]]:
    doc = pymupdf.open(path)
    page = doc[0]
    page_text = page.get_text("dict", flags=pymupdf.TEXTFLAGS_DICT & ~pymupdf.TEXT_PRESERVE_IMAGES)
    return doc, page, page_text, reading.page_pieces(page, page_text)


def dump(folder: str) -> None:
    """For labelling: the lines of the page's right and bottom edges (where title blocks sit), and each printed
    scale with where it is."""
    root = pathlib.Path(folder)
    manifest = json.loads((root / "manifest.json").read_text())
    out = []
    for m in manifest:
        doc, page, page_text, pieces = _page(root / m["file"])
        lines = reading.group_lines(pieces)
        edge = [
            ln.text
            for ln in lines
            if (ln.box.x > 0.72 or ln.box.y > 0.82) and len(ln.text.strip()) > 1
        ]
        scales = [
            {"label": f.parsed.label, "at": [round(f.boxes[0][0].x, 3), round(f.boxes[0][0].y, 3)]}
            for f in reading.find_all_scales(pieces)
        ]
        out.append({**m, "pieces": len(pieces), "edge": edge[:80], "scales": scales})
        doc.close()
    print(json.dumps(out, indent=1))


# --- measure ------------------------------------------------------------------------------------


def _norm_number(s: str | None) -> str:
    return re.sub(r"[\s\-_.]", "", (s or "").upper())


def _norm_title(s: str | None) -> str:
    return re.sub(r"[^A-Z0-9]+", " ", (s or "").upper()).strip()


def _key_scale(label: str | None) -> float | None:
    """The key's scale as feet per point: NTS and none are None."""
    if not label or label.upper() in {"NTS", "N.T.S.", "NONE"}:
        return None
    parsed = reading.parse_scale_text(label)
    return parsed.feet_per_pt if parsed else math.nan


AI = {"calls": 0, "tokens_in": 0, "tokens_out": 0, "usd": 0.0, "seconds": 0.0}


def _ai_scan(page: Any, scale: bool = True, name: bool = True) -> tuple[str | None, str | None, list[reading.ScaleRead]]:
    """A page's AI read as the worker asks it on load: read_on_load.ai_asks (the crops and prompts) and ai_found
    (the parsing), each tool's own model, unmetered here; the calls, tokens and list-price cost counted. Before
    D-847 (--before) the worker had no ai_asks: then the title block's corner for both, as it was."""
    import asyncio

    from app.database import SessionFactory, engine
    from app.features.ai import meter, prompts, provider, service
    from app.features.ai.routes import parse_region
    from app.features.drawing import read_on_load

    if hasattr(read_on_load, "ai_asks"):
        asks = read_on_load.ai_asks(page, name, scale)
    else:
        asks = [
            (tool, prompts.prompt_for(tool), *read_on_load._crop(page, reading.TITLE_BLOCK_BOX, px))
            for tool, px in (("title_block", read_on_load.TITLE_BLOCK_PX), ("scale", read_on_load.SCALE_PX))[: 2 if scale else 1]
        ]

    async def ask() -> dict[str, dict[str, Any]]:
        out: dict[str, dict[str, Any]] = {}
        try:
            async with SessionFactory() as session:
                for tool, prompt, image, w, h in asks:
                    link = (await service.chain_for(session, tool))[0]
                    t0 = time.perf_counter()
                    reply = await provider.complete(
                        link.model,
                        provider.Request(tool=tool, prompt=prompt, image_png=image, width=w, height=h, max_tokens=meter.OUTPUT_CAP[tool], json_reply=True),
                    )
                    AI["seconds"] += time.perf_counter() - t0
                    AI["last"][tool] = time.perf_counter() - t0
                    AI["calls"] += 1
                    AI["tokens_in"] += reply.tokens_in
                    AI["tokens_out"] += reply.tokens_out
                    AI["usd"] += float(meter.cost_usd(reply.tokens_in, reply.tokens_out, service.as_price(link.price)))
                    AI["model"] = link.model.label
                    out[tool], _ = parse_region(tool)(reply.text)
        finally:
            await engine.dispose()
        return out

    AI["last"] = {}
    got = asyncio.run(ask())
    found = read_on_load.ai_found(page.rect.width, page.rect.height, got)
    named = found.ai_naming
    return (named.number or None) if named else None, (named.name or None) if named else None, found.scales


def _same_scale(a: float | None, b: float | None) -> bool:
    if a is None or b is None:
        return a is None and b is None
    return abs(a - b) <= 0.005 * b


def measure(folder: str, key_path: str) -> None:
    root = pathlib.Path(folder)
    manifest = {m["sheet"]: m for m in json.loads((root / "manifest.json").read_text())}
    key = json.loads(pathlib.Path(key_path).read_text())
    sheets = [k for k in key["sheets"] if k["sheet"] in manifest]
    by_set: dict[str, list[dict[str, Any]]] = {}
    for k in sheets:
        by_set.setdefault(manifest[k["sheet"]]["set"] + "|" + manifest[k["sheet"]]["project"], []).append(k)
    results: list[dict[str, Any]] = []
    set_times: dict[str, float] = {}
    for set_name, members in by_set.items():
        members.sort(key=lambda k: (manifest[k["sheet"]]["sort"] or 0, manifest[k["sheet"]]["page"]))
        template: dict[str, Any] = {"formed": False, "samples": [], "constants": []}
        read: dict[str, dict[str, Any]] = {}
        started = time.perf_counter()
        for k in members:
            m = manifest[k["sheet"]]
            t0 = time.perf_counter()
            doc, page, page_text, pieces = _page(root / m["file"])
            w, h = page.rect.width or 1, page.rect.height or 1
            stem = naming.file_number(m["file_name"])
            entry: dict[str, Any] = {"number": None, "title": None, "scale": None, "suggested": [], "scan": not pieces}
            # As read_page (D-847): text enough in the title block's corner, else the AI as for a scan; the
            # flag --before measures the readers as they were (every sheet with text read from its text).
            readable = "--before" in sys.argv or getattr(reading, "title_block_readable", lambda _p: True)(pieces)
            if pieces and not readable and "--ai" in sys.argv:
                entry["ai"] = True
                scales = reading.read_scale(pieces, lambda page=page: reading.page_strokes(page), w, h)
                number, title, asked = _ai_scan(page, scale=not scales)
                entry["number"], entry["title"] = number, title
                proved = reading.auto(scales)
                # What is applied: a half-size set's doubled scale (D-852).
                entry["scale"] = (proved.apply_feet_per_pt or proved.feet_per_pt) if proved else None
                entry["scale_label"] = (proved.apply_label or proved.label) if proved else None
                entry["scale_how"] = (proved.method or "") + (" half" if proved.half_size else "") if proved else None
                entry["suggested"] = [(x.label, x.feet_per_pt, x.status) for x in (scales or asked)]
            elif pieces:
                spans = naming.spans(page, page_text)
                entry["spans"] = spans
                # Read on its own (no template yet): read again through the template once one forms.
                entry["own"] = not template["formed"]
                tn = time.perf_counter()
                got = _name_one(spans, template, w, h, stem)
                entry["name_seconds"] = time.perf_counter() - tn
                entry["number"], entry["title"] = got
                tn = time.perf_counter()
                scales = reading.read_scale(pieces, lambda page=page: reading.page_strokes(page), w, h)
                entry["scale_seconds"] = time.perf_counter() - tn
                proved = reading.auto(scales)
                # What is applied: a half-size set's doubled scale (D-852).
                entry["scale"] = (proved.apply_feet_per_pt or proved.feet_per_pt) if proved else None
                entry["scale_label"] = (proved.apply_label or proved.label) if proved else None
                entry["scale_how"] = (proved.method or "") + (" half" if proved.half_size else "") if proved else None
                entry["suggested"] = [(s.label, s.feet_per_pt, s.status) for s in scales]
            elif "--ai" in sys.argv and "--scans-asked" in sys.argv:
                # As a person's drag box on a scan; on Load a scan is not read (D-883).
                number, title, scales = _ai_scan(page)
                entry["number"], entry["title"] = number, title
                entry["ai_seconds"] = dict(AI["last"])
                entry["suggested"] = [(x.label, x.feet_per_pt, x.status) for x in scales]
            # As the OCR task (D-852): a sheet whose text printed no scale, and none applied, read from its
            # image; its own time, as the worker spends it apart from the read.
            text_scales = scales if pieces else []
            rich = getattr(reading, "drawing_text_in_layer", lambda _p: False)(pieces)
            scan_read = bool(pieces) or "--scans-asked" in sys.argv
            if "--ocr" in sys.argv and scan_read and entry["scale"] is None and not text_scales and not rich:
                t1 = time.perf_counter()
                ocr_read = getattr(read_on_load, "ocr_page", None) if "--ocr-as-worker" in sys.argv else None
                if ocr_read is not None:
                    # The worker's own OCR read (D-870: the title block and view titles first).
                    ocr = []
                    read_ocr = ocr_read(page)
                else:
                    ocr = reading.ocr_pieces(page)
                    read_ocr = reading.read_scale(ocr, lambda page=page: reading.page_strokes(page), w, h) if ocr else []
                entry["ocr_seconds"] = time.perf_counter() - t1
                if "--dump-ocr" in sys.argv and ocr:
                    # Every piece the whole-page OCR read, to try region rules without Tesseract again.
                    (OUT / "ocr").mkdir(parents=True, exist_ok=True)
                    (OUT / "ocr" / f"{k['sheet']}.json").write_text(
                        json.dumps({"w": w, "h": h, "pieces": [[p.text, p.x, p.y, p.w, p.h] for p in ocr]})
                    )
                proved = reading.auto(read_ocr)
                if proved:
                    entry["scale"] = proved.apply_feet_per_pt or proved.feet_per_pt
                    entry["scale_label"] = proved.apply_label or proved.label
                    entry["scale_how"] = "ocr " + (proved.method or "") + (" half" if proved.half_size else "")
                entry["suggested"] = [(x.label, x.feet_per_pt, x.status) for x in read_ocr] + entry["suggested"]
            entry["seconds"] = time.perf_counter() - t0 - entry.get("ocr_seconds", 0)
            entry["w"], entry["h"], entry["stem"] = w, h, stem
            read[k["sheet"]] = entry
            doc.close()
        # The worker reads a set's earlier sheets again once its template forms.
        if template["formed"]:
            for k in members:
                e = read[k["sheet"]]
                if e.get("spans") is not None and e.get("own"):
                    got = naming.read_template(e["spans"], template, e["w"], e["h"], e["stem"])
                    if naming.valid(got, e["stem"], set(template["constants"])):
                        e["number"], e["title"] = got.number, got.title
        # As _write_name (D-847): a sheet its text, read through the set, cannot name is named from the AI's read.
        if "--ai" in sys.argv and "--before" not in sys.argv:
            for k in members:
                e = read[k["sheet"]]
                if e.get("spans") is not None and not e["title"]:
                    doc = pymupdf.open(root / manifest[k["sheet"]]["file"])
                    number, title, _ = _ai_scan(doc[0], scale=False)
                    doc.close()
                    if number and title:
                        e["number"], e["title"], e["ai"] = number, title, True
        set_times[set_name] = time.perf_counter() - started
        for k in members:
            e = read[k["sheet"]]
            want_scale = _key_scale(k.get("scale"))
            results.append(
                {
                    "sheet": k["sheet"],
                    "set": set_name,
                    "label": f'{k.get("number")} {k.get("title")}',
                    "scan": e["scan"],
                    "number_ok": _norm_number(e["number"]) == _norm_number(k.get("number")),
                    # A sheet that prints no title (a plat's) is not counted for the title.
                    "title_ok": None if k.get("title") is None else _norm_title(e["title"]) == _norm_title(k.get("title")),
                    "scale_ok": _same_scale(e["scale"], want_scale),
                    "scale_wrong": e["scale"] is not None and not _same_scale(e["scale"], want_scale),
                    "suggested_ok": e["scale"] is None
                    and want_scale is not None
                    and bool(e["suggested"])
                    and _same_scale(e["suggested"][0][1], want_scale),
                    "got": {"number": e["number"], "title": e["title"], "scale": e.get("scale_label"), "how": e.get("scale_how"), "suggested": [s[0] for s in e["suggested"]]},
                    "want": {"number": k.get("number"), "title": k.get("title"), "scale": k.get("scale")},
                    "seconds": e["seconds"],
                    "ocr_seconds": e.get("ocr_seconds"),
                    "name_seconds": e.get("name_seconds"),
                    "scale_seconds": e.get("scale_seconds"),
                    "ai_seconds": e.get("ai_seconds"),
                }
            )
    _report(results, set_times)


def _name_one(spans: Any, template: dict[str, Any], w: float, h: float, stem: str | None) -> tuple[str | None, str | None]:
    """read_on_load._write_name, in memory: the set's template once formed, else the sheet on its own."""
    constants = set(template["constants"])
    if template["formed"]:
        got = naming.read_template(spans, template, w, h, stem)
        if not naming.valid(got, stem, constants):
            got = naming.locate(spans, w, h, stem, constants)
    else:
        got = naming.locate(spans, w, h, stem)
        sample = naming.sample(got)
        if sample:
            template["samples"] = [*template["samples"], sample][-4:]
            formed = naming.form(template["samples"])
            if formed:
                template.update(
                    number_box=formed["number_box"],
                    name_box=formed["name_box"],
                    title_size=formed["title_size"] or 0,
                    constants=formed["constants"],
                    formed=True,
                )
    if naming.valid(got, stem, set(template["constants"])):
        return got.number, got.title
    number = got.number if got.number and naming.is_number(got.number) and (not stem or got.number == stem) else None
    return number, None


def _report(results: list[dict[str, Any]], set_times: dict[str, float]) -> None:
    n = len(results)
    text = [r for r in results if not r["scan"]]
    scans = [r for r in results if r["scan"]]
    def pct(xs: list[dict[str, Any]], f: str) -> str:
        counted = [r for r in xs if r[f] is not None]
        right = sum(1 for r in counted if r[f])
        return f"{right}/{len(counted)} ({100 * right / max(1, len(counted)):.0f} %)"

    secs = sorted(r["seconds"] for r in results)
    p95 = secs[min(len(secs) - 1, math.ceil(0.95 * len(secs)) - 1)] if secs else 0
    print(f"sheets {n} ({len(text)} with text, {len(scans)} scans)")
    print(f"number right   {pct(results, 'number_ok')}   text {pct(text, 'number_ok')}   scans {pct(scans, 'number_ok')}")
    print(f"title right    {pct(results, 'title_ok')}   text {pct(text, 'title_ok')}   scans {pct(scans, 'title_ok')}")
    print(f"scale applied right {pct(results, 'scale_ok')}; applied WRONG {pct(results, 'scale_wrong')}; not applied but first suggestion right {pct(results, 'suggested_ok')}")
    print(f"time per sheet: median {statistics.median(secs):.3f} s, 95th {p95:.3f} s, longest {secs[-1]:.3f} s")
    ocr = sorted(r["ocr_seconds"] for r in results if r.get("ocr_seconds") is not None)
    if ocr:
        o95 = ocr[min(len(ocr) - 1, math.ceil(0.95 * len(ocr)) - 1)]
        print(f"OCR on {len(ocr)} sheets (their text printed no scale): median {statistics.median(ocr):.1f} s, 95th {o95:.1f} s, all {sum(ocr):.0f} s")
    for s, t in sorted(set_times.items(), key=lambda x: -x[1]):
        print(f"  set {s}: {t:.2f} s")
    if AI["calls"]:
        print(f"AI on the scans: {AI['calls']} calls ({AI.get('model')}), {AI['tokens_in']} in / {AI['tokens_out']} out tokens, ${AI['usd']:.4f} at list price, {AI['seconds']:.1f} s; per scan ${AI['usd'] / max(1, len(scans)):.4f}")
    print("wrong:")
    for r in results:
        bad = [f for f in ("number_ok", "title_ok") if r[f] is False] + (["scale"] if not r["scale_ok"] else [])
        if bad:
            print(f"  {r['sheet'][:8]} {r['label']!r}: {','.join(bad)} got {json.dumps(r['got'])} want {json.dumps(r['want'])}")
    print("json:" + json.dumps(results))


def time_set(folder: str, workers: str = "4") -> None:
    """A whole set read as on load, with no key: each page's text, name and scale (the AI's pages counted, not
    asked), the time per sheet, and the set's time on `workers` page workers reading at once (the bench runs 4)."""
    import multiprocessing
    from concurrent.futures import ProcessPoolExecutor

    root = pathlib.Path(folder)
    manifest = json.loads((root / "manifest.json").read_text())
    started = time.perf_counter()
    # fork: a script read from stdin cannot be started again by forkserver, 3.14's default.
    with ProcessPoolExecutor(int(workers), mp_context=multiprocessing.get_context("fork")) as pool:
        times = list(pool.map(_time_one, [str(root / m["file"]) for m in manifest]))
    wall = time.perf_counter() - started
    secs = sorted(t for t, _ in times)
    p95 = secs[min(len(secs) - 1, math.ceil(0.95 * len(secs)) - 1)]
    ai = sum(1 for _, a in times if a)
    print(
        f"{len(secs)} sheets on {workers} workers: {wall:.1f} s for the set; per sheet median "
        f"{statistics.median(secs):.3f} s, 95th {p95:.3f} s, longest {secs[-1]:.3f} s; {ai} would ask the AI"
    )


def _time_one(path: str) -> tuple[float, bool]:
    t0 = time.perf_counter()
    doc, page, page_text, pieces = _page(pathlib.Path(path))
    w, h = page.rect.width or 1, page.rect.height or 1
    ai = not pieces or not getattr(reading, "title_block_readable", lambda _p: True)(pieces)
    if pieces:
        spans = naming.spans(page, page_text)
        naming.locate(spans, w, h)
        reading.read_scale(pieces, lambda: reading.page_strokes(page), w, h)
    doc.close()
    return time.perf_counter() - t0, ai


if __name__ == "__main__":
    mode, *rest = [a for a in sys.argv[1:] if not a.startswith("--")]
    {"fetch": fetch, "dump": dump, "measure": measure, "time": time_set}[mode](*rest)
