import os
import json
import asyncio
from pathlib import Path
from typing import List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, Query
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.models import AddLinkRequest, ClassifyResult, DownloadTask, TaskStatus, ServerFile
from app.classifier.router import classify_url
from app.aggregator.engine import engine
from app.services.ytdlp_service import ytdlp_service
from app.services.qbit_service import qbit_service
from app.services.jd_service import jd_service
from app.services.file_service import file_service


def get_media_type(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    mapping = {
        ".mp4": "video/mp4",
        ".mkv": "video/x-matroska",
        ".webm": "video/webm",
        ".avi": "video/x-msvideo",
        ".mov": "video/quicktime",
        ".mp3": "audio/mpeg",
        ".flac": "audio/flac",
        ".m4a": "audio/mp4",
        ".wav": "audio/wav",
        ".ogg": "audio/ogg",
        ".zip": "application/zip",
        ".rar": "application/vnd.rar",
        ".7z": "application/x-7z-compressed",
        ".tar": "application/x-tar",
        ".gz": "application/gzip",
        ".iso": "application/x-iso9660-image",
        ".pdf": "application/pdf",
        ".torrent": "application/x-bittorrent",
    }
    return mapping.get(ext, "application/octet-stream")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await engine.start()
    yield
    await engine.stop()


app = FastAPI(title="AIOUI API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/status")
async def get_services_status():
    return {
        "status": "ok",
        "qbit_url": settings.QBIT_URL,
        "myjd_email": settings.MYJD_EMAIL,
        "download_dir": settings.DOWNLOAD_DIR,
    }


@app.post("/api/classify", response_model=ClassifyResult)
async def classify_endpoint(payload: dict):
    url = payload.get("url", "")
    if not url:
        raise HTTPException(status_code=400, detail="Missing URL parameter")
    return await classify_url(url, probe_head=True)


@app.get("/api/downloads")
async def list_downloads():
    tasks = await engine.get_all_tasks()
    return tasks


@app.post("/api/downloads/add")
async def add_download(req: AddLinkRequest):
    if not req.url:
        raise HTTPException(status_code=400, detail="URL cannot be empty")
    result = await engine.add_link(req)
    return result


@app.post("/api/downloads/upload")
async def upload_torrent(file: UploadFile = File(...)):
    content = await file.read()
    result = await engine.add_file(file.filename or "uploaded.torrent", content)
    return result


@app.post("/api/downloads/{task_id}/pause")
async def pause_task(task_id: str):
    success = await engine.pause_task(task_id)
    return {"success": success}


@app.post("/api/downloads/{task_id}/resume")
async def resume_task(task_id: str):
    success = await engine.resume_task(task_id)
    return {"success": success}


@app.delete("/api/downloads/{task_id}")
async def delete_task(task_id: str, delete_files: bool = False):
    success = await engine.delete_task(task_id, delete_files=delete_files)
    return {"success": success}


# File Browsing and Direct HTTP Serving Endpoints
@app.get("/api/files", response_model=List[ServerFile])
async def list_server_files():
    """List all completed files stored on the server in DOWNLOAD_DIR."""
    return file_service.list_files()


@app.get("/api/files/download")
async def download_server_file(path: str = Query(..., description="Relative file path")):
    """Serve any file located in the server's download directory via HTTP."""
    target_path = file_service.resolve_safe_path(path)
    if not target_path or not target_path.is_file():
        raise HTTPException(status_code=404, detail="Plik nie został znaleziony lub brak uprawnień")

    filename = target_path.name
    return FileResponse(
        path=str(target_path),
        filename=filename,
        media_type=get_media_type(filename),
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Accept-Ranges": "bytes",
        },
    )


@app.delete("/api/files")
async def delete_server_file(path: str = Query(..., description="Relative file path")):
    """Delete a file from the server's download directory."""
    success = file_service.delete_file(path)
    if not success:
        raise HTTPException(status_code=400, detail="Nie udało się usunąć pliku")
    return {"success": True}


@app.get("/api/downloads/{task_id}/file")
@app.get("/api/downloads/file/{task_id}")
async def download_file_direct(task_id: str):
    """Serve completed download task file directly to browser via HTTP."""
    task = ytdlp_service.get_task(task_id)
    file_path = None
    filename = None

    if task:
        if task.file_path and os.path.exists(task.file_path):
            file_path = task.file_path
            filename = Path(task.file_path).name
        elif task.status in (TaskStatus.DOWNLOADING, TaskStatus.QUEUED, TaskStatus.CHECKING):
            raise HTTPException(status_code=425, detail="Plik jest jeszcze w trakcie pobierania lub przetwarzania")

    # If not in yt-dlp, check qBittorrent completed tasks
    if not file_path:
        qbit_tasks = await qbit_service.get_tasks()
        for qt in qbit_tasks:
            if qt.id == task_id and qt.file_path and os.path.exists(qt.file_path):
                file_path = qt.file_path
                filename = Path(qt.file_path).name
                break

    # Fallback: look for file in download_dir matching task name or task_id
    if not file_path:
        download_dir = Path(settings.DOWNLOAD_DIR)
        all_tasks = await engine.get_all_tasks()
        target_task = next((t for t in all_tasks if t.id == task_id), None)
        if target_task and target_task.name:
            exact = download_dir / target_task.name
            if exact.is_file():
                file_path = str(exact)
                filename = exact.name
            elif download_dir.exists():
                for p in download_dir.rglob("*"):
                    if p.is_file() and p.name == target_task.name:
                        file_path = str(p)
                        filename = p.name
                        break

        if not file_path and download_dir.exists():
            matches = list(download_dir.glob(f"*{task_id}*"))
            if matches and matches[0].is_file():
                file_path = str(matches[0])
                filename = matches[0].name

    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Plik wynikowy nie został odnaleziony na serwerze")

    # If it's a directory (e.g. multi-file torrent), raise notice or point to files
    if os.path.isdir(file_path):
        raise HTTPException(status_code=400, detail="To zadanie jest folderem - użyj zakładki Pliki, aby pobrać poszczególne pliki")

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type=get_media_type(filename),
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Accept-Ranges": "bytes",
        },
    )


@app.get("/api/downloads/stream")
async def stream_downloads(request: Request):
    queue = engine.subscribe()

    async def event_generator():
        try:
            initial_tasks = await engine.get_all_tasks()
            yield f"data: {json.dumps([t.model_dump() for t in initial_tasks])}\n\n"

            while True:
                if await request.is_disconnected():
                    break
                data = await queue.get()
                yield f"data: {json.dumps(data)}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            engine.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


frontend_dist = Path(__file__).parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists() and (frontend_dist / "index.html").exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
