import os
import json
import asyncio
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.models import AddLinkRequest, ClassifyResult, DownloadTask, TaskStatus
from app.classifier.router import classify_url
from app.aggregator.engine import engine
from app.services.ytdlp_service import ytdlp_service
from app.services.qbit_service import qbit_service
from app.services.jd_service import jd_service


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


@app.get("/api/downloads/file/{task_id}")
async def download_file_direct(task_id: str):
    """Serve downloaded file directly to browser with proper attachment headers."""
    task = ytdlp_service.get_task(task_id)
    file_path = None
    filename = None

    if task and task.file_path and os.path.exists(task.file_path):
        file_path = task.file_path
        filename = Path(task.file_path).name
    else:
        # Fallback: look for file in download_dir containing task_id
        download_dir = Path(settings.DOWNLOAD_DIR)
        matches = list(download_dir.glob(f"*{task_id}*"))
        if matches and matches[0].is_file():
            file_path = str(matches[0])
            filename = matches[0].name

    if not file_path or not os.path.exists(file_path):
        if task and task.status in (TaskStatus.DOWNLOADING, TaskStatus.QUEUED, TaskStatus.CHECKING):
            raise HTTPException(status_code=425, detail="Plik jest jeszcze w trakcie pobierania lub przetwarzania")
        raise HTTPException(status_code=404, detail="Plik nie został znaleziony na serwerze")

    ext = Path(file_path).suffix.lower()
    media_type = "video/mp4" if ext == ".mp4" else "audio/mpeg" if ext == ".mp3" else "application/octet-stream"

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
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
