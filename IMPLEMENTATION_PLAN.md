# AIOUI - Plan Implementacji i Śledzenie Postępów

## 1. Założenia Architektoniczne
- **Cel**: Zunifikowany interfejs (Web Dashboard + Universal Input Bar) integrujący qBittorrent, JDownloader 2 (MyJDownloader API) oraz wbudowany silnik yt-dlp.
- **Frontend**: Nowoczesny, minimalistyczny interfejs (Vite + React + TypeScript) zgodny z zasadami `unslop-ui` i paletą systemową `~/.config/hypr/scheme/current.lua`.
- **Backend**: FastAPI (Python 3.12+) ze zintegrowanymi klientami API, wbudowanym silnikiem `yt-dlp` z natywnymi callbackami postępu, klasyfikatorem linków (Tiers 0–8) oraz strumieniowaniem SSE.
- **Deployment**: Docker Multi-stage build (`Dockerfile` + `docker-compose.yml`) umożliwiający natychmiastowe uruchomienie na serwerze przez `git pull && docker compose up -d --build`.

---

## 2. Krok po kroku - Lista Zadań (Task Checklist)

### Faza 1: Baza Projektu i Specyfikacja
- [x] Utworzenie publicznego repozytorium GitHub (`https://github.com/4zjata/AIOUI`).
- [x] Ochrona danych wrażliwych: `.gitignore`, `.env.example`, lokalny `.env`.
- [x] Weryfikacja działania MyJDownloader API dla konta użytkownika (`JDownloader@Docker` wykryty i połączony).
- [x] Szczegółowe zaprojektowanie algorytmu wyboru downloadera z bezwzględnym priorytetem dla `yt-dlp` przy multimediach.
- [x] Zapisanie `IMPLEMENTATION_PLAN.md`.

### Faza 2: Backend (FastAPI, Silniki Pobierania, Klasyfikator)
- [x] Konfiguracja zależności backendu (`requirements.txt`, `pyproject.toml`).
- [x] Modele Pydantic: `DownloadTask`, `DownloadStatus`, `AddLinkRequest`, `ClassifyResult`.
- [x] Smart Link Classifier:
  - Poziom 0: Pliki `.torrent` i MIME / Bencode.
  - Poziom 1: Linki `magnet:` i InfoHash SHA1/Base32.
  - Poziom 2: Wzorce `.torrent` w URL trackerów.
  - Poziom 3: Fast-Path dla głównych platform wideo/audio.
  - Poziom 4: Baza popularnych hostingów plików (Rapidgator, Mega, 1fichier itp.).
  - Poziom 5: Weryfikacja rozszerzeń w ścieżce (media vs archiwa/binaria).
  - Poziom 6: Baza 1900+ oficjalnych ekstraktorów `yt-dlp` zaindeksowana w pamięci RAM.
  - Poziom 7: Asynchroniczny HTTP HEAD Probe (z timeoutem 1.5s).
  - Poziom 8: Fallback do LinkGrabbera JDownloader 2.
- [x] Klient qBittorrent WebAPI v2: logowanie, dodawanie magnet/torrent, odczyt stanu, pauza/wznowienie/kasowanie.
- [x] Klient MyJDownloader: dodawanie linków do linkgrabbera z autostartem, odpytywanie o stan pobrań, kontrola.
- [x] Silnik yt-dlp: kolejka pobierania w tle, `progress_hooks`, wybór formatu/jakości, obsługa opcji pobierania bezpośrednio na urządzenie użytkownika (strumieniowanie pliku z endpointu).
- [x] Aggregator & SSE Engine: ujednolicona lista pobrań wysyłana w strumieniu Server-Sent Events do przeglądarki.
- [x] Testy jednostkowe backendu i klasyfikatora.

### Faza 3: Frontend (Clean Minimal UI, unslop-ui)
- [x] Inicjalizacja projektu Vite + React + TypeScript w `frontend/`.
- [x] Konfiguracja stylistyki CSS (paleta z `current.lua`: ciemny grafit `#131317`, powierzchnie `#1c1b1f`, akcent `#c2c1ff`, wyraźne stany fokusu, brak AI-slop).
- [x] Universal Input Bar:
  - Automatyczny fokus po naciśnięciu `/` lub globalnym wklejeniu `Ctrl+V`.
  - Strefa Drag & Drop dla plików `.torrent`.
  - Klikalna odznaka docelowego klienta (`qBit` / `yt-dlp` / `JD`) z opcją ręcznego przełączenia (Override).
- [x] Format & Quality Drawer dla yt-dlp:
  - Wybór wideo vs tylko audio.
  - Wybór jakości (Najlepsza, 1080p, 720p itp.).
  - Checkbox `[ ] Pobierz bezpośrednio na ten komputer` (wyzwalający automatyczne pobranie w przeglądarce).
- [x] System powiadomień (Toast) w rogu ekranu po dodaniu linku z klikalnym przejściem do listy.
- [x] Zunifikowana lista pobrań (Unified Downloads Table/Cards):
  - Spójny wskaźnik postępu (pasek %), prędkości (MB/s), ETA, rozmiaru, statusu.
  - Szybkie akcje (pauza, wznowienie, usuń).
  - Filtrowanie według zakładek w sidebarze (Wszystkie, qBittorrent, JDownloader, yt-dlp).
- [x] Obsługa Server-Sent Events (SSE) dla aktualizacji na żywo bez odświeżania strony.

### Faza 4: Docker i Integracja
- [x] `Dockerfile` (multi-stage build kompilujący frontend i uruchamiający FastAPI z `ffmpeg` i `yt-dlp`).
- [x] `docker-compose.yml` z konfiguracją portu, wolumenu `/downloads` i pliku `.env`.
- [x] Weryfikacja audytu `unslop-ui` (vibe score: 0, zero tells detected).
- [x] Push zmian do repozytorium GitHub `4zjata/AIOUI`.
