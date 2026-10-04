"""Fast-path and deep matcher for yt-dlp supported video/audio extractors."""
from typing import Optional, Tuple
import urllib.parse
import yt_dlp

# Highly popular fast-path domains (immediate match < 0.1ms)
FAST_PATH_MEDIA_DOMAINS = {
    # YouTube
    "youtube.com", "youtu.be", "m.youtube.com", "music.youtube.com",
    # Short-form & Social
    "tiktok.com", "vm.tiktok.com",
    "instagram.com", "threads.net",
    "twitter.com", "x.com", "t.co",
    "facebook.com", "fb.watch", "m.facebook.com",
    "reddit.com", "v.redd.it",
    # Streaming & Video Hosting
    "vimeo.com", "player.vimeo.com",
    "twitch.tv", "clips.twitch.tv",
    "dailymotion.com", "dai.ly",
    "bilibili.com", "bilibili.tv",
    "rumble.com",
    "streamable.com",
    "loom.com",
    "odysee.com",
    "kick.com",
    # Audio & Podcasts
    "soundcloud.com", "m.soundcloud.com",
    "bandcamp.com",
    "mixcloud.com",
    "audiomack.com",
    "anchor.fm",
    "podcasts.apple.com",
}

# Cache extractors list once in memory
_CACHED_EXTRACTORS = [ie for ie in yt_dlp.extractor.gen_extractors() if ie.IE_NAME != "generic"]


def is_fast_path_media(hostname: str) -> bool:
    """Check if hostname matches the curated popular video/audio domains."""
    if not hostname:
        return False
    hostname = hostname.lower()
    if hostname in FAST_PATH_MEDIA_DOMAINS:
        return True
    parts = hostname.split(".")
    for i in range(1, len(parts) - 1):
        parent = ".".join(parts[i:])
        if parent in FAST_PATH_MEDIA_DOMAINS:
            return True
    return False


def match_ytdlp_extractor(url: str) -> Optional[str]:
    """
    Check if any of the ~1900 official yt-dlp extractors supports this URL.
    Returns the extractor name (e.g. 'youtube', 'tiktok', 'vimeo') or None.
    """
    try:
        parsed = urllib.parse.urlparse(url)
        hostname = (parsed.hostname or "").lower()
        if is_fast_path_media(hostname):
            return "fast_path_media"
    except Exception:
        pass

    for ie in _CACHED_EXTRACTORS:
        try:
            if ie.suitable(url):
                return ie.IE_NAME
        except Exception:
            continue
    return None
