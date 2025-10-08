"""Lightweight admin API for managing Love & Sharing storybooks.

Run locally with:
    python admin_server.py

Endpoints
---------
GET  /api/storybooks
    Returns a JSON list of existing storybook slugs found in the wordless
    storybooks directory.

POST /api/upload
    Accepts multipart form submissions with one or more images under the
    ``files`` field. Supported form fields:
      - storybook: Target storybook slug (required)
      - action:    One of ``new-storybook``, ``add-pages`` (default) or
                   ``replace-pages``
      - start_page: Optional 1-based page index to start writing files
      - normalize_height: ``true`` to resize pages to 1024px tall

File uploads are stored under ``stories/wordless/<slug>/pages``. When a
``new-storybook`` upload is received, the ``template_storybook`` directory
is copied into the destination to provide a ready-to-edit scaffold.

Authentication is controlled with the ``LS_ADMIN_TOKEN`` environment
variable. When set, requests must include an ``X-Admin-Token`` header
matching that value. During local development it may be left unset for
convenience.
"""

from __future__ import annotations

import logging
import os
import re
import shutil
from datetime import datetime
from pathlib import Path
from typing import List

from flask import Flask, abort, jsonify, request
from PIL import Image, ImageOps
from werkzeug.datastructures import FileStorage

BASE_DIR = Path(__file__).resolve().parent
STORYBOOK_ROOT = BASE_DIR / "stories" / "wordless"
TEMPLATE_STORYBOOK = STORYBOOK_ROOT / "template_storybook"
PAGE_DIR_NAME = "pages"
DEFAULT_HEIGHT = 1024
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg"}

app = Flask(__name__)
logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9\-_.]+", "-", name.strip().lower())
    slug = re.sub(r"-+", "-", slug).strip("-._")
    return slug


def _validate_storybook(name: str) -> str:
    slug = _slugify(name)
    if not slug:
        abort(400, description="Invalid storybook name.")
    if slug == TEMPLATE_STORYBOOK.name:
        abort(400, description="template_storybook is reserved.")
    return slug


def _allowed_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


def _require_token() -> None:
    expected = os.environ.get("LS_ADMIN_TOKEN")
    if not expected:
        return
    provided = request.headers.get("X-Admin-Token")
    if provided != expected:
        abort(401, description="Invalid admin token.")


def _ensure_storybook_dirs(slug: str, action: str) -> Path:
    storybook_dir = (STORYBOOK_ROOT / slug).resolve()

    if STORYBOOK_ROOT not in storybook_dir.parents and storybook_dir != STORYBOOK_ROOT:
        abort(400, description="Suspicious storybook path.")

    if action == "new-storybook":
        if storybook_dir.exists():
            abort(400, description="Storybook already exists.")
        if TEMPLATE_STORYBOOK.exists():
            shutil.copytree(TEMPLATE_STORYBOOK, storybook_dir)
        else:
            storybook_dir.mkdir(parents=True, exist_ok=True)
    else:
        if not storybook_dir.exists():
            if TEMPLATE_STORYBOOK.exists():
                shutil.copytree(TEMPLATE_STORYBOOK, storybook_dir)
            else:
                storybook_dir.mkdir(parents=True, exist_ok=True)

    pages_dir = storybook_dir / PAGE_DIR_NAME
    pages_dir.mkdir(parents=True, exist_ok=True)

    if action == "replace-pages":
        for path in pages_dir.glob("*"):
            if path.is_file():
                path.unlink()

    return pages_dir


def _current_page_count(pages_dir: Path) -> int:
    numbers: List[int] = []
    for candidate in pages_dir.glob("page*.png"):
        match = re.search(r"page(\d+)\.png$", candidate.name)
        if match:
            numbers.append(int(match.group(1)))
    return max(numbers, default=0)


