import { AddLinkRequest, ClassifyResult, DownloadTask, TaskFile } from '../types';

const API_BASE = '/api';

export async function classifyUrl(url: string, signal?: AbortSignal): Promise<ClassifyResult> {
  const res = await fetch(`${API_BASE}/classify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
    signal,
  });
  if (!res.ok) {
    throw new Error(`Błąd klasyfikacji: ${res.statusText}`);
  }
  return res.json();
}

export async function addDownload(data: AddLinkRequest): Promise<{ success: boolean; message: string; target: string; task_id?: string }> {
  const res = await fetch(`${API_BASE}/downloads/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Błąd dodawania zadania: ${res.statusText}`);
  }
  return res.json();
}

export async function uploadTorrentFile(file: File): Promise<{ success: boolean; message: string; target: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/downloads/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    throw new Error(`Błąd wgrywania pliku: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchDownloads(): Promise<DownloadTask[]> {
  const res = await fetch(`${API_BASE}/downloads`);
  if (!res.ok) {
    throw new Error(`Błąd pobierania listy: ${res.statusText}`);
  }
  return res.json();
}

export async function pauseTask(taskId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/downloads/${taskId}/pause`, { method: 'POST' });
  return res.ok;
}

export async function resumeTask(taskId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/downloads/${taskId}/resume`, { method: 'POST' });
  return res.ok;
}

export async function deleteTask(taskId: string, deleteFiles: boolean = false): Promise<boolean> {
  const res = await fetch(`${API_BASE}/downloads/${taskId}?delete_files=${deleteFiles}`, {
    method: 'DELETE',
  });
  return res.ok;
}

export async function fetchTaskFiles(taskId: string): Promise<TaskFile[]> {
  const res = await fetch(`${API_BASE}/downloads/${taskId}/files`);
  if (!res.ok) {
    throw new Error(`Błąd pobierania listy plików zadania: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchStatus(): Promise<any> {
  const res = await fetch(`${API_BASE}/status`);
  if (!res.ok) return null;
  return res.json();
}
