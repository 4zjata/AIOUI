import re
import urllib.parse
from pathlib import Path
from typing import Optional
import httpx

from app.models import ClassifyResult, TargetService
from app.classifier.hosters import is_known_hoster
from app.classifier.ytdlp_matcher import is_fast_path_media, match_ytdlp_extractor

# Regex patterns for Tier 1: Magnet & InfoHash
MAGNET_REGEX = re.compile(r"^magnet:\?xt=urn:(btih|btmh):[a-zA-Z0-9]{32,68}", re.IGNORECASE)
HEX_INFOHASH_REGEX = re.compile(r"^[0-9a-fA-F]{40}$")
BASE32_INFOHASH_REGEX = re.compile(r"^[2-7a-zA-Z]{32}$")

# Regex for Tier 2: Torrent URLs
TORRENT_URL_PATTERNS = [
    re.compile(r"\.torrent(\?.*)?$", re.IGNORECASE),
    re.compile(r"/torrents/download/", re.IGNORECASE),
    re.compile(r"download\.php\?.*(torrent|type=torrent|id=)", re.IGNORECASE),
    re.compile(r"/download/torrent/", re.IGNORECASE),
]

# Extensions for Tier 5
ARCHIVE_AND_BINARY_EXTENSIONS = {
    ".zip", ".rar", ".7z", ".tar", ".gz", ".xz", ".bz2", ".tgz",
    ".iso", ".img", ".bin", ".cue",
    ".exe", ".msi", ".dmg", ".pkg", ".appimage", ".deb", ".rpm", ".apk",
    ".pdf", ".epub", ".mobi",
}

DIRECT_MEDIA_EXTENSIONS = {
    ".mp4", ".mkv", ".webm", ".avi", ".mov", ".flv", ".wmv", ".ts",
    ".mp3", ".m4a", ".aac", ".flac", ".wav", ".ogg", ".opus",
    ".m3u8", ".mpd",
}


def classify_file_content(filename: str, content_prefix: bytes) -> ClassifyResult:
    """Tier 0: Classify uploaded / dragged file by magic bytes and extension."""
    lower_name = filename.lower()
    if lower_name.endswith(".torrent") or content_prefix.startswith(b"d8:announce") or content_prefix.startswith(b"d"):
        return ClassifyResult(
            url=filename,
            target=TargetService.QBIT,
            confidence=1.0,
            reason="Plik .torrent (nagłówek Bencode lub rozszerzenie)",
            is_media=False,
        )
    return ClassifyResult(
        url=filename,
        target=TargetService.JDOWN,
        confidence=0.9,
        reason="Plik binarny / archiwum przekazane do JDownloader",
        is_media=False,
    )