def _save_image(file: FileStorage, dest: Path, normalize_height: bool) -> None:
    file.stream.seek(0)
    with Image.open(file.stream) as img:
        img = ImageOps.exif_transpose(img)
        if normalize_height and img.height and img.height != DEFAULT_HEIGHT:
            ratio = DEFAULT_HEIGHT / float(img.height)
            new_width = max(1, int(round(img.width * ratio)))
            img = img.resize((new_width, DEFAULT_HEIGHT), Image.LANCZOS)
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA")
        dest.parent.mkdir(parents=True, exist_ok=True)
        img.save(dest, format="PNG")


@app.after_request
def _add_cors_headers(resp):
    resp.headers.setdefault("Access-Control-Allow-Origin", "*")
    resp.headers.setdefault("Access-Control-Allow-Headers", "Content-Type, X-Admin-Token")
    resp.headers.setdefault("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    resp.headers.setdefault("Access-Control-Max-Age", "600")
    return resp


@app.route("/api/storybooks", methods=["GET", "OPTIONS"])
def list_storybooks():
    if request.method == "OPTIONS":
        return ("", 204)
    STORYBOOK_ROOT.mkdir(parents=True, exist_ok=True)
    storybooks = sorted(p.name for p in STORYBOOK_ROOT.iterdir() if p.is_dir() and not p.name.startswith("."))
    return jsonify(storybooks)


@app.route("/api/upload", methods=["POST", "OPTIONS"])
def upload_storybook():
    if request.method == "OPTIONS":
        return ("", 204)

    _require_token()

    files: List[FileStorage] = request.files.getlist("files")
    if not files:
        abort(400, description="No files were uploaded.")
    for f in files:
        if not f.filename:
            abort(400, description="Each file must have a filename.")
        if not _allowed_file(f.filename):
            abort(400, description="Only PNG and JPG uploads are supported.")

    raw_storybook = request.form.get("storybook", "").strip()
    if not raw_storybook:
        abort(400, description="Missing storybook name.")
    slug = _validate_storybook(raw_storybook)

    action = (request.form.get("action") or "add-pages").strip().lower()
    if action not in {"new-storybook", "add-pages", "replace-pages"}:
        abort(400, description="Unsupported action.")

    normalize_height = (request.form.get("normalize_height") or "false").lower() == "true"

    start_page_raw = (request.form.get("start_page") or "").strip()
    start_page = None
    if start_page_raw:
        if not start_page_raw.isdigit() or int(start_page_raw) < 1:
            abort(400, description="start_page must be a positive integer.")
        start_page = int(start_page_raw)

    pages_dir = _ensure_storybook_dirs(slug, action)

    if start_page is None and action != "replace-pages":
        start_page = _current_page_count(pages_dir) + 1
    elif start_page is None:
        start_page = 1

    saved_files: List[str] = []
    index = start_page
    for uploaded in files:
        filename = f"page{index:03d}.png"
        destination = pages_dir / filename
        if destination.exists():
            logging.info("Overwriting %s", destination)
        _save_image(uploaded, destination, normalize_height)
        saved_files.append(str(destination.relative_to(BASE_DIR)))
        index += 1

    if not saved_files:
        abort(400, description="No files were saved.")

    response = {
        "storybook": slug,
        "action": action,
        "saved": saved_files,
        "count": len(saved_files),
        "location": str((pages_dir).relative_to(BASE_DIR)),
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }
    logging.info("Stored %s file(s) for %s", len(saved_files), slug)
    return jsonify(response), 201


@app.route("/api/health", methods=["GET"])  # tiny smoke test for automation
def health() -> tuple[str, int]:
    return "ok", 200


if __name__ == "__main__":
    host = os.environ.get("ADMIN_SERVER_HOST", "127.0.0.1")
    port = int(os.environ.get("ADMIN_SERVER_PORT", "5001"))
    debug = os.environ.get("ADMIN_SERVER_DEBUG", "true").lower() == "true"
    logging.info("Starting admin server on %s:%s", host, port)
    app.run(host=host, port=port, debug=debug)
