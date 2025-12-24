import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, CheckCircle, Clock } from 'lucide-react';
import { fetchTaskQueueStatus, TaskQueueStatus as TaskQueueStatusType, QueuedTask } from '@/api/taskQueue';

const POLL_INTERVAL = 3000;

export function TaskQueueStatus() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<TaskQueueStatusType | null>(null);
  const [showPopover, setShowPopover] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await fetchTaskQueueStatus();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch task queue status:', error);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Listen for manual refresh events
  useEffect(() => {
    const handleRefresh = () => {
      fetchStatus();
    };
    window.addEventListener('task-queue-refresh', handleRefresh);
    return () => window.removeEventListener('task-queue-refresh', handleRefresh);
  }, [fetchStatus]);

  if (!status) {
    return null;
  }

  const { currentTask, queuedTasks } = status;
  const isIdle = !currentTask && queuedTasks.length === 0;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString();
  };

  const getTaskTypeLabel = (type: 'scheduled' | 'manual') => {
    return type === 'scheduled' ? t('taskQueue.scheduled') : t('taskQueue.manual');
  };

  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowPopover(true)}
      onMouseLeave={() => setShowPopover(false)}
    >
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 hover:bg-muted cursor-default transition-colors">
        {isIdle ? (
          <>
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">{t('taskQueue.idle')}</span>
          </>
        ) : (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm">
              {currentTask?.skillName}
              {queuedTasks.length > 0 && (
                <span className="ml-1 text-muted-foreground">
                  (+{queuedTasks.length})
                </span>
              )}
            </span>
          </>
        )}
      </div>

      {showPopover && !isIdle && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-popover border rounded-lg shadow-lg z-50">
          <div className="p-3 border-b">
            <h4 className="font-medium text-sm">{t('taskQueue.status')}</h4>
          </div>
          
          <div className="p-3 space-y-3 max-h-80 overflow-auto">
            {currentTask && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t('taskQueue.running')}
                </div>
                <TaskItem task={currentTask} formatTime={formatTime} getTaskTypeLabel={getTaskTypeLabel} />
              </div>
            )}

            {queuedTasks.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {t('taskQueue.queued')} ({queuedTasks.length})
                </div>
                {queuedTasks.map((task) => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    formatTime={formatTime} 
                    getTaskTypeLabel={getTaskTypeLabel}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskItem({ 
  task, 
  formatTime, 
  getTaskTypeLabel 
}: { 
  task: QueuedTask; 
  formatTime: (dateStr: string) => string;
  getTaskTypeLabel: (type: 'scheduled' | 'manual') => string;
}) {
  return (
    <div className="p-2 rounded bg-muted/50 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium truncate">{task.skillName}</span>
        <span className="text-xs text-muted-foreground ml-2 shrink-0">
          {getTaskTypeLabel(task.triggerType)}
        </span>
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {formatTime(task.createdAt)}
      </div>
    </div>
  );
}
