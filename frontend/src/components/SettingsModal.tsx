import React, { useEffect, useState } from 'react';
import { fetchStatus } from '../api/client';
import { X, CheckCircle2, Server, ShieldCheck } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchStatus().then(setStatus);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: 'var(--surface)',
        borderRadius: '14px',
        border: '1px solid var(--outline)',
        width: '480px',
        maxWidth: '90%',
        padding: '24px',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>
              Status usług pobierania
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
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
                {status?.qbit_url || 'https://localhost:8080'}
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
                {status?.myjd_email || 'admin@example.com'} (JDownloader@Docker)
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
    </div>
  );
};
