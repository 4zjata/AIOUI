# Stage 1: Build Frontend SPA
FROM node:22-alpine AS frontend-builder
WORKDIR /build

# Copy package manifests and install
COPY frontend/package*.json ./
RUN npm install

# Copy source and build static bundle
COPY frontend/ ./
RUN npm run build

# Stage 2: Python Backend Runtime with ffmpeg
FROM python:3.12-slim AS runner

# Install system dependencies (ffmpeg is essential for yt-dlp format muxing and audio extraction)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application
COPY backend/ ./backend/

# Copy built frontend from Stage 1 into the location expected by FastAPI
COPY --from=frontend-builder /build/dist ./frontend/dist

# Default downloads storage volume
RUN mkdir -p /downloads
VOLUME ["/downloads"]

ENV PYTHONPATH=/app/backend
ENV HOST=0.0.0.0
ENV PORT=8000
ENV DOWNLOAD_DIR=/downloads

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
