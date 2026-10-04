import React from 'react';
import { DownloadTask, TargetService } from '../types';
import { 
  Inbox, 
  Anchor, 
  Package, 
  Film, 
  Settings as SettingsIcon,
  HardDrive
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tasks: DownloadTask[];
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  tasks,
  onOpenSettings,
}) => {
  const countActive = (service?: TargetService) => {
    return tasks.filter((t) => {
      const matchService = !service || t.source === service;
      const isActive = t.status === 'downloading' || t.status === 'checking' || t.status === 'queued';
      return matchService && isActive;
    }).length;
  };

  const navItems = [
    { id: 'all', label: 'Wszystkie', icon: Inbox, count: countActive() },
    { id: 'qbit', label: 'qBittorrent', icon: Anchor, count: countActive('qbit'), color: 'var(--qbit-accent)' },
    { id: 'jdown', label: 'JDownloader', icon: Package, count: countActive('jdown'), color: 'var(--jdown-accent)' },
    { id: 'ytdlp', label: 'yt-dlp Media', icon: Film, count: countActive('ytdlp'), color: 'var(--ytdlp-accent)' },
  ];

  return (
    <aside style={{
      width: '260px',
      height: '100vh',
      backgroundColor: 'var(--surface)',
      borderRight: '1px solid var(--outline-subtle)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* App Branding */}
      <div style={{
        padding: '24px 20px',
        borderBottom: '1px solid var(--outline-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{
          width: '34px',
          height: '34px',
          borderRadius: '8px',
          backgroundColor: 'var(--primary-container)',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <HardDrive size={18} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.3px', color: 'var(--text)' }}>
            AIOUI
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Unified Downloader
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ padding: '4px 12px', fontSize: '11px', fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          Kolejka pobrań
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isActive ? 'var(--surface-high)' : 'transparent',
                color: isActive ? 'var(--text)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontWeight: isActive ? 600 : 500,
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'var(--surface-container)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Icon size={18} color={item.color || (isActive ? 'var(--primary)' : 'var(--text-muted)')} />
                <span>{item.label}</span>
              </div>
              {item.count > 0 && (
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '12px',
                  backgroundColor: isActive ? 'var(--primary)' : 'var(--surface-highest)',
                  color: isActive ? 'var(--on-primary)' : 'var(--text)',
                }}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}

        <div style={{ padding: '16px 12px 4px', fontSize: '11px', fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          Pobrane
        </div>

        <button
          onClick={() => onTabChange('files')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'files' ? 'var(--surface-high)' : 'transparent',
            color: activeTab === 'files' ? 'var(--text)' : 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            fontWeight: activeTab === 'files' ? 600 : 500,
            textAlign: 'left',
          }}
          onMouseEnter={(e) => {
            if (activeTab !== 'files') e.currentTarget.style.backgroundColor = 'var(--surface-container)';
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'files') e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <HardDrive size={18} color={activeTab === 'files' ? 'var(--primary)' : 'var(--text-muted)'} />
            <span>Pliki na serwerze</span>
          </div>
        </button>
      </nav>

      {/* Footer / Settings */}
      <div style={{
        padding: '16px 12px',
        borderTop: '1px solid var(--outline-subtle)',
      }}>
        <button
          onClick={onOpenSettings}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            padding: '10px 14px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-container)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <SettingsIcon size={18} />
          <span>Ustawienia usług</span>
        </button>
      </div>
    </aside>
  );
};
