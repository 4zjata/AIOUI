import React, { useState, useEffect, useRef } from 'react';
import { TargetService } from '../types';
import { classifyUrl, addDownload, uploadTorrentFile } from '../api/client';
import { FormatDrawer } from './FormatDrawer';
import { 
  ArrowRight, 
  Anchor, 
  Package, 
  Film, 
  ChevronDown, 
  Link as LinkIcon
} from 'lucide-react';

interface UniversalBarProps {
  onSuccess: (target: TargetService, message: string, taskId?: string) => void;
  onError: (msg: string) => void;
}

export const UniversalBar: React.FC<UniversalBarProps> = ({ onSuccess, onError }) => {
  const [inputVal, setInputVal] = useState('');
  const [detectedTarget, setDetectedTarget] = useState<TargetService | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<TargetService | null>(null);
  const [showOverrideMenu, setShowOverrideMenu] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // yt-dlp specific options
  const [formatType, setFormatType] = useState<'video' | 'audio'>('video');
  const [quality, setQuality] = useState<'best' | '1080p' | '720p' | '480p' | '320k'>('best');
  const [downloadToDevice, setDownloadToDevice] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Global hotkey '/' to focus search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced auto-classification
  useEffect(() => {
    const trimmed = inputVal.trim();
    if (!trimmed) {
      setDetectedTarget(null);
      setOverrideTarget(null);
      return;
    }

    // Fast-path client-side classification
    if (trimmed.startsWith('magnet:') || /^[0-9a-fA-F]{40}$/.test(trimmed) || /^[2-7a-zA-Z]{32}$/.test(trimmed)) {
      setDetectedTarget('qbit');
      return;
    }
    if (/youtube\.com|youtu\.be|tiktok\.com|twitter\.com|x\.com|soundcloud\.com|vimeo\.com|twitch\.tv/.test(trimmed)) {
      setDetectedTarget('ytdlp');
      return;
    }
    if (/rapidgator|mega\.nz|1fichier|mediafire|turbobit|ddownload/.test(trimmed)) {
      setDetectedTarget('jdown');
      return;
    }

    // Query backend classifier
    const timer = setTimeout(async () => {
      try {
        const res = await classifyUrl(trimmed);
        setDetectedTarget(res.target);
      } catch (err) {
        // Fallback default
        setDetectedTarget('jdown');
      } finally {
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [inputVal]);

  const activeTarget: TargetService = overrideTarget || detectedTarget || 'jdown';

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const res = await addDownload({
        url: trimmed,
        target: activeTarget,
        format_type: formatType,
        quality: quality,
        download_to_device: downloadToDevice,
        autostart: true,
      });

      if (res.success) {
        onSuccess(activeTarget, res.message, res.task_id);
        // Clear input bar on success
        setInputVal('');
        setDetectedTarget(null);
        setOverrideTarget(null);
      } else {
        onError(res.message || 'Nie udało się dodać pobierania');
      }
    } catch (err: any) {
      onError(err.message || 'Wystąpił błąd podczas dodawania zadania');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Drag and Drop handler for .torrent files
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      try {
        setIsSubmitting(true);
        const res = await uploadTorrentFile(file);
        if (res.success) {
          onSuccess('qbit', res.message);
        } else {
          onError(res.message);
        }
      } catch (err: any) {
        onError(err.message);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const getServiceBadge = () => {
    switch (activeTarget) {
      case 'qbit':
        return { label: 'qBittorrent', icon: Anchor, color: 'var(--qbit-accent)', bg: 'var(--qbit-bg)' };
      case 'ytdlp':
        return { label: 'yt-dlp Media', icon: Film, color: 'var(--ytdlp-accent)', bg: 'var(--ytdlp-bg)' };
      case 'jdown':
      default:
        return { label: 'JDownloader', icon: Package, color: 'var(--jdown-accent)', bg: 'var(--jdown-bg)' };
    }
  };

  const badge = getServiceBadge();
  const BadgeIcon = badge.icon;

  return (
    <div 
      style={{ width: '100%', marginBottom: '24px' }}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <form 
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'var(--surface)',
          borderRadius: '12px',
          border: `1.5px solid ${isDragging ? 'var(--primary)' : 'var(--outline)'}`,
          padding: '6px 8px 6px 16px',
          boxShadow: isDragging ? '0 0 15px rgba(194, 193, 255, 0.15)' : 'none',
          transition: 'all 0.2s ease',
          position: 'relative',
        }}
      >
        <LinkIcon size={18} color="var(--text-subtle)" style={{ marginRight: '12px', flexShrink: 0 }} />

        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder={isDragging ? 'Upuść plik .torrent tutaj...' : 'Wklej link (magnet, wideo, hosting) lub upuść plik .torrent (Naciśnij /)...'}
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--text)',
            outline: 'none',
            fontSize: '14px',
          }}
        />

        {/* Target Service Badge & Override Dropdown */}
        {inputVal.trim() && (
          <div style={{ position: 'relative', marginRight: '8px' }}>
            <button
              type="button"
              onClick={() => setShowOverrideMenu(!showOverrideMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                borderRadius: '6px',
                backgroundColor: badge.bg,
                color: badge.color,
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <BadgeIcon size={14} />
              <span>{badge.label}</span>
              <ChevronDown size={12} />
            </button>

            {/* Dropdown Menu */}
            {showOverrideMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '6px',
                backgroundColor: 'var(--surface-container)',
                borderRadius: '8px',
                border: '1px solid var(--outline)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                zIndex: 50,
                padding: '4px',
                display: 'flex',
                flexDirection: 'column',
                minWidth: '150px',
              }}>
                <div style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Wymuś klienta:
                </div>
                {[
                  { id: 'qbit', label: 'qBittorrent', icon: Anchor, color: 'var(--qbit-accent)' },
                  { id: 'ytdlp', label: 'yt-dlp Media', icon: Film, color: 'var(--ytdlp-accent)' },
                  { id: 'jdown', label: 'JDownloader', icon: Package, color: 'var(--jdown-accent)' },
                ].map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setOverrideTarget(item.id as TargetService);
                        setShowOverrideMenu(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 8px',
                        border: 'none',
                        borderRadius: '4px',
                        backgroundColor: activeTarget === item.id ? 'var(--surface-high)' : 'transparent',
                        color: item.color,
                        cursor: 'pointer',
                        fontSize: '12px',
                        textAlign: 'left',
                      }}
                    >
                      <ItemIcon size={14} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Submit Action Button */}
        <button
          type="submit"
          disabled={!inputVal.trim() || isSubmitting}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: inputVal.trim() ? 'var(--primary)' : 'var(--surface-high)',
            color: inputVal.trim() ? 'var(--on-primary)' : 'var(--text-subtle)',
            cursor: inputVal.trim() ? 'pointer' : 'default',
            transition: 'all 0.15s ease',
            flexShrink: 0,
          }}
        >
          <ArrowRight size={18} />
        </button>
      </form>

      {/* yt-dlp Format and Quality Drawer */}
      {inputVal.trim() && activeTarget === 'ytdlp' && (
        <FormatDrawer
          formatType={formatType}
          onFormatChange={setFormatType}
          quality={quality}
          onQualityChange={setQuality}
          downloadToDevice={downloadToDevice}
          onDownloadToDeviceChange={setDownloadToDevice}
        />
      )}
    </div>
  );
};
