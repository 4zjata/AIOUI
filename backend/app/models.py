from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class TargetService(str, Enum):
    QBIT = "qbit"
    JDOWN = "jdown"
    YTDLP = "ytdlp"


class TaskStatus(str, Enum):
    DOWNLOADING = "downloading"
    PAUSED = "paused"
    COMPLETED = "completed"
    ERROR = "error"
    QUEUED = "queued"
    CHECKING = "checking"


class DownloadTask(BaseModel):
    id: str
    name: str
    source: TargetService
    status: TaskStatus
    progress: float = Field(default=0.0, ge=0.0, le=100.0)
    speed: int = Field(default=0, description="Speed in bytes/sec")
    eta: Optional[int] = Field(default=None, description="ETA in seconds")
    total_bytes: Optional[int] = None
    downloaded_bytes: Optional[int] = None
    error_message: Optional[str] = None
    created_at: Optional[float] = None
    file_path: Optional[str] = None
    download_url: Optional[str] = None


class ServerFile(BaseModel):
    name: str
    path: str
    size: int
    modified_at: float
    download_url: str
    is_dir: bool = False
    extension: str = ""


class ClassifyResult(BaseModel):
    url: str
    target: TargetService
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    reason: str
    is_media: bool = False
    title: Optional[str] = None
    thumbnail: Optional[str] = None


class AddLinkRequest(BaseModel):
    url: str
    target: Optional[TargetService] = None
    format_type: Optional[str] = "video"  # "video" or "audio"
    quality: Optional[str] = "best"        # "best", "1080p", "720p", "480p", "320k"
    download_to_device: bool = False
    autostart: bool = True
