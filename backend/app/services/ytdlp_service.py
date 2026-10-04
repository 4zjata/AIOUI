import asyncio
import os
import json
import time
import uuid
import logging
from pathlib import Path
from typing import Dict, List, Optional
import yt_dlp

from app.config import settings
from app.models import DownloadTask, TargetService, TaskStatus

logger = logging.getLogger(__name__)


class YTDLPService:
    def __init__(self):
        self.download_dir = Path(settings.DOWNLOAD_DIR)
        self.download_dir.mkdir(parents=True, exist_ok=True)
        self.cache_file = self.download_dir / ".aioui_ytdlp_tasks.json"
        self.tasks: Dict[str, DownloadTask] = {}
        self._cancel_flags: Dict[str, bool] = {}
        self._load_cache()

    def _load_cache(self):
        """Restore previous tasks from disk cache on startup."""
        if self.cache_file.exists():
            try:
                with open(self.cache_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for item in data:
                        task = DownloadTask(**item)
                        # Verify file still exists on disk if completed
                        if task.file_path and not os.path.exists(task.file_path):
                            task.status = TaskStatus.ERROR
                            task.error_message = "Plik został usunięty z dysku"
                        self.tasks[task.id] = task
            except Exception as e:
                logger.warning(f"Could not load ytdlp tasks cache: {e}")

    def _save_cache(self):
        """Persist current tasks to disk cache."""
        try:
            with open(self.cache_file, "w", encoding="utf-8") as f:
                json.dump([t.model_dump() for t in self.tasks.values()], f, indent=2)
        except Exception as e:
            logger.warning(f"Could not save ytdlp tasks cache: {e}")

    def get_tasks(self) -> List[DownloadTask]:
        return list(self.tasks.values())

    def get_task(self, task_id: str) -> Optional[DownloadTask]:
        return self.tasks.get(task_id)

    async def add_download(
        self,
        url: str,
        format_type: str = "video",
        quality: str = "best",
        download_to_device: bool = False,
    ) -> str:
        task_id = f"ytdlp_{uuid.uuid4().hex[:10]}"
        task = DownloadTask(
            id=task_id,
            name=f"Inicjowanie: {url[:45]}...",
            source=TargetService.YTDLP,
            status=TaskStatus.QUEUED,
            progress=0.0,
            speed=0,
            eta=None,
            created_at=time.time(),
        )
        self.tasks[task_id] = task
        self._cancel_flags[task_id] = False
        self._save_cache()

        # Start download in background
        asyncio.create_task(
            self._download_worker(task_id, url, format_type, quality, download_to_device)
        )
        return task_id

    async def _download_worker(
        self,
        task_id: str,
        url: str,
        format_type: str,
        quality: str,
        download_to_device: bool,
    ):
        loop = asyncio.get_running_loop()

        def _run():
            task = self.tasks[task_id]
            task.status = TaskStatus.DOWNLOADING

            def progress_hook(d):
                if self._cancel_flags.get(task_id, False):
                    raise RuntimeError("Download cancelled by user")

                if d["status"] == "downloading":
                    downloaded = d.get("downloaded_bytes", 0)
                    total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
                    speed = d.get("speed") or 0
                    eta = d.get("eta")

                    task.downloaded_bytes = downloaded
                    task.total_bytes = total if total > 0 else None
                    task.speed = int(speed) if speed else 0
                    task.eta = int(eta) if eta and eta > 0 else None

                    if total and total > 0:
                        task.progress = round((downloaded / total) * 100.0, 1)

                    info_dict = d.get("info_dict", {})
                    if info_dict.get("title") and task.name.startswith("Inicjowanie:"):
                        task.name = info_dict["title"]

                elif d["status"] == "finished":
                    # Download finished for stream, awaiting postprocessing/muxing
                    task.progress = 99.0
                    task.speed = 0
                    task.eta = None

            # Configure yt-dlp format options
            ydl_opts = {
                "outtmpl": str(self.download_dir / "%(title)s [%(id)s].%(ext)s"),
                "progress_hooks": [progress_hook],
                "quiet": True,
                "no_warnings": True,
                "noplaylist": True,
            }

            if format_type == "audio":
                ydl_opts.update(
                    {
                        "format": "bestaudio/best",
                        "postprocessors": [
                            {
                                "key": "FFmpegExtractAudio",
                                "preferredcodec": "mp3",
                                "preferredquality": "320" if quality == "320k" else "192",
                            }
                        ],
                    }
                )
            else:
                # Video format selector
                if quality == "1080p":
                    ydl_opts["format"] = "bv*[height<=1080]+ba/b[height<=1080]/best"
                elif quality == "720p":
                    ydl_opts["format"] = "bv*[height<=720]+ba/b[height<=720]/best"
                elif quality == "480p":
                    ydl_opts["format"] = "bv*[height<=480]+ba/b[height<=480]/best"
                else:
                    ydl_opts["format"] = "bv*+ba/b"

                ydl_opts["merge_output_format"] = "mp4"

            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=True)
                    if info and info.get("title"):
                        task.name = info["title"]

                    final_file = None
                    requested = info.get("requested_downloads") if info else None
                    if requested and len(requested) > 0 and requested[0].get("filepath"):
                        final_file = requested[0]["filepath"]

                    if not final_file and info:
                        expected = ydl.prepare_filename(info)
                        if format_type == "audio":
                            expected = str(Path(expected).with_suffix(".mp3"))
                        if os.path.exists(expected):
                            final_file = expected
                        else:
                            mp4_cand = str(Path(expected).with_suffix(".mp4"))
                            if os.path.exists(mp4_cand):
                                final_file = mp4_cand

                    if final_file and os.path.exists(final_file):
                        task.file_path = str(final_file)
                        task.name = Path(final_file).name
                        task.status = TaskStatus.COMPLETED
                        task.progress = 100.0
                        if download_to_device:
                            task.download_url = f"/api/downloads/file/{task_id}"
                    else:
                        task.status = TaskStatus.COMPLETED
                        task.progress = 100.0

            except Exception as e:
                logger.error(f"yt-dlp download failed for {url}: {e}")
                task.status = TaskStatus.ERROR
                task.error_message = str(e)

            finally:
                self._save_cache()

        await loop.run_in_executor(None, _run)

    def cancel_task(self, task_id: str) -> bool:
        if task_id in self._cancel_flags:
            self._cancel_flags[task_id] = True
            if task_id in self.tasks:
                self.tasks[task_id].status = TaskStatus.ERROR
                self.tasks[task_id].error_message = "Anulowano przez użytkownika"
                self._save_cache()
            return True
        return False

    def delete_task(self, task_id: str, delete_file: bool = False) -> bool:
        self.cancel_task(task_id)
        task = self.tasks.pop(task_id, None)
        if task and delete_file and task.file_path and os.path.exists(task.file_path):
            try:
                os.remove(task.file_path)
            except Exception as e:
                logger.warning(f"Could not delete file {task.file_path}: {e}")
        self._save_cache()
        return True


ytdlp_service = YTDLPService()
