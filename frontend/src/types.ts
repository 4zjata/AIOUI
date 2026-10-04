export type TargetService = 'qbit' | 'jdown' | 'ytdlp';

export type TaskStatus =
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'error'
  | 'queued'
  | 'checking';

export interface DownloadTask {
  id: string;
  name: string;
  source: TargetService;
  status: TaskStatus;
  progress: number;
  speed: number;
  eta: number | null;
  total_bytes: number | null;
  downloaded_bytes: number | null;
  error_message?: string | null;
  created_at?: number | null;
  file_path?: string | null;
  download_url?: string | null;
}

export interface ClassifyResult {
  url: string;
  target: TargetService;
  confidence: number;
  reason: string;
  is_media: boolean;
  title?: string | null;
  thumbnail?: string | null;
}

export interface AddLinkRequest {
  url: string;
  target?: TargetService;
  format_type?: 'video' | 'audio';
  quality?: 'best' | '1080p' | '720p' | '480p' | '320k';
  download_to_device?: boolean;
  autostart?: boolean;
}

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  target: TargetService;
  taskId?: string;
}
