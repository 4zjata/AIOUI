import os
import mimetypes
from pathlib import Path
from typing import List, Optional
from datetime import datetime

from app.config import settings
from app.models import ServerFile


class FileService:
    def __init__(self):
        self.base_dir = Path(settings.DOWNLOAD_DIR).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def resolve_safe_path(self, relative_path: str) -> Optional[Path]:
        """
        Safely resolve a relative path inside the download directory,
        preventing directory traversal attacks (e.g. ../../etc/passwd).
        """
        # Clean leading slashes
        clean_path = relative_path.lstrip("/\\")
        candidate = (self.base_dir / clean_path).resolve()
        try:
            # Check if candidate is relative to base_dir
            candidate.relative_to(self.base_dir)
            if candidate.exists() and candidate.is_file():
                return candidate
        except (ValueError, RuntimeError):
            pass
        return None

    def list_files(self) -> List[ServerFile]:
        """List all completed files in the download directory."""
        if not self.base_dir.exists():
            return []

        results: List[ServerFile] = []
        try:
            for item in self.base_dir.rglob("*"):
                # Skip hidden files/directories (like .aioui_ytdlp_tasks.json or .git)
                if any(part.startswith(".") for part in item.relative_to(self.base_dir).parts):
                    continue

                if item.is_file():
                    try:
                        stat = item.stat()
                        rel_path = str(item.relative_to(self.base_dir))
                        ext = item.suffix.lower()
                        results.append(
                            ServerFile(
                                name=item.name,
                                path=rel_path,
                                size=stat.st_size,
                                modified_at=stat.st_mtime,
                                download_url=f"/api/files/download?path={rel_path}",
                                is_dir=False,
                                extension=ext,
                            )
                        )
                    except (OSError, PermissionError):
                        continue
        except Exception:
            pass

        # Sort by modification time descending (newest first)
        results.sort(key=lambda x: x.modified_at, reverse=True)
        return results

    def delete_file(self, relative_path: str) -> bool:
        """Safely delete a file in the download directory."""
        target = self.resolve_safe_path(relative_path)
        if target and target.is_file():
            try:
                os.remove(target)
                return True
            except OSError:
                return False
        return False


file_service = FileService()
