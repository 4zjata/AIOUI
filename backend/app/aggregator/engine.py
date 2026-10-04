import asyncio
import logging
from typing import List, Dict, Any, Optional

from app.models import DownloadTask, AddLinkRequest, TargetService, TaskStatus
from app.classifier.router import classify_url, classify_file_content
from app.services.qbit_service import qbit_service
from app.services.jd_service import jd_service
from app.services.ytdlp_service import ytdlp_service

logger = logging.getLogger(__name__)


class AggregatorEngine:
    def __init__(self):
        self._listeners: List[asyncio.Queue] = []
        self._polling_task: Optional[asyncio.Task] = None

    async def start(self):
        if self._polling_task is None or self._polling_task.done():
            self._polling_task = asyncio.create_task(self._poll_loop())

    async def stop(self):
        if self._polling_task and not self._polling_task.done():
            self._polling_task.cancel()

    async def get_all_tasks(self) -> List[DownloadTask]:
        """Aggregate tasks from all three sources concurrently."""
        results = await asyncio.gather(
            qbit_service.get_tasks(),
            jd_service.get_tasks(),
            asyncio.to_thread(ytdlp_service.get_tasks),
            return_exceptions=True,
        )

        all_tasks: List[DownloadTask] = []
        for res in results:
            if isinstance(res, list):
                all_tasks.extend(res)
            elif isinstance(res, Exception):
                logger.debug(f"Service query warning: {res}")

        # Sort tasks: downloading/active first, then queued, then others
        def sort_key(t: DownloadTask):
            order = {
                TaskStatus.DOWNLOADING: 0,
                TaskStatus.CHECKING: 1,
                TaskStatus.QUEUED: 2,
                TaskStatus.PAUSED: 3,
                TaskStatus.COMPLETED: 4,
                TaskStatus.ERROR: 5,
            }
            return (order.get(t.status, 9), -(t.created_at or 0))

        all_tasks.sort(key=sort_key)
        return all_tasks

    async def add_link(self, req: AddLinkRequest) -> Dict[str, Any]:
        """Classify (if target not forced) and route to target downloader."""
        target = req.target
        if not target:
            classified = await classify_url(req.url, probe_head=True)
            target = classified.target

        success = False
        message = ""
        task_id = ""

        if target == TargetService.QBIT:
            success = await qbit_service.add_url(req.url)
            message = "Dodano zadanie do qBittorrent" if success else "Nie udało się dodać do qBittorrent"
            task_id = f"qbit_pending_{hash(req.url)}"

        elif target == TargetService.YTDLP:
            task_id = await ytdlp_service.add_download(
                url=req.url,
                format_type=req.format_type or "video",
                quality=req.quality or "best",
                download_to_device=req.download_to_device,
            )
            success = True
            message = "Rozpoczęto pobieranie w silniku yt-dlp"

        elif target == TargetService.JDOWN:
            success = await jd_service.add_url(req.url, autostart=req.autostart)
            message = "Przekazano link do JDownloader" if success else "Nie udało się dodać do JDownloader"
            task_id = f"jd_pending_{hash(req.url)}"

        return {
            "success": success,
            "target": target,
            "message": message,
            "task_id": task_id,
        }

    async def add_file(self, filename: str, content: bytes) -> Dict[str, Any]:
        """Classify and add uploaded/dropped file."""
        classified = classify_file_content(filename, content[:64])
        target = classified.target
        success = False
        message = ""

        if target == TargetService.QBIT:
            success = await qbit_service.add_file(filename, content)
            message = "Wgrano plik .torrent do qBittorrent" if success else "Błąd wgrywania pliku do qBittorrent"
        else:
            # Save file or send to JDownloader
            success = False
            message = "Nieobsługiwany format bezpośredniego pliku"

        return {
            "success": success,
            "target": target,
            "message": message,
        }

    async def pause_task(self, task_id: str) -> bool:
        if task_id.startswith("qbit_"):
            return await qbit_service.pause_task(task_id)
        elif task_id.startswith("jd_"):
            return await jd_service.pause_downloads()
        elif task_id.startswith("ytdlp_"):
            return ytdlp_service.cancel_task(task_id)
        return False

    async def resume_task(self, task_id: str) -> bool:
        if task_id.startswith("qbit_"):
            return await qbit_service.resume_task(task_id)
        elif task_id.startswith("jd_"):
            return await jd_service.start_downloads()
        return False

    async def delete_task(self, task_id: str, delete_files: bool = False) -> bool:
        if task_id.startswith("qbit_"):
            return await qbit_service.delete_task(task_id, delete_files=delete_files)
        elif task_id.startswith("ytdlp_"):
            return ytdlp_service.delete_task(task_id, delete_file=delete_files)
        return False

    def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue()
        self._listeners.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        if q in self._listeners:
            self._listeners.remove(q)

    async def _poll_loop(self):
        """Poll services every 1.5 seconds and broadcast to active SSE subscribers."""
        while True:
            try:
                if self._listeners:
                    tasks = await self.get_all_tasks()
                    data = [t.model_dump() for t in tasks]
                    for q in list(self._listeners):
                        try:
                            q.put_nowait(data)
                        except Exception:
                            pass
                await asyncio.sleep(1.5)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in aggregator poll loop: {e}")
                await asyncio.sleep(2.0)


engine = AggregatorEngine()
