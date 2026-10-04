# AIOUI (All-In-One Unified Downloader UI)

A modern, clean, minimalist unified web dashboard and universal URL bar aggregating multiple download services into a single pane of glass:
- **qBittorrent**: Torrents & magnet links (`/api/v2`).
- **JDownloader 2**: File hosters & direct links via MyJDownloader API.
- **yt-dlp**: Native embedded video/audio downloader with live progress tracking, quality/format selection, and direct device or server download options.

## Features
- **Universal Input Bar**: Paste magnet links, video URLs, direct file hosters, or drag & drop `.torrent` files.
- **Smart Link Classifier**: Automatically identifies the destination service with manual override badges.
- **Modern Minimal UI**: Focused, responsive, dark-mode design adhering to system-palette tokens without generic AI styling cliches.
- **Real-Time Progress**: Live speed, ETA, and progress stats pushed via Server-Sent Events (SSE).
- **Docker-First**: Ready for instant containerized deployment (`docker compose up -d`).

## Quickstart

1. Copy `.env.example` to `.env` and fill in your service credentials:
   ```bash
   cp .env.example .env
   ```
2. Start with Docker Compose:
   ```bash
   docker compose up -d --build
   ```
3. Open `http://localhost:8000` in your browser.

## License
MIT
