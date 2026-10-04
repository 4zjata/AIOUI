import React, { useState, useEffect } from 'react';
import { DownloadTask, TargetService, ToastNotification } from './types';
import { fetchDownloads, pauseTask, resumeTask, deleteTask } from './api/client';
import { Sidebar } from './components/Sidebar';
import { UniversalBar } from './components/UniversalBar';
import { DownloadList } from './components/DownloadList';
import { Toast } from './components/Toast';
import { SettingsModal } from './components/SettingsModal';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // SSE connection for real-time live downloads stream
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let pollInterval: any = null;

    const setupSSE = () => {
      try {
        eventSource = new EventSource('/api/downloads/stream');
        eventSource.onmessage = (event) => {
          try {
            const data: DownloadTask[] = JSON.parse(event.data);
            setTasks(data);
          } catch (e) {
            console.error('SSE parse error:', e);
          }
        };

        eventSource.onerror = () => {
          // If SSE fails or disconnects, fallback to interval polling
          if (eventSource) eventSource.close();
          if (!pollInterval) {
            pollInterval = setInterval(loadTasks, 2500);
          }
        };
      } catch (err) {
        pollInterval = setInterval(loadTasks, 2500);
      }
    };

    const loadTasks = async () => {
      try {
        const data = await fetchDownloads();
        setTasks(data);
      } catch (e) {
        // quiet fallback
      }
    };

    loadTasks();
    setupSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  const handleSuccess = (target: TargetService, message: string, taskId?: string) => {
    const titles: Record<TargetService, string> = {
      qbit: 'Dodano do qBittorrent',
      jdown: 'Dodano do JDownloader',
      ytdlp: 'Rozpoczęto w yt-dlp',
    };

    setToast({
      id: Math.random().toString(),
      title: titles[target] || 'Dodano zadanie',
      message: message,
      target: target,
      taskId: taskId,
    });
  };

  const handleToastClick = () => {
    if (toast?.target) {
      // Navigate to all or the specific service tab
      setActiveTab('all');
    }
    setToast(null);
  };

  const handlePause = async (id: string) => {
    await pauseTask(id);
    const data = await fetchDownloads();
    setTasks(data);
  };

  const handleResume = async (id: string) => {
    await resumeTask(id);
    const data = await fetchDownloads();
    setTasks(data);
  };

  const handleDelete = async (id: string) => {
    await deleteTask(id, false);
    const data = await fetchDownloads();
    setTasks(data);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tasks={tasks}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        padding: '36px 44px',
        overflowY: 'auto',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        {/* Universal Input Bar */}
        <UniversalBar
          onSuccess={handleSuccess}
          onError={(msg) => setErrorMessage(msg)}
        />

        {/* Global Error Banner if any */}
        {errorMessage && (
          <div style={{
            marginBottom: '16px',
            padding: '10px 16px',
            backgroundColor: 'var(--error-bg)',
            color: 'var(--error)',
            borderRadius: '8px',
            border: '1px solid var(--error)',
            fontSize: '13px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 600 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Downloads List */}
        <DownloadList
          tasks={tasks}
          activeTab={activeTab}
          onPause={handlePause}
          onResume={handleResume}
          onDelete={handleDelete}
        />
      </main>

      {/* Corner Toast Notification */}
      <Toast
        toast={toast}
        onClose={() => setToast(null)}
        onClick={handleToastClick}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};
