from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # qBittorrent Configuration
    QBIT_URL: str = "https://localhost:8080"
    QBIT_USER: str = "Voidy"
    QBIT_PASSWORD: str = "adminpassword"

    # MyJDownloader Configuration
    MYJD_EMAIL: str = "admin@example.com"
    MYJD_PASSWORD: str = "adminpassword"
    MYJD_DEVICE_NAME: Optional[str] = None

    # yt-dlp & Downloads Configuration
    DOWNLOAD_DIR: str = str(Path.home() / "Downloads")
    MAX_CONCURRENT_DOWNLOADS: int = 3

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).parent.parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
