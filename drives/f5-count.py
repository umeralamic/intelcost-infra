"""F5 Block B, first subtask: a Load counts pages without downloading the file.

    docker compose exec -T api sh -lc "cd /srv && python drives/f5-count.py"

Makes a PDF of about 450 MB (150 pages, each a full-page image of noise, which does not
compress), stores it as a project file in a workspace of a throwaway account, then loads
page 1 through the real api and reports:

    made     the file's size and page count
    loaded   the api's answer (page_count 150) and how long it took
    counted  what counting cost: bytes read and requests, from the api's own log line,
             and the same function called here, which must read under 5 MB of it

The workspace is the throwaway account's, so regress.sh's fx clean-up removes it, file
and all. Prints one line per check and exits 1 on the first failure.
"""

import asyncio
import os
import sys
import time
import uuid as uuid_module
from datetime import UTC, datetime

import httpx
import pymupdf
from PIL import Image

import app.models_registry  # noqa: F401  (relationships resolve by name)
from app.core import storage
from app.database import SessionFactory
from app.features.drawing.load import count_stored_pages
from app.features.project.models import ProjectFile

API = "http://localhost:8000"
PAGES = 150
SIDE = 1100  # px: 1100 x 1100 x 3 bytes of noise per page, about 3.6 MB as PNG
PATH = "/tmp/f5-count-big.pdf"


def fail(message: str) -> None:
    print(f"FAIL  {message}")
    raise SystemExit(1)


def make_pdf() -> int:
    document = pymupdf.open()
    for _ in range(PAGES):
        noise = Image.frombytes("RGB", (SIDE, SIDE), os.urandom(SIDE * SIDE * 3))
        png = _png(noise)
        page = document.new_page(width=612, height=792)
        page.insert_image(page.rect, stream=png)
    document.save(PATH, deflate=False)
    document.close()
    return os.path.getsize(PATH)


def _png(image: Image.Image) -> bytes:
    import io

    out = io.BytesIO()
    image.save(out, format="PNG", compress_level=0)
    return out.getvalue()


async def main() -> None:
    stamp = int(time.time() * 1000)
    email = f"fx.f5-count.{stamp}@bench.intelcost.io"
    password = "bench-password-1"
    with httpx.Client(base_url=API, timeout=120) as http:
        http.post("/api/auth/register", json={"email": email, "password": password, "full_name": "Fixture Owner"})
        token = http.post("/api/auth/login", json={"email": email, "password": password}).json()["access_token"]
        headers = {"authorization": f"Bearer {token}"}
        workspace = http.post("/api/workspace", json={"name": f"F5 count {stamp}"}, headers=headers).json()
        base = f"/api/workspace/{workspace['uuid']}/project"
        project = http.post(base, json={"name": "Big set"}, headers=headers).json()

        size = make_pdf()
        if size < 400 * 1024 * 1024:
            fail(f"the file is only {size / 1024 / 1024:.0f} MB")
        print(f"made  a {PAGES}-page PDF of {size / 1024 / 1024:.0f} MB")

        file_uuid = uuid_module.uuid4()
        key = storage.build_key(
            "project-file", workspace["uuid"], project["uuid"], str(file_uuid), "Big set.pdf"
        )
        storage._client().upload_file(PATH, storage.settings.s3_bucket, key)
        os.remove(PATH)
        async with SessionFactory() as session:
            from sqlalchemy import select

            from app.features.project.models import Project
            from app.features.workspace.models import Workspace

            ws = await session.scalar(select(Workspace).where(Workspace.uuid == workspace["uuid"]))
            pr = await session.scalar(select(Project).where(Project.uuid == project["uuid"]))
            session.add(
                ProjectFile(
                    uuid=file_uuid,
                    workspace_id=ws.id,
                    project_id=pr.id,
                    file_name="Big set.pdf",
                    storage_key=key,
                    content_type="application/pdf",
                    byte_size=size,
                    part_size=storage.part_size_for(size),
                    uploaded_at=datetime.now(UTC),
                )
            )
            await session.commit()

        started = time.monotonic()
        loaded = http.post(
            f"{base}/{project['uuid']}/drawing/load",
            json={"files": [{"project_file_uuid": str(file_uuid), "pages": [1]}]},
            headers=headers,
        )
        took = time.monotonic() - started
        if loaded.status_code != 200:
            fail(f"load: {loaded.status_code} {loaded.text}")
        page_count = loaded.json()["files"][0]["page_count"]
        if page_count != PAGES:
            fail(f"the api counted {page_count} pages, not {PAGES}")
        print(f"loaded the api answered in {took:.2f} s with page_count {page_count}")

    counted = count_stored_pages(key, "pdf")
    if counted.pages != PAGES:
        fail(f"counting here found {counted.pages} pages")
    if counted.fetched > 5 * 1024 * 1024:
        fail(f"counting read {counted.fetched} bytes, more than 5 MB")
    print(
        f"counted {counted.pages} pages reading {counted.fetched / 1024:.0f} KB of "
        f"{counted.size / 1024 / 1024:.0f} MB in {counted.requests} ranged requests "
        f"({100 * counted.fetched / counted.size:.3f}% of the file)"
    )
    print(f"file  {file_uuid}")

    # A file whose cross-reference points at the wrong bytes (a stray byte after the
    # header shifts every object): strict parsing refuses it, and counting must still
    # answer, by the lenient read or by PyMuPDF's repair.
    small = pymupdf.open()
    for _ in range(3):
        small.new_page()
    raw = small.tobytes()
    broken = raw.replace(b"%PDF-1.7\n", b"%PDF-1.7\n%\n", 1) if raw.startswith(b"%PDF-1.7") else raw[:9] + b"%\n" + raw[9:]
    broken_key = storage.build_key(
        "project-file", workspace["uuid"], project["uuid"], str(uuid_module.uuid4()), "broken.pdf"
    )
    storage.put_bytes(broken_key, broken, "application/pdf")
    repaired = count_stored_pages(broken_key, "pdf")
    if repaired.pages != 3:
        fail(f"a broken cross-reference counted {repaired.pages} pages, not 3")
    print(f"broken a PDF with a shifted cross-reference still counts 3 pages ({repaired.requests} requests)")


if __name__ == "__main__":
    asyncio.run(main())
    sys.exit(0)
