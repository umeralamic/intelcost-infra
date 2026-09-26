"""F5's drives: what only the database and storage can see.

    docker compose exec -T api sh -lc "cd /srv && python drives/f5-bench.py <step> [arg]"

    objects <project>  every prepared sheet of the project has its split source (a
                       one-page PDF), a thumbnail 512 px wide and a fit image (WebP, at
                       most 2048 px wide and 144 DPI) in MinIO; an image's drawing reads
                       from a wrapper PDF, and the person's own file is untouched
    age <file>         the drawing file was last touched eleven minutes ago
    sweep              run the sweep through Redis to the worker, as beat does

Prints one line per step and exits 1 with the reason when that is not what F5 says.
"""

import asyncio
import io
import sys
from datetime import UTC, datetime, timedelta

import pymupdf
from PIL import Image
from sqlalchemy import select, update

import app.models_registry  # noqa: F401  (relationships resolve by name)
from app.core import storage
from app.database import SessionFactory
from app.features.drawing.models import DrawingFile, DrawingSheet
from app.features.project.models import Project, ProjectFile
from app.worker.celery_app import celery_app

SWEEP = "app.worker.tasks.prepare.sweep_unprepared_drawings"


def fail(message: str) -> None:
    print(f"FAIL  {message}")
    raise SystemExit(1)


async def objects(project_uuid: str) -> None:
    async with SessionFactory() as session:
        rows = (
            await session.execute(
                select(DrawingSheet, DrawingFile, ProjectFile)
                .join(DrawingFile, DrawingFile.id == DrawingSheet.file_id)
                .join(ProjectFile, ProjectFile.id == DrawingFile.project_file_id)
                .join(Project, Project.id == DrawingSheet.project_id)
                .where(Project.uuid == project_uuid, DrawingSheet.render_status == "ready")
                .order_by(DrawingFile.id, DrawingSheet.page_number)
            )
        ).all()
    if not rows:
        fail("no prepared sheets")
    seen = []
    for sheet, drawing, original in rows:
        label = f"{original.file_name} p{sheet.page_number}"
        if not sheet.source_key or not sheet.image_storage_key or not sheet.thumbnail_storage_key:
            fail(f"{label}: source {sheet.source_key}, fit {sheet.image_storage_key}, thumb {sheet.thumbnail_storage_key}")
        with pymupdf.open(stream=storage.get_bytes(sheet.source_key), filetype="pdf") as split:
            if split.page_count != 1:
                fail(f"{label}: the split source has {split.page_count} pages")
        fit = Image.open(io.BytesIO(storage.get_bytes(sheet.image_storage_key)))
        want = min(2048, round(float(sheet.width_pt) * 144 / 72))
        if fit.format != "WEBP" or abs(fit.width - want) > 1:
            fail(f"{label}: fit is {fit.format} {fit.width} px, wanted WEBP {want} px")
        thumb = Image.open(io.BytesIO(storage.get_bytes(sheet.thumbnail_storage_key)))
        if thumb.width != 512:
            fail(f"{label}: thumbnail {thumb.width} px wide")
        if drawing.storage_key == original.storage_key:
            kind = "own PDF"
        else:
            if not drawing.storage_key or not drawing.storage_key.endswith(".pdf"):
                fail(f"{label}: an image with no wrapper ({drawing.storage_key})")
            storage.get_bytes(original.storage_key)  # the person's file is still there
            kind = "wrapped PDF, original kept"
        seen.append(f"{label} ({kind}, fit {fit.width} px)")
    print(f"objects {len(rows)} prepared: " + "; ".join(seen))


async def age(file_uuid: str) -> None:
    async with SessionFactory() as session:
        result = await session.execute(
            update(DrawingFile)
            .where(DrawingFile.uuid == file_uuid)
            .values(updated_at=datetime.now(UTC) - timedelta(minutes=11))
        )
        await session.commit()
    if result.rowcount != 1:  # type: ignore[attr-defined]
        fail(f"no drawing file {file_uuid}")
    print(f"aged  drawing {file_uuid} last touched 11 minutes ago")


def sweep() -> None:
    result = celery_app.send_task(SWEEP).get(timeout=60)
    if not result.get("dispatched"):
        fail(f"the sweep dispatched nothing: {result}")
    print(f"swept {result}")


if __name__ == "__main__":
    step, *args = sys.argv[1:]
    if step == "objects":
        asyncio.run(objects(args[0]))
    elif step == "age":
        asyncio.run(age(args[0]))
    elif step == "sweep":
        sweep()
    else:
        fail(f"no step {step}")
