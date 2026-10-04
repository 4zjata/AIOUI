import React, { useState, useEffect } from 'react';
import { ServerFile } from '../types';
import { fetchServerFiles, deleteServerFile } from '../api/client';
import { formatBytes } from './DownloadItem';
import { 
  FolderDown, 
  Film, 
  Music, 
  Archive, 
  FileText, 
  Download, 
  Link, 
  Trash2, 
  Search, 
  RotateCw,
  Check
} from 'lucide-react';

interface FilesBrowserProps {
  onNotify: (msg: string) => void;
}

export const FilesBrowser: React.FC<FilesBrowserProps> = ({ onNotify }) => {
  const [files, setFiles] = useState<ServerFile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const data = await fetchServerFiles();
      setFiles(data);
    } catch (e: any) {
      onNotify('Błąd pobierania listy plików z serwera');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleCopyLink = (file: ServerFile) => {
    const fullUrl = `${window.location.origin}${file.download_url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedPath(file.path);
    onNotify('Skopiowano bezpośredni link HTTP do schowka!');
    setTimeout(() => setCopiedPath(null), 2500);
  };

  const handleDelete = async (file: ServerFile) => {
    if (window.confirm(`Czy na pewno chcesz usunąć plik "${file.name}" z dysku serwera?`)) {
      const ok = await deleteServerFile(file.path);
      if (ok) {
        onNotify(`Usunięto plik ${file.name}`);
        loadFiles();
      } else {
        onNotify('Nie udało się usunąć pliku');
      }
    }
  };

  const getFileIcon = (ext: string) => {
    if (['.mp4', '.mkv', '.webm', '.avi', '.mov'].includes(ext)) {
      return <Film size={18} color="var(--ytdlp-accent)" />;
    }
    if (['.mp3', '.flac', '.wav', '.m4a', '.ogg', '.opus'].includes(ext)) {
      return <Music size={18} color="var(--primary)" />;
    }
    if (['.zip', '.rar', '.7z', '.tar', '.gz', '.iso'].includes(ext)) {
      return <Archive size={18} color="var(--jdown-accent)" />;
    }
    return <FileText size={18} color="var(--text-muted)" />;
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp * 1000);
    return d.toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top bar: title, search, refresh */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>
            Pliki na serwerze
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '8px' }}>
              ({files.length} plików)
            </span>
          </h2>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Wszystkie ukończone pliki serwowane bezpośrednio przez HTTP
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--surface)',
            borderRadius: '8px',
            border: '1px solid var(--outline)',
            padding: '4px 10px',
            width: '240px',
          }}>
            <Search size={14} color="var(--text-subtle)" style={{ marginRight: '8px' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtruj pliki..."
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text)',
                outline: 'none',
                fontSize: '12px',
                width: '100%',
              }}
            />
          </div>

          <button
            onClick={loadFiles}
            title="Odśwież listę"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--outline)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <RotateCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Files List */}
      {filteredFiles.length === 0 ? (
        <div style={{
          padding: '48px 24px',
          textAlign: 'center',
          backgroundColor: 'var(--surface)',
          borderRadius: '12px',
          border: '1px dashed var(--outline-subtle)',
          color: 'var(--text-muted)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}>
          <FolderDown size={32} color="var(--text-subtle)" />
          <div>Brak plików w katalogu pobierania</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredFiles.map((file) => (
            <div
              key={file.path}
              style={{
                backgroundColor: 'var(--surface)',
                borderRadius: '8px',
                border: '1px solid var(--outline-subtle)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                transition: 'border-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--outline)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--outline-subtle)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--surface-container)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {getFileIcon(file.extension)}
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {file.name}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    marginTop: '2px',
                  }}>
                    {formatBytes(file.size)} • {formatDate(file.modified_at)}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {/* Download via HTTP Button */}
                <a
                  href={file.download_url}
                  download={file.name}
                  title="Pobierz plik przez HTTP"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--primary-container)',
                    color: 'var(--primary)',
                    textDecoration: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    transition: 'all 0.15s',
                  }}
                >
                  <Download size={14} />
                  <span>Pobierz</span>
                </a>

                {/* Copy direct HTTP link */}
                <button
                  type="button"
                  onClick={() => handleCopyLink(file)}
                  title="Kopiuj bezpośredni link HTTP"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--surface-high)',
                    border: '1px solid var(--outline-subtle)',
                    color: copiedPath === file.path ? 'var(--success)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    transition: 'all 0.15s',
                  }}
                >
                  {copiedPath === file.path ? <Check size={14} /> : <Link size={14} />}
                  <span>{copiedPath === file.path ? 'Skopiowano' : 'Link'}</span>
                </button>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleDelete(file)}
                  title="Usuń plik z serwera"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-subtle)',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '6px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--error)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-subtle)')}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
