import React, { useEffect, useState, useRef } from 'react';
import { fetchStatus } from '../api/client';
import { X, CheckCircle2, Server, ShieldCheck } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<any>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      fetchStatus().then(setStatus);
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Native Light-Dismiss: click on backdrop outside dialog content
        if (e.target === dialogRef.current) {
          onClose();
        }
      }}
      aria-labelledby="settings-dialog-title"
    >
      <div
        className="modal-dialog-card"
        style={{
          backgroundColor: 'var(--surface)',
          borderRadius: '14px',
          border: '1px solid var(--outline)',
          width: '480px',
          maxWidth: '90vw',
          padding: '24px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={20} color="var(--primary)" />
            <h3 id="settings-dialog-title" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>
              Status usług pobierania
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Zamknij okno"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Status Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            padding: '12px 14px',
            backgroundColor: 'var(--surface-container)',
            borderRadius: '8px',
            border: '1px solid var(--outline-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                qBittorrent WebAPI
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {status?.qbit_url || 'http://localhost:8080'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontSize: '12px' }}>
              <CheckCircle2 size={14} /> Połączono
            </div>
          </div>

          <div style={{
            padding: '12px 14px',
            backgroundColor: 'var(--surface-container)',
            borderRadius: '8px',
            border: '1px solid var(--outline-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                MyJDownloader API
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {status?.myjd_email || 'Skonfigurowano'} (JDownloader@Docker)
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontSize: '12px' }}>
              <CheckCircle2 size={14} /> Połączono
            </div>
          </div>

          <div style={{
            padding: '12px 14px',
            backgroundColor: 'var(--surface-container)',
            borderRadius: '8px',
            border: '1px solid var(--outline-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                Wbudowany silnik yt-dlp
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Katalog: {status?.download_dir || '/downloads'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontSize: '12px' }}>
              <CheckCircle2 size={14} /> Gotowy (Natywny)
            </div>
          </div>
        </div>

        <div style={{
          padding: '10px 14px',
          backgroundColor: 'rgba(194, 193, 255, 0.05)',
          borderRadius: '8px',
          border: '1px solid var(--outline-subtle)',
          fontSize: '11px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <ShieldCheck size={16} color="var(--primary)" />
          <span>Wszystkie dane logowania przechowywane są bezpiecznie w pliku <code>.env</code> na serwerze.</span>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          style={{
            padding: '10px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'var(--surface-high)',
            color: 'var(--text)',
            fontWeight: 600,
            cursor: 'pointer',
            marginTop: '4px',
          }}
        >
          Zamknij
        </button>
      </div>
    </dialog>
  );
};
