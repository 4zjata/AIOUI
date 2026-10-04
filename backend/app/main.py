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
from app.models import AddLinkRequest, ClassifyResult, DownloadTask, TaskStatus, TaskFile
from app.classifier.router import classify_url
from app.aggregator.engine import engine
from app.services.ytdlp_service import ytdlp_service
from app.services.qbit_service import qbit_service
from app.services.jd_service import jd_service


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


# Task-ID Based File Serving Endpoints (Strictly zero path traversal surface)
@app.get("/api/downloads/{task_id}/files", response_model=List[TaskFile])
async def list_task_files(task_id: str):
    """List files belonging to a specific task_id without accepting any user filesystem path."""
    # 1. qBittorrent torrent
    if task_id.startswith("qbit_"):
        torrent_hash = task_id.replace("qbit_", "")
        raw_files = await qbit_service.get_torrent_files(torrent_hash)
        return [
            TaskFile(
                index=int(f["index"]),
                name=Path(f["name"]).name,
                size=int(f.get("size", 0)),
                download_url=f"/api/downloads/{task_id}/files/{f['index']}",
            )
            for f in raw_files
        ]

    # 2. yt-dlp task (1 file)
    if task_id.startswith("ytdlp_") or ytdlp_service.get_task(task_id):
        task = ytdlp_service.get_task(task_id)
        if task and task.file_path and os.path.exists(task.file_path):
            size = os.path.getsize(task.file_path)
            return [
                TaskFile(
                    index=0,
                    name=Path(task.file_path).name,
                    size=size,
                    download_url=f"/api/downloads/{task_id}/file",
                )
            ]

    # 3. JDownloader task
    all_tasks = await engine.get_all_tasks()
    target_task = next((t for t in all_tasks if t.id == task_id), None)
    if target_task:
        return [
            TaskFile(
                index=0,
                name=target_task.name,
                size=target_task.total_bytes or 0,
                download_url=f"/api/downloads/{task_id}/file",
            )
        ]

    raise HTTPException(status_code=404, detail="Zadanie nie zostało znalezione")


@app.get("/api/downloads/{task_id}/files/{file_index:int}")
async def download_task_file_by_index(task_id: str, file_index: int):
    """Serve a specific file from a task by its integer index. Zero path traversal risk."""
    if task_id.startswith("qbit_"):
        torrent_hash = task_id.replace("qbit_", "")
        raw_files = await qbit_service.get_torrent_files(torrent_hash)
        target_file = next((f for f in raw_files if f.get("index") == file_index), None)
        if not target_file:
            raise HTTPException(status_code=404, detail="Plik o tym indeksie nie istnieje w zadaniu")

        client = await qbit_service._get_client()
        t_info_res = await client.get("/api/v2/torrents/info", params={"hashes": torrent_hash})
        save_path = Path(settings.DOWNLOAD_DIR)
        content_path = None
        if t_info_res.status_code == 200 and t_info_res.json():
            t_data = t_info_res.json()[0]
            save_path = Path(t_data.get("save_path", settings.DOWNLOAD_DIR))
            content_path = Path(t_data.get("content_path", "")) if t_data.get("content_path") else None

        file_name = target_file["name"]
        file_path = save_path / file_name
        if not file_path.exists() and content_path:
            if (content_path / Path(file_name).name).exists():
                file_path = content_path / Path(file_name).name
            elif (content_path / file_name).exists():
                file_path = content_path / file_name

        if not file_path.exists():
            for base_dir in [Path(settings.DOWNLOAD_DIR), Path("/downloads")]:
                if not base_dir.exists():
                    continue
                if (base_dir / file_name).exists():
                    file_path = base_dir / file_name
                    break
                elif (base_dir / Path(file_name).name).exists():
                    file_path = base_dir / Path(file_name).name
                    break

        if not file_path.exists() or not file_path.is_file():
            raise HTTPException(status_code=404, detail="Plik nie został znaleziony na dysku")

        filename = Path(file_name).name
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type=get_media_type(filename),
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Accept-Ranges": "bytes",
            },
        )

    # For single-file tasks (index 0)
    if file_index == 0:
        return await download_file_direct(task_id)

    raise HTTPException(status_code=404, detail="Plik o podanym indeksie nie istnieje")


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
    if not file_path and task_id.startswith("qbit_"):
        torrent_hash = task_id.replace("qbit_", "")
        raw_files = await qbit_service.get_torrent_files(torrent_hash)
        if raw_files:
            # Pick the largest file (e.g. video file in a movie torrent)
            largest_file = max(raw_files, key=lambda f: f.get("size", 0))
            return await download_task_file_by_index(task_id, int(largest_file["index"]))

    # Fallback: look for file in download_dir or /downloads matching task name
    if not file_path:
        all_tasks = await engine.get_all_tasks()
        target_task = next((t for t in all_tasks if t.id == task_id), None)
        if target_task and target_task.name:
            for base_dir in [Path(settings.DOWNLOAD_DIR), Path("/downloads")]:
                if not base_dir.exists():
                    continue
                exact = base_dir / target_task.name
                if exact.is_file():
                    file_path = str(exact)
                    filename = exact.name
                    break
                else:
                    found = False
                    for p in base_dir.rglob("*"):
                        if p.is_file() and p.name == target_task.name:
                            file_path = str(p)
                            filename = p.name
                            found = True
                            break
                    if found:
                        break

    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Plik wynikowy nie został odnaleziony na serwerze")

    if os.path.isdir(file_path):
        # Look for largest file in the directory
        dir_files = [f for f in Path(file_path).rglob("*") if f.is_file()]
        if dir_files:
            largest = max(dir_files, key=lambda f: f.stat().st_size)
            file_path = str(largest)
            filename = largest.name
        else:
            raise HTTPException(status_code=404, detail="Folder zadania jest pusty")

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
