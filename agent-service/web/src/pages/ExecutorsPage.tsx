import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Executor,
  fetchExecutors,
  createExecutor,
  deleteExecutor,
  toggleExecutor,
  checkHealth,
  checkAllHealth,
} from '@/api/executors';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, Plus, Trash2, Activity } from 'lucide-react';

export default function ExecutorsPage() {
  const { t } = useTranslation();
  const [executors, setExecutors] = useState<Executor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    endpoint: '',
    healthPath: '/health',
    description: '',
  });

  const loadExecutors = useCallback(async () => {
    try {
      const data = await fetchExecutors();
      setExecutors(data);
    } catch (error) {
      console.error('Failed to load executors:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExecutors();
  }, [loadExecutors]);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      const data = await checkAllHealth();
      setExecutors(data);
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCheckHealth = async (name: string) => {
    try {
      const updated = await checkHealth(name);
      setExecutors((prev) =>
        prev.map((e) => (e.name === name ? updated : e))
      );
    } catch (error) {
      console.error('Failed to check health:', error);
    }
  };

  const handleToggle = async (name: string) => {
    try {
      const updated = await toggleExecutor(name);
      setExecutors((prev) =>
        prev.map((e) => (e.name === name ? updated : e))
      );
    } catch (error) {
      console.error('Failed to toggle:', error);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(t('executors.deleteConfirm', { name }))) return;
    try {
      await deleteExecutor(name);
      setExecutors((prev) => prev.filter((e) => e.name !== name));
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleCreate = async () => {
    try {
      const created = await createExecutor({
        ...formData,
        enabled: true,
      });
      setExecutors((prev) => [...prev, created]);
      setDialogOpen(false);
      setFormData({
        name: '',
        type: '',
        endpoint: '',
        healthPath: '/health',
        description: '',
      });
    } catch (error) {
      console.error('Failed to create:', error);
    }
  };

  const getStatusBadge = (executor: Executor) => {
    if (!executor.enabled) {
      return <Badge variant="secondary">{t('status.disabled')}</Badge>;
    }
    switch (executor.status) {
      case 'healthy':
        return <Badge variant="success">{t('status.healthy')}</Badge>;
      case 'unhealthy':
        return <Badge variant="error">{t('status.unhealthy')}</Badge>;
      default:
        return <Badge variant="warning">{t('status.unknown')}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('executors.title')}</h1>
          <p className="text-muted-foreground">
            {t('executors.subtitle')}
          </p>
        </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefreshAll}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
              />
              {t('common.refreshAll')}
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('executors.addExecutor')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('executors.addNew')}</DialogTitle>
                  <DialogDescription>
                    {t('executors.configureNew')}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">{t('executors.form.name')}</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder={t('executors.form.namePlaceholder')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="type">{t('executors.form.type')}</Label>
                    <Input
                      id="type"
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value })
                      }
                      placeholder={t('executors.form.typePlaceholder')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="endpoint">{t('executors.form.endpoint')}</Label>
                    <Input
                      id="endpoint"
                      value={formData.endpoint}
                      onChange={(e) =>
                        setFormData({ ...formData, endpoint: e.target.value })
                      }
                      placeholder={t('executors.form.endpointPlaceholder')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="healthPath">{t('executors.form.healthPath')}</Label>
                    <Input
                      id="healthPath"
                      value={formData.healthPath}
                      onChange={(e) =>
                        setFormData({ ...formData, healthPath: e.target.value })
                      }
                      placeholder={t('executors.form.healthPathPlaceholder')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">{t('executors.form.description')}</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder={t('executors.form.descriptionPlaceholder')}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={handleCreate}>{t('common.create')}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {executors.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">{t('executors.noExecutors')}</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('executors.addFirst')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {executors.map((executor) => (
              <Card key={executor.name}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{executor.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {executor.type}
                      </CardDescription>
                    </div>
                    {getStatusBadge(executor)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <span className="text-muted-foreground">{t('executors.endpoint')}: </span>
                      <span className="font-mono text-xs">{executor.endpoint}</span>
                    </div>
                    {executor.description && (
                      <div className="text-sm text-muted-foreground">
                        {executor.description}
                      </div>
                    )}
                    {executor.lastChecked && (
                      <div className="text-xs text-muted-foreground">
                        {t('executors.lastChecked')}:{' '}
                        {new Date(executor.lastChecked).toLocaleTimeString()}
                        {executor.responseTime !== undefined && (
                          <span className="ml-2">({executor.responseTime}ms)</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={executor.enabled}
                          onCheckedChange={() => handleToggle(executor.name)}
                        />
                        <span className="text-sm text-muted-foreground">
                          {executor.enabled ? t('common.enabled') : t('common.disabled')}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCheckHealth(executor.name)}
                          title={t('executors.checkHealth')}
                        >
                          <Activity className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(executor.name)}
                          title={t('common.delete')}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}