async def classify_url(raw_input: str, probe_head: bool = True) -> ClassifyResult:
    """
    Multi-Tier Classification Pipeline for arbitrary URLs and strings.
    Gives yt-dlp ABSOLUTE PRIORITY for video/audio platforms.
    """
    clean_input = raw_input.strip()

    # --- Tier 1: Magnet link or Raw InfoHash ---
    if MAGNET_REGEX.match(clean_input):
        return ClassifyResult(
            url=clean_input,
            target=TargetService.QBIT,
            confidence=1.0,
            reason="Link Magnet (BitTorrent)",
            is_media=False,
        )

    if HEX_INFOHASH_REGEX.match(clean_input) or BASE32_INFOHASH_REGEX.match(clean_input):
        formatted_magnet = f"magnet:?xt=urn:btih:{clean_input}"
        return ClassifyResult(
            url=formatted_magnet,
            target=TargetService.QBIT,
            confidence=1.0,
            reason="Suma kontrolna InfoHash przetłumaczona na link Magnet",
            is_media=False,
        )

    # Parse URL
    try:
        parsed = urllib.parse.urlparse(clean_input)
        if not parsed.scheme:
            # If user pasted www.youtube.com/... prepend https://
            if clean_input.startswith("www.") or "." in clean_input.split("/")[0]:
                clean_input = "https://" + clean_input
                parsed = urllib.parse.urlparse(clean_input)
    except Exception:
        pass

    hostname = (parsed.hostname or "").lower()
    path = parsed.path.lower()

    # --- Tier 2: Torrent URLs ---
    for pattern in TORRENT_URL_PATTERNS:
        if pattern.search(clean_input) or pattern.search(path):
            return ClassifyResult(
                url=clean_input,
                target=TargetService.QBIT,
                confidence=1.0,
                reason="Bezpośredni link do pliku .torrent / endpoint trackera",
                is_media=False,
            )

    # --- Tier 3: Fast-Path Media (yt-dlp absolute priority) ---
    if is_fast_path_media(hostname):
        return ClassifyResult(
            url=clean_input,
            target=TargetService.YTDLP,
            confidence=1.0,
            reason=f"Popularna platforma wideo/audio ({hostname})",
            is_media=True,
        )

    # --- Tier 4: Known File Hosters (JDownloader 2) ---
    if is_known_hoster(hostname):
        return ClassifyResult(
            url=clean_input,
            target=TargetService.JDOWN,
            confidence=1.0,
            reason=f"Rozpoznany hosting plików / chmura ({hostname})",
            is_media=False,
        )

    # --- Tier 5: Direct File Extensions in Path ---
    ext = Path(path).suffix.lower()
    if ext in DIRECT_MEDIA_EXTENSIONS:
        return ClassifyResult(
            url=clean_input,
            target=TargetService.YTDLP,
            confidence=0.95,
            reason=f"Bezpośredni plik multimedialny ({ext})",
            is_media=True,
        )

    if ext in ARCHIVE_AND_BINARY_EXTENSIONS:
        return ClassifyResult(
            url=clean_input,
            target=TargetService.JDOWN,
            confidence=0.95,
            reason=f"Plik archiwalny / binarny do pobrania ({ext})",
            is_media=False,
        )

    # --- Tier 6: Full yt-dlp Extractor Registry (~1900 extractors) ---
    ytdlp_match = match_ytdlp_extractor(clean_input)
    if ytdlp_match:
        return ClassifyResult(
            url=clean_input,
            target=TargetService.YTDLP,
            confidence=0.95,
            reason=f"Rozpoznano ekstraktor multimediów yt-dlp ({ytdlp_match})",
            is_media=True,
        )

    # --- Tier 7: Async HTTP HEAD Probe (if probe_head is enabled) ---
    if probe_head and parsed.scheme in ("http", "https"):
        try:
            async with httpx.AsyncClient(timeout=1.8, follow_redirects=True) as client:
                headers = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"}
                response = await client.head(clean_input, headers=headers)
                content_type = response.headers.get("content-type", "").lower()
                content_disposition = response.headers.get("content-disposition", "").lower()

                # BitTorrent MIME
                if "application/x-bittorrent" in content_type or ".torrent" in content_disposition:
                    return ClassifyResult(
                        url=str(response.url),
                        target=TargetService.QBIT,
                        confidence=0.98,
                        reason="Wykryto plik torrent przez nagłówek Content-Type",
                        is_media=False,
                    )

                # Video / Audio MIME
                if any(media_type in content_type for media_type in ("video/", "audio/", "application/x-mpegurl", "application/dash+xml")):
                    return ClassifyResult(
                        url=str(response.url),
                        target=TargetService.YTDLP,
                        confidence=0.95,
                        reason=f"Wykryto strumień wideo/audio ({content_type.split(';')[0]})",
                        is_media=True,
                    )

                # Binary / Archive MIME
                if any(bin_type in content_type for bin_type in ("application/zip", "application/x-rar", "application/x-7z", "application/octet-stream")):
                    return ClassifyResult(
                        url=str(response.url),
                        target=TargetService.JDOWN,
                        confidence=0.90,
                        reason=f"Wykryto plik binarny przez nagłówek Content-Type ({content_type.split(';')[0]})",
                        is_media=False,
                    )
        except Exception:
            pass

    # --- Tier 8: Fallback to JDownloader LinkGrabber ---
    return ClassifyResult(
        url=clean_input,
        target=TargetService.JDOWN,
        confidence=0.60,
        reason="Nierozpoznany schemat - przekazano do LinkGrabbera JDownloader",
        is_media=False,
    )
