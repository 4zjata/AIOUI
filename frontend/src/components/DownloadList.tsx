import React from 'react';
import { DownloadTask } from '../types';
import { DownloadItem } from './DownloadItem';
import { ArrowDownToLine } from 'lucide-react';

interface DownloadListProps {
  tasks: DownloadTask[];
  activeTab: string;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}

export const DownloadList: React.FC<DownloadListProps> = ({
  tasks,
  activeTab,
  onPause,
  onResume,
  onDelete,
}) => {
  const filteredTasks = tasks.filter((t) => {
    if (activeTab === 'all') return true;
    return t.source === activeTab;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>
          {activeTab === 'all' && 'Wszystkie zadania'}
          {activeTab === 'qbit' && 'Pobierania qBittorrent'}
          {activeTab === 'jdown' && 'Pakiety JDownloader'}
          {activeTab === 'ytdlp' && 'Materiały yt-dlp'}
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '8px' }}>
            ({filteredTasks.length})
          </span>
        </h2>
      </div>

      {filteredTasks.length === 0 ? (
        <div style={{
          padding: '48px 24px',
          textAlign: 'center',
          backgroundColor: 'var(--surface)',
          borderRadius: '12px',
          border: '1px dashed var(--outline-subtle)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          color: 'var(--text-muted)',
        }}>
          <ArrowDownToLine size={32} color="var(--text-subtle)" />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
              Kolejka jest pusta
            </div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              Wklej link w pasku na górze lub przeciągnij plik .torrent w dowolne miejsce ekranu.
            </div>
          </div>
        </div>
      ) : (
        filteredTasks.map((task) => (
          <DownloadItem
            key={task.id}
            task={task}
            onPause={onPause}
            onResume={onResume}
            onDelete={onDelete}
          />
        ))
      )}
    </div>
  );
};
