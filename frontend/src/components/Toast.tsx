import React, { useEffect } from 'react';
import { ToastNotification } from '../types';
import { Anchor, Package, Film, CheckCircle2, X } from 'lucide-react';

interface ToastProps {
  toast: ToastNotification | null;
  onClose: () => void;
  onClick: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose, onClick }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const getServiceIcon = () => {
    switch (toast.target) {
      case 'qbit':
        return <Anchor size={18} color="var(--qbit-accent)" />;
      case 'ytdlp':
        return <Film size={18} color="var(--ytdlp-accent)" />;
      case 'jdown':
      default:
        return <Package size={18} color="var(--jdown-accent)" />;
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      tabIndex={0}
      className="toast-card"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        backgroundColor: 'var(--surface-high)',
        borderRadius: '10px',
        border: '1px solid var(--outline)',
        padding: '14px 18px',
        boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        cursor: 'pointer',
        zIndex: 100,
        maxWidth: '380px',
        animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        transition: 'transform 0.15s ease, border-color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--primary)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--outline)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '8px',
        backgroundColor: 'var(--surface-container)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {getServiceIcon()}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}>
            {toast.title}
          </span>
          <CheckCircle2 size={13} color="var(--success)" />
        </div>
        <div style={{ fontSize: '12px', color: 'var(--primary)', marginTop: '2px' }}>
          Kliknij, aby przejść do listy pobrań ➔
        </div>
      </div>

      <button
        type="button"
        aria-label="Zamknij powiadomienie"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-subtle)',
          cursor: 'pointer',
          padding: '4px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <X size={15} />
      </button>
    </div>
  );
};
