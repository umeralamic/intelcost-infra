"""F5, the Block B check: a throwaway account's project holding a 400 MB+ PDF and a
small one, for `browser/f5-big.mjs` to open through Choose pages.

    docker compose exec -T api sh -lc "cd /srv && python drives/f5-big.py"

Makes "Big set.pdf" (150 pages of image noise, which does not compress, about 520 MB) and
"Small set.pdf" (2 such pages, a few MB), stores both as project files in a workspace of
a fresh `fx.f5-big.<stamp>@` account, and prints

    made   each file's size
    world  <email> <workspace uuid> <project uuid>

The workspace is the throwaway account's, so regress.sh's fx clean-up removes it, files
and all. Exits 1 on the first failure.
"""

import asyncio
import io
import os
import sys
import time
import uuid as uuid_module
from datetime import UTC, datetime

import httpx
import pymupdf
from PIL import Image
from sqlalchemy import select

import app.models_registry  # noqa: F401  (relationships resolve by name)
from app.core import storage
from app.database import SessionFactory
from app.features.project.models import Project, ProjectFile
from app.features.workspace.models import Workspace

API = "http://localhost:8000"
SIDE = 1100  # px: 1100 x 1100 x 3 bytes of noise per page, about 3.6 MB as PNG


def fail(message: str) -> None:
    print(f"FAIL  {message}")
    raise SystemExit(1)


def make_pdf(path: str, pages: int) -> int:
    document = pymupdf.open()
    for _ in range(pages):
        noise = Image.frombytes("RGB", (SIDE, SIDE), os.urandom(SIDE * SIDE * 3))
        out = io.BytesIO()
        noise.save(out, format="PNG", compress_level=0)
        page = document.new_page(width=1224, height=792)
        page.insert_image(page.rect, stream=out.getvalue())
    document.save(path, deflate=False)
    document.close()
    return os.path.getsize(path)


async def store(workspace_uuid: str, project_uuid: str, name: str, path: str, size: int) -> None:
    file_uuid = uuid_module.uuid4()
    key = storage.build_key("project-file", workspace_uuid, project_uuid, str(file_uuid), name.replace(" ", "_"))
    storage._client().upload_file(path, storage.settings.s3_bucket, key)
    os.remove(path)
    async with SessionFactory() as session:
        ws = await session.scalar(select(Workspace).where(Workspace.uuid == workspace_uuid))
        pr = await session.scalar(select(Project).where(Project.uuid == project_uuid))
        session.add(
            ProjectFile(
                uuid=file_uuid,
                workspace_id=ws.id,
                project_id=pr.id,
                file_name=name,
                storage_key=key,
                content_type="application/pdf",
                byte_size=size,
                part_size=storage.part_size_for(size),
                uploaded_at=datetime.now(UTC),
            )
        )
        await session.commit()


async def main() -> None:
    stamp = int(time.time() * 1000)
    email = f"fx.f5-big.{stamp}@bench.intelcost.io"
    password = "bench-password-1"
    with httpx.Client(base_url=API, timeout=120) as http:
        http.post("/api/auth/register", json={"email": email, "password": password, "full_name": "Fixture Owner"})
        token = http.post("/api/auth/login", json={"email": email, "password": password}).json()["access_token"]
        headers = {"authorization": f"Bearer {token}"}
        workspace = http.post("/api/workspace", json={"name": f"F5 big {stamp}"}, headers=headers).json()
        project = http.post(f"/api/workspace/{workspace['uuid']}/project", json={"name": "Big set"}, headers=headers).json()

    big = make_pdf("/tmp/f5-big.pdf", 150)
    if big < 400 * 1024 * 1024:
        fail(f"the big file is only {big / 1024 / 1024:.0f} MB")
    await store(workspace["uuid"], project["uuid"], "Big set.pdf", "/tmp/f5-big.pdf", big)
    small = make_pdf("/tmp/f5-small.pdf", 2)
    await store(workspace["uuid"], project["uuid"], "Small set.pdf", "/tmp/f5-small.pdf", small)
    # A letter-portrait page stored with /Rotate 90: it shows landscape, as a scanner's
    # sideways plan sheet does.
    rotated = pymupdf.open()
    for n in (1, 2):
        page = rotated.new_page(width=612, height=792)
        page.insert_text((72, 144), f"Rotated {n}", fontsize=48)
        page.set_rotation(90)
    rotated.save("/tmp/f5-rotated.pdf")
    rotated.close()
    turned = os.path.getsize("/tmp/f5-rotated.pdf")
    await store(workspace["uuid"], project["uuid"], "Rotated set.pdf", "/tmp/f5-rotated.pdf", turned)
    print(f"made  Big set.pdf {big} bytes ({big / 1024 / 1024:.0f} MB), Small set.pdf {small} bytes ({small / 1024 / 1024:.1f} MB)")
    print(f"world {email} {workspace['uuid']} {project['uuid']}")


if __name__ == "__main__":
    asyncio.run(main())
    sys.exit(0)
