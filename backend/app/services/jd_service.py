import asyncio
import logging
from typing import List, Optional
import myjdapi

from app.config import settings
from app.models import DownloadTask, TargetService, TaskStatus

logger = logging.getLogger(__name__)


class JDService:
    def __init__(self):
        self.email = settings.MYJD_EMAIL
        self.password = settings.MYJD_PASSWORD
        self.device_name = settings.MYJD_DEVICE_NAME
        self.jd = myjdapi.Myjdapi()
        self.jd.set_app_key("AIOUI")
        self._connected = False
        self._device = None

    def _ensure_device(self):
        if not self._connected or not self.jd.is_connected():
            res = self.jd.connect(self.email, self.password)
            if not res:
                raise RuntimeError("Failed to authenticate with MyJDownloader")
            self._connected = True

        if self._device is None:
            devices = self.jd.list_devices()
            if not devices:
                raise RuntimeError("No active JDownloader devices found in MyJDownloader account")
            target_name = self.device_name or devices[0].get("name")
            self._device = self.jd.get_device(target_name)
        return self._device

    async def add_url(self, url: str, autostart: bool = True) -> bool:
        """Add link to JDownloader LinkGrabber with optional auto-start."""
        def _add():
            dev = self._ensure_device()
            # add_links takes list of link dicts
            return dev.linkgrabber.add_links(
                [{"link": url, "autostart": autostart, "autoExtract": True}]
            )

        try:
            res = await asyncio.to_thread(_add)
            return bool(res)
        except Exception as e:
            logger.error(f"Error adding link to JDownloader: {e}")
            # Reset connection in case session expired
            self._connected = False
            self._device = None
            return False

    async def get_tasks(self) -> List[DownloadTask]:
        """Fetch active download links from JDownloader and map to DownloadTask."""
        def _query():
            dev = self._ensure_device()
            links = dev.downloads.query_links(
                params=[
                    {
                        "bytesLoaded": True,
                        "bytesTotal": True,
                        "speed": True,
                        "eta": True,
                        "finished": True,
                        "running": True,
                        "status": True,
                    }
                ]
            )
            return links

        try:
            raw_links = await asyncio.to_thread(_query)
            if not raw_links:
                return []

            tasks = []
            for link in raw_links:
                uuid = str(link.get("uuid", link.get("id", "")))
                name = link.get("name", "JDownloader Task")
                bytes_loaded = link.get("bytesLoaded", 0)
                bytes_total = link.get("bytesTotal", 0)
                speed = link.get("speed", 0)
                eta = link.get("eta")
                finished = link.get("finished", False)
                running = link.get("running", False)

                if finished:
                    status = TaskStatus.COMPLETED
                    progress = 100.0
                elif running:
                    status = TaskStatus.DOWNLOADING
                    progress = (
                        round((bytes_loaded / bytes_total) * 100.0, 1)
                        if bytes_total and bytes_total > 0
                        else 0.0
                    )
                else:
                    status = TaskStatus.PAUSED
                    progress = (
                        round((bytes_loaded / bytes_total) * 100.0, 1)
                        if bytes_total and bytes_total > 0
                        else 0.0
                    )

                tasks.append(
                    DownloadTask(
                        id=f"jd_{uuid}",
                        name=name,
                        source=TargetService.JDOWN,
                        status=status,
                        progress=progress,
                        speed=int(speed or 0),
                        eta=int(eta) if eta and eta > 0 else None,
                        total_bytes=bytes_total if bytes_total > 0 else None,
                        downloaded_bytes=bytes_loaded,
                    )
                )
            return tasks
        except Exception as e:
            logger.error(f"Error querying JDownloader: {e}")
            self._connected = False
            self._device = None
            return []

    async def start_downloads(self) -> bool:
        def _start():
            dev = self._ensure_device()
            return dev.downloadcontroller.start_downloads()
        try:
            return bool(await asyncio.to_thread(_start))
        except Exception:
            return False

    async def pause_downloads(self) -> bool:
        def _pause():
            dev = self._ensure_device()
            return dev.downloadcontroller.pause_downloads(True)
        try:
            return bool(await asyncio.to_thread(_pause))
        except Exception:
            return False

    async def resume_downloads(self) -> bool:
        def _resume():
            dev = self._ensure_device()
            return dev.downloadcontroller.pause_downloads(False)
        try:
            return bool(await asyncio.to_thread(_resume))
        except Exception:
            return False


jd_service = JDService()
