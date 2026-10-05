import React, { useState, useEffect, useRef } from 'react';
import { DownloadTask, TargetService, ToastNotification } from './types';
import { fetchDownloads, pauseTask, resumeTask, deleteTask } from './api/client';
import { Sidebar } from './components/Sidebar';
import { UniversalBar } from './components/UniversalBar';
import { DownloadList } from './components/DownloadList';
import { Toast } from './components/Toast';
import { SettingsModal } from './components/SettingsModal';
import { Menu, HardDrive, Settings as SettingsIcon } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Set of task IDs that the user explicitly requested to download to their device in this session
  const pendingDeviceTasksRef = useRef<Set<string>>(new Set());

  // Watch tasks for completion ONLY for explicitly requested device downloads
  useEffect(() => {
    tasks.forEach((task) => {
      if (
        task.status === 'completed' &&
        task.download_url &&
        pendingDeviceTasksRef.current.has(task.id)
      ) {
        pendingDeviceTasksRef.current.delete(task.id);
        
        // Trigger browser native download once
        const link = document.createElement('a');
        link.href = task.download_url;
        link.download = task.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setToast({
          id: Math.random().toString(),
          title: 'Pobieranie zakończone',
          message: `Plik "${task.name}" został automatycznie zapisany na Twoim komputerze.`,
          target: task.source,
          taskId: task.id,
        });
      }
    });
  }, [tasks]);

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
          if (eventSource) eventSource.close();
          if (!pollInterval) {
            pollInterval = setInterval(loadTasks, 2000);
          }
        };
      } catch (err) {
        pollInterval = setInterval(loadTasks, 2000);
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

  const handleSuccess = (
    target: TargetService,
    message: string,
    taskId?: string,
    downloadToDevice?: boolean
  ) => {
    if (taskId && downloadToDevice) {
      pendingDeviceTasksRef.current.add(taskId);
    }

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
    setActiveTab('all');
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
    <div className="app-layout">
      {/* Mobile Top Header (visible on screens <= 768px) */}
      <header className="mobile-header">
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen(true)}
          aria-label="Otwórz menu boczne"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text)',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
          }}
        >
          <Menu size={22} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            backgroundColor: 'var(--primary-container)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <HardDrive size={15} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text)' }}>
            AIOUI
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          aria-label="Ustawienia usług"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
          }}
        >
          <SettingsIcon size={20} />
        </button>
      </header>

      {/* Sidebar (Desktop fixed sidebar / Mobile slide-out drawer) */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tasks={tasks}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {/* Universal Input Bar */}
        <UniversalBar
          onSuccess={handleSuccess}
          onError={(msg) => setErrorMessage(msg)}
        />

        {/* Global Error Banner if any */}
        {errorMessage && (
          <div
            role="alert"
            style={{
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
            }}
          >
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              aria-label="Zamknij komunikat o błędzie"
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 600, padding: '2px 6px' }}
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
