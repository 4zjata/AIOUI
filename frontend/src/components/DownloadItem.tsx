import React, { useState } from 'react';
import { DownloadTask, TargetService, TaskFile } from '../types';
import { fetchTaskFiles } from '../api/client';
import { 
  Anchor, 
  Package, 
  Film, 
  Pause, 
  Play, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Laptop,
  Download,
  Link,
  Check,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';

interface DownloadItemProps {
  task: DownloadTask;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}

export function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function formatEta(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return '--';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export const DownloadItem: React.FC<DownloadItemProps> = ({
  task,
  onPause,
  onResume,
  onDelete,
}) => {
  const getServiceBadge = (source: TargetService) => {
    switch (source) {
      case 'qbit':
        return { label: 'qBit', icon: Anchor, color: 'var(--qbit-accent)', bg: 'var(--qbit-bg)' };
      case 'ytdlp':
        return { label: 'yt-dlp', icon: Film, color: 'var(--ytdlp-accent)', bg: 'var(--ytdlp-bg)' };
      case 'jdown':
      default:
        return { label: 'JD2', icon: Package, color: 'var(--jdown-accent)', bg: 'var(--jdown-bg)' };
    }
  };

  const badge = getServiceBadge(task.source);
  const BadgeIcon = badge.icon;

  const isDownloading = task.status === 'downloading';
  const isPaused = task.status === 'paused';
  const isCompleted = task.status === 'completed';
  const isError = task.status === 'error';
  const [copied, setCopied] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [files, setFiles] = useState<TaskFile[] | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const toggleFiles = async () => {
    if (!showFiles && !files) {
      setLoadingFiles(true);
      try {
        const data = await fetchTaskFiles(task.id);
        setFiles(data);
      } catch (e) {
        // error handling
      } finally {
        setLoadingFiles(false);
      }
    }
    setShowFiles(!showFiles);
  };

  return (
    <div style={{
      backgroundColor: 'var(--surface)',
      borderRadius: '10px',
      border: '1px solid var(--outline-subtle)',
      padding: '14px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      transition: 'border-color 0.15s ease',
    }}>
      {/* Top Row: Service Badge, Name, Status & Action Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 700,
            padding: '3px 7px',
            borderRadius: '5px',
            backgroundColor: badge.bg,
            color: badge.color,
            flexShrink: 0,
          }}>
            <BadgeIcon size={12} />
            {badge.label}
          </span>

          <span style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {task.name}
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {task.download_url && isCompleted && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'var(--surface-high)',
              color: 'var(--primary)',
            }}>
              <Laptop size={12} /> Zapisano lokalnie
            </span>
          )}

          {isCompleted && task.files_count && task.files_count > 1 && (
            <button
              onClick={toggleFiles}
              title="Pokaż listę plików zadania"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '4px',
                backgroundColor: showFiles ? 'var(--primary-container)' : 'var(--surface-high)',
                color: showFiles ? 'var(--primary)' : 'var(--text-muted)',
                border: '1px solid var(--outline-subtle)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <FolderOpen size={12} />
              <span>{task.files_count} plików</span>
              {showFiles ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}

          {isCompleted && (
            <>
              <a
                href={task.download_url || `/api/downloads/${task.id}/file`}
                download
                title="Pobierz plik przez HTTP"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-container)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Download size={15} />
              </a>

              <button
                onClick={() => {
                  const url = `${window.location.origin}${task.download_url || `/api/downloads/${task.id}/file`}`;
                  navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                title={copied ? 'Skopiowano link!' : 'Kopiuj bezpośredni link HTTP'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'none',
                  border: 'none',
                  color: copied ? 'var(--success)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-container)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                {copied ? <Check size={15} /> : <Link size={15} />}
              </button>
            </>
          )}

          {isDownloading && (
            <button
              onClick={() => onPause(task.id)}
              title="Wstrzymaj"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
              }}
            >
              <Pause size={15} />
            </button>
          )}

          {isPaused && (
            <button
              onClick={() => onResume(task.id)}
              title="Wznów"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
              }}
            >
              <Play size={15} />
            </button>
          )}

          <button
            onClick={() => onDelete(task.id)}
            title="Usuń"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-subtle)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--error)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-subtle)')}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{
        width: '100%',
        height: '6px',
        backgroundColor: 'var(--surface-high)',
        borderRadius: '3px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${task.progress}%`,
          height: '100%',
          backgroundColor: isCompleted ? 'var(--success)' : isError ? 'var(--error)' : isPaused ? 'var(--text-muted)' : 'var(--primary)',
          borderRadius: '3px',
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Stats Bottom Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
      }}>
        {/* Progress & Speed */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>
            {task.progress.toFixed(1)}%
          </span>
          {task.speed > 0 && (
            <span>{formatBytes(task.speed)}/s</span>
          )}
          {task.total_bytes && (
            <span>
              {formatBytes(task.downloaded_bytes)} / {formatBytes(task.total_bytes)}
            </span>
          )}
        </div>

        {/* ETA & Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {task.eta !== null && task.eta !== undefined && task.speed > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={11} /> {formatEta(task.eta)}
            </span>
          )}

          {isCompleted && (
            <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle size={12} /> Ukończono
            </span>
          )}

          {isPaused && (
            <span style={{ color: 'var(--text-muted)' }}>Wstrzymano</span>
          )}

          {isError && (
            <span style={{ color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertCircle size={12} /> {task.error_message || 'Błąd'}
            </span>
          )}
        </div>
      </div>

      {/* Expanded Task Files List */}
      {showFiles && (
        <div style={{
          marginTop: '6px',
          padding: '10px 14px',
          backgroundColor: 'var(--surface-container)',
          borderRadius: '8px',
          border: '1px solid var(--outline-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Pliki w zadaniu
          </div>
          {loadingFiles ? (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Wczytywanie listy plików...</div>
          ) : files && files.length > 0 ? (
            files.map((file) => (
              <div
                key={file.index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  gap: '12px',
                  padding: '4px 0',
                  borderBottom: '1px solid var(--outline-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                  <FileText size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
                  <span style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {formatBytes(file.size)}
                  </span>
                  <a
                    href={file.download_url}
                    download
                    title="Pobierz plik przez HTTP"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      color: 'var(--primary)',
                      padding: '3px',
                      textDecoration: 'none',
                    }}
                  >
                    <Download size={13} />
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}${file.download_url}`);
                      setCopiedIndex(file.index);
                      setTimeout(() => setCopiedIndex(null), 2000);
                    }}
                    title="Kopiuj bezpośredni link HTTP"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: copiedIndex === file.index ? 'var(--success)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '3px',
                    }}
                  >
                    {copiedIndex === file.index ? <Check size={13} /> : <Link size={13} />}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Brak plików lub nie można odczytać listy.</div>
          )}
        </div>
      )}
    </div>
  );
};
