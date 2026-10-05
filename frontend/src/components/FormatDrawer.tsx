import React from 'react';
import { Video, Music, Laptop, Server } from 'lucide-react';

interface FormatDrawerProps {
  formatType: 'video' | 'audio';
  onFormatChange: (format: 'video' | 'audio') => void;
  quality: string;
  onQualityChange: (quality: any) => void;
  downloadToDevice: boolean;
  onDownloadToDeviceChange: (val: boolean) => void;
  videoTitle?: string | null;
  thumbnailUrl?: string | null;
}

export const FormatDrawer: React.FC<FormatDrawerProps> = ({
  formatType,
  onFormatChange,
  quality,
  onQualityChange,
  downloadToDevice,
  onDownloadToDeviceChange,
  videoTitle,
  thumbnailUrl,
}) => {
  return (
    <div style={{
      marginTop: '10px',
      padding: '14px 18px',
      backgroundColor: 'var(--surface-container)',
      borderRadius: '10px',
      border: '1px solid var(--outline-subtle)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      animation: 'fadeIn 0.2s ease',
    }}>
      {/* Optional Metadata Preview */}
      {videoTitle && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--outline-subtle)' }}>
          {thumbnailUrl && (
            <img 
              src={thumbnailUrl} 
              alt={videoTitle || "Miniatura wideo"}
              loading="lazy"
              decoding="async"
              style={{ width: '64px', height: '36px', borderRadius: '4px', objectFit: 'cover' }} 
            />
          )}
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {videoTitle}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        {/* Format & Quality Pickers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {/* Format Segmented Button */}
          <div
            role="group"
            aria-label="Format pobierania"
            style={{
              display: 'inline-flex',
              backgroundColor: 'var(--surface-high)',
              borderRadius: '6px',
              padding: '2px',
              border: '1px solid var(--outline-subtle)',
            }}
          >
            <button
              type="button"
              aria-pressed={formatType === 'video'}
              onClick={() => {
                onFormatChange('video');
                if (quality === '320k') onQualityChange('best');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '5px',
                border: 'none',
                backgroundColor: formatType === 'video' ? 'var(--primary-container)' : 'transparent',
                color: formatType === 'video' ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontWeight: formatType === 'video' ? 600 : 400,
                fontSize: '12px',
                transition: 'all 0.15s ease',
              }}
            >
              <Video size={14} />
              <span>Wideo (MP4)</span>
            </button>

            <button
              type="button"
              aria-pressed={formatType === 'audio'}
              onClick={() => {
                onFormatChange('audio');
                onQualityChange('320k');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '5px',
                border: 'none',
                backgroundColor: formatType === 'audio' ? 'var(--primary-container)' : 'transparent',
                color: formatType === 'audio' ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontWeight: formatType === 'audio' ? 600 : 400,
                fontSize: '12px',
                transition: 'all 0.15s ease',
              }}
            >
              <Music size={14} />
              <span>Tylko Audio (MP3)</span>
            </button>
          </div>

          {/* Quality Select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="quality-select" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Jakość:</label>
            <select
              id="quality-select"
              value={quality}
              onChange={(e) => onQualityChange(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                backgroundColor: 'var(--surface-high)',
                color: 'var(--text)',
                border: '1px solid var(--outline-subtle)',
                outline: 'none',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {formatType === 'video' ? (
                <>
                  <option value="best">Najlepsza (Auto / Max)</option>
                  <option value="1080p">1080p Full HD</option>
                  <option value="720p">720p HD</option>
                  <option value="480p">480p SD</option>
                </>
              ) : (
                <>
                  <option value="320k">320 kbps (Najwyższa)</option>
                  <option value="192k">192 kbps (Standard)</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Checkbox: Download directly to this device */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          userSelect: 'none',
          fontSize: '12px',
          color: downloadToDevice ? 'var(--primary)' : 'var(--text-muted)',
          backgroundColor: downloadToDevice ? 'rgba(194, 193, 255, 0.08)' : 'transparent',
          padding: '6px 10px',
          borderRadius: '6px',
          border: `1px solid ${downloadToDevice ? 'var(--primary-container)' : 'transparent'}`,
          transition: 'all 0.15s ease',
        }}>
          <input
            type="checkbox"
            checked={downloadToDevice}
            onChange={(e) => onDownloadToDeviceChange(e.target.checked)}
            style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
          />
          {downloadToDevice ? <Laptop size={14} /> : <Server size={14} />}
          <span>Pobierz bezpośrednio na ten komputer</span>
        </label>
      </div>
    </div>
  );
};
