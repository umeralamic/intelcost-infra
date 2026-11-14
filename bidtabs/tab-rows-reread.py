"""Re-read named tab rows word by word (D-1273 re-read, night run 2026-11-15 -> 16).

`tab-prices.mjs` reads the PDFs' text layer through xpdf's table mode, which on pages drawn rotated (the rows run up
the page) breaks a row across lines and drops bidders. This reads the same text layer with PyMuPDF's word boxes: the
row is every word whose box crosses the quantity word's centre line (along y on a rotated page, along x on an upright
one), in reading order. A unit price counts only when the next figure is its total (unit x quantity, to the cent), as
in tab-prices.mjs. Each page of the tab gives its block of bidders, in page order. No bid figure lives here: the PDFs
are read from docs/reference and the result written there (outside git).

Run with PyMuPDF (the worker image has it), the tab folder mounted read-only, no network:
    docker run --rm --network none -v "<Bid tabs dir>:/tabs:ro" -v "<infra>/bidtabs:/b:ro" -v "<out dir>:/out" \
        intelcost-bench-worker-pages python /b/tab-rows-reread.py /tabs /out/<out.json> <key>:<qty>:<nominal> ...
"""

import json
import re
import sys
from pathlib import Path

import pymupdf

MONEY = re.compile(r"^\$([\d,]+\.\d{2})$")


def pdf_of(tabs: Path, key: str) -> Path:
    for p in (tabs / "tabs-pdf" / f"{key}.pdf", tabs / f"{key}.pdf"):
        if p.exists():
            return p
    raise FileNotFoundError(key)


def pairs(figures: list[float], qty: float) -> list[float]:
    """Each unit price whose total follows it (unit x qty to the cent or 0.05 %), each figure once."""
    out: list[float] = []
    i = 0
    while i < len(figures) - 1:
        u, t = figures[i], figures[i + 1]
        if abs(u * qty - t) <= max(0.011, 0.0005 * abs(t)):
            out.append(u)
            i += 2
        else:
            i += 1
    return out


def rows(doc: pymupdf.Document, qty: int, nominal: str) -> list[dict]:
    forms = {str(qty), f"{qty:,}"}
    size = re.compile(rf"(^|[^\d]){re.escape(nominal)}\s*([\"”″]|IN|-INCH)", re.I)
    found = []
    for pno, page in enumerate(doc):
        words = page.get_text("words")
        for w in words:
            if w[4] not in forms:
                continue
            if (w[2] - w[0]) < (w[3] - w[1]):
                c = (w[0] + w[2]) / 2
                band = sorted((x for x in words if x[0] - 2 <= c <= x[2] + 2), key=lambda x: -x[1])
            else:
                c = (w[1] + w[3]) / 2
                band = sorted((x for x in words if x[1] - 2 <= c <= x[3] + 2), key=lambda x: x[0])
            text = " ".join(x[4] for x in band)
            unit_at = re.search(rf"\bLF {re.escape(w[4])}\b", text)
            if not unit_at or not size.search(text[: unit_at.start()]):
                continue
            figures = [float(m.group(1).replace(",", "")) for x in band if (m := MONEY.match(x[4]))]
            no = re.match(r"^\W*(\d+)\.", text)
            found.append({"page": pno + 1, "no": no.group(1) if no else None, "text": text[: unit_at.start()].strip()[:120], "prices": pairs(figures, qty), "figures": len(figures)})
    return found


def main() -> None:
    tabs, out, *targets = sys.argv[1:]
    result = []
    for t in targets:
        key, qty, nominal = t.split(":")
        doc = pymupdf.open(pdf_of(Path(tabs), key))
        found = rows(doc, int(qty), nominal)
        nos = sorted({f["no"] for f in found})
        result.append({"key": key, "qty": int(qty), "nominal": nominal, "itemNo": nos[0] if len(nos) == 1 else None, "pages": [f["page"] for f in found], "prices": [p for f in found for p in f["prices"]], "unpaired": sum(f["figures"] - 2 * len(f["prices"]) for f in found), "rows": found})
    Path(out).write_text(json.dumps(result, indent=1))
    for r in result:
        print(r["key"], r["qty"], r["nominal"], "#" + str(r["itemNo"]), "pages", r["pages"], "prices", r["prices"], "unpaired", r["unpaired"])


if __name__ == "__main__":
    main()
