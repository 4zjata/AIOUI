import logging
from typing import List, Optional
import httpx

from app.config import settings
from app.models import DownloadTask, TargetService, TaskStatus

logger = logging.getLogger(__name__)


class QBitService:
    def __init__(self):
        self.base_url = settings.QBIT_URL.rstrip("/")
        self.username = settings.QBIT_USER
        self.password = settings.QBIT_PASSWORD
        self._client: Optional[httpx.AsyncClient] = None
        self._authenticated = False

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=10.0,
                verify=False,
                headers={"Referer": f"{self.base_url}/"},
            )
        return self._client

    async def login(self) -> bool:
        """Authenticate with qBittorrent WebAPI v2."""
        try:
            client = await self._get_client()
            res = await client.post(
                "/api/v2/auth/login",
                data={"username": self.username, "password": self.password},
                headers={"Referer": f"{self.base_url}/", "Origin": self.base_url},
            )
            if res.status_code == 200 and "Ok." in res.text:
                self._authenticated = True
                return True
            logger.warning(f"qBittorrent login returned status {res.status_code}: {res.text}")
            return False
        except Exception as e:
            logger.error(f"qBittorrent login error: {e}")
            return False

    async def add_url(self, url: str) -> bool:
        """Add magnet or torrent URL to qBittorrent."""
        client = await self._get_client()
        try:
            res = await client.post("/api/v2/torrents/add", data={"urls": url})
            if res.status_code == 403:
                # Session might be expired, re-login
                if await self.login():
                    res = await client.post("/api/v2/torrents/add", data={"urls": url})
            return res.status_code == 200
        except Exception as e:
            logger.error(f"Error adding URL to qBit: {e}")
            return False

    async def add_file(self, filename: str, file_bytes: bytes) -> bool:
        """Upload raw .torrent file to qBittorrent."""
        client = await self._get_client()
        try:
            files = {"torrents": (filename, file_bytes, "application/x-bittorrent")}
            res = await client.post("/api/v2/torrents/add", files=files)
            if res.status_code == 403:
                if await self.login():
                    res = await client.post("/api/v2/torrents/add", files=files)
            return res.status_code == 200
        except Exception as e:
            logger.error(f"Error uploading torrent file to qBit: {e}")
            return False

    async def get_tasks(self) -> List[DownloadTask]:
        """Fetch all torrents and map to DownloadTask."""
        client = await self._get_client()
        try:
            res = await client.get("/api/v2/torrents/info")
            if res.status_code == 403:
                if await self.login():
                    res = await client.get("/api/v2/torrents/info")
                else:
                    return []
            if res.status_code != 200:
                return []

            torrents = res.json()
            tasks = []
            for t in torrents:
                state = t.get("state", "").lower()
                status = TaskStatus.DOWNLOADING
                if state in ("pauseddl", "pausedup"):
                    status = TaskStatus.PAUSED
                elif state in ("uploading", "stalledUP", "completed"):
                    status = TaskStatus.COMPLETED
                elif "error" in state or "missing" in state:
                    status = TaskStatus.ERROR
                elif "checking" in state:
                    status = TaskStatus.CHECKING
                elif state in ("allocating", "queueddl"):
                    status = TaskStatus.QUEUED

                progress = round(float(t.get("progress", 0.0)) * 100.0, 1)
                eta = t.get("eta")
                if eta and (eta < 0 or eta > 8640000):
                    eta = None

                tasks.append(
                    DownloadTask(
                        id=f"qbit_{t.get('hash')}",
                        name=t.get("name", "Torrent"),
                        source=TargetService.QBIT,
                        status=status,
                        progress=progress,
                        speed=int(t.get("dlspeed", 0)),
                        eta=eta,
                        total_bytes=t.get("total_size"),
                        downloaded_bytes=t.get("completed"),
                        created_at=float(t.get("added_on", 0)) if t.get("added_on") else None,
                    )
                )
            return tasks
        except Exception as e:
            logger.error(f"Error querying qBittorrent: {e}")
            return []

    async def pause_task(self, task_id: str) -> bool:
        client = await self._get_client()
        torrent_hash = task_id.replace("qbit_", "")
        res = await client.post("/api/v2/torrents/pause", data={"hashes": torrent_hash})
        return res.status_code == 200

    async def resume_task(self, task_id: str) -> bool:
        client = await self._get_client()
        torrent_hash = task_id.replace("qbit_", "")
        res = await client.post("/api/v2/torrents/resume", data={"hashes": torrent_hash})
        return res.status_code == 200

    async def delete_task(self, task_id: str, delete_files: bool = False) -> bool:
        client = await self._get_client()
        torrent_hash = task_id.replace("qbit_", "")
        res = await client.post(
            "/api/v2/torrents/delete",
            data={"hashes": torrent_hash, "deleteFiles": "true" if delete_files else "false"},
        )
        return res.status_code == 200


qbit_service = QBitService()
