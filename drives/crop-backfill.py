"""D-351 backfill: stored page crop boxes the old ranged measure got wrong (D-355). Lists by
default; writes only with `--apply`.

Before D-351 (2026-10-08 to 2026-10-11) Choose pages' ranged measure subtracted the media box's
origin from the crop box, so a page whose media box does not start at 0 stored a box MuPDF does
not report. This re-reads every stored page with the current code (`prepare._ranged_sizes`, the
whole file when that cannot) and lists each page whose stored crop box differs, as CSV:

    page_id,project_file_uuid,file,page,sheet,stored_box,correct_box,measurements,set_scales

`measurements` counts the shapes and `set_scales` the calibrations on the takeoff sheets loaded
from that page. Nothing computes a position, quantity or scale from the stored crop box (it is
returned to Choose pages and nothing reads it there), so neither is touched; they are listed
for the person deciding. A page whose stored size or rotation also differs is listed on stderr
and never written: that is not this bug.

    docker compose exec -T api sh -lc \\
        "cd /srv && python drives/crop-backfill.py [scope] > before.csv"
    docker compose exec -T api sh -lc \\
        "cd /srv && python drives/crop-backfill.py [scope] --apply"

Scope (any of): `--workspace <uuid>`, `--project <uuid>`, `--pages <id,id,...>` (project_file_page
ids), `--skip-workspace <uuid>` and `--skip-project <uuid>` (repeatable). `--apply` writes the
crop box only, of the pages listed, in one transaction, and prints each page it changed. No file
is re-prepared, no image made, nothing written to the bucket.
"""

import argparse
import sys
from typing import Any

from sqlalchemy import text

import app.models_registry  # noqa: F401
from app.database import SyncSessionFactory
from app.worker.tasks import prepare

TOLERANCE = 1e-3

HEADER = "page_id,project_file_uuid,file,page,sheet,stored_box,correct_box,measurements,set_scales"

PAGES = """
select pp.id, pp.page_number, pp.width_pt, pp.height_pt, pp.rotation, pp.crop_box,
       pf.uuid as file_uuid, pf.file_name, pf.storage_key,
       p.uuid as project_uuid, p.name as project,
       w.uuid as workspace_uuid, w.name as workspace,
       (select string_agg(
                 trim(coalesce(s.sheet_number, '') || ' ' || coalesce(s.sheet_name, '')), '; ')
          from drawing_file df join drawing_sheet s on s.file_id = df.id
         where df.project_file_id = pf.id and s.page_number = pp.page_number) as sheet,
       (select count(*) from drawing_file df join drawing_sheet s on s.file_id = df.id
          join takeoff_geometry g on g.sheet_id = s.id
         where df.project_file_id = pf.id and s.page_number = pp.page_number) as measurements,
       (select count(*) from drawing_file df join drawing_sheet s on s.file_id = df.id
          join sheet_calibration c on c.sheet_id = s.id
         where df.project_file_id = pf.id and s.page_number = pp.page_number) as set_scales
  from project_file_page pp
  join project_file pf on pf.id = pp.project_file_id
  join project p on p.id = pf.project_id
  join workspace w on w.id = pf.workspace_id
 order by pf.file_name, pf.id, pp.page_number
"""


def _sizes(key: str) -> list[tuple[float, float, int, list[float]]]:
    try:
        return prepare._ranged_sizes(key)
    except Exception:
        return prepare._whole_sizes(key)


def _close(a: Any, b: Any) -> bool:
    return abs(float(a) - float(b)) < TOLERANCE


def _number(value: Any) -> str:
    """Four decimals at most, no trailing zeros: 3024.24, -1512.12, 0, 2160."""
    text_ = f"{round(float(value), 4):.4f}".rstrip("0").rstrip(".")
    return "0" if text_ in ("", "-0") else text_


def _box(values: list[Any]) -> str:
    return "[" + " ".join(_number(v) for v in values) + "]"


def _quoted(value: Any) -> str:
    return '"' + str(value).replace('"', '""') + '"'


def _in_scope(row: Any, args: argparse.Namespace, pages: set[int] | None) -> bool:
    if pages is not None and row.id not in pages:
        return False
    if args.workspace and str(row.workspace_uuid) != args.workspace:
        return False
    if args.project and str(row.project_uuid) != args.project:
        return False
    skipped = str(row.workspace_uuid) in args.skip_workspace
    return not (skipped or str(row.project_uuid) in args.skip_project)


def main(args: argparse.Namespace) -> None:
    pages = {int(p) for p in args.pages.split(",")} if args.pages else None
    print(HEADER)
    fixes: list[tuple[int, list[float]]] = []
    read: dict[str, list[tuple[float, float, int, list[float]]] | None] = {}
    with SyncSessionFactory() as session:
        rows = [r for r in session.execute(text(PAGES)) if _in_scope(r, args, pages)]
        for row in rows:
            if row.storage_key not in read:
                try:
                    read[row.storage_key] = _sizes(row.storage_key)
                except Exception as exc:
                    read[row.storage_key] = None
                    print(f"cannot read {row.file_uuid} ({row.file_name}): {exc}", file=sys.stderr)
            sizes = read[row.storage_key]
            if not sizes or row.page_number > len(sizes):
                continue
            width, height, rotation, box = sizes[row.page_number - 1]
            stored = list(row.crop_box or [])
            if len(stored) == 4 and all(_close(a, b) for a, b in zip(stored, box, strict=True)):
                continue
            same_size = _close(row.width_pt, width) and _close(row.height_pt, height)
            if not (same_size and row.rotation == rotation):
                print(
                    f"not this bug, left: page {row.id} ({row.file_name} p{row.page_number}):"
                    " its size or rotation differs too",
                    file=sys.stderr,
                )
                continue
            # The text columns quoted, the numbers and ids not (the before-list's form).
            fields = [
                row.id,
                row.file_uuid,
                _quoted(row.file_name),
                row.page_number,
                _quoted(row.sheet or ""),
                _quoted(_box(stored)),
                _quoted(_box(box)),
                row.measurements,
                row.set_scales,
            ]
            print(",".join(str(f) for f in fields))
            fixes.append((row.id, box))
            print(f"{row.workspace} / {row.project}: page {row.id}", file=sys.stderr)
        print(f"{len(fixes)} pages differ of {len(rows)} in scope", file=sys.stderr)
        if not args.apply:
            print(
                "dry run: nothing written (run with --apply to write the crop boxes listed)",
                file=sys.stderr,
            )
            return
        for page_id, box in fixes:
            session.execute(
                text("update project_file_page set crop_box = cast(:box as jsonb) where id = :id"),
                {"box": f"[{', '.join(repr(float(v)) for v in box)}]", "id": page_id},
            )
            print(f"written: page {page_id} crop box {_box(box)}", file=sys.stderr)
        session.commit()
        print(f"applied: {len(fixes)} crop boxes", file=sys.stderr)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "--apply", action="store_true", help="write the crop boxes listed (default: list only)"
    )
    parser.add_argument("--workspace")
    parser.add_argument("--project")
    parser.add_argument("--pages", help="project_file_page ids, comma separated")
    parser.add_argument("--skip-workspace", action="append", default=[])
    parser.add_argument("--skip-project", action="append", default=[])
    main(parser.parse_args())
