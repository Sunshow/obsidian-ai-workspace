import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChannelInfo,
  NotificationChannel,
  fetchChannels,
  fetchChannel,
  createChannel,
  updateChannel,
  deleteChannel,
  toggleChannel,
  testChannel,
  getDefaultChannel,
  setDefaultChannel,
  CHANNEL_TYPES,
} from '@/api/notifications';
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
import { RefreshCw, Plus, Trash2, Send, Edit, Bell, Star } from 'lucide-react';

export default function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [defaultChannelId, setDefaultChannelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<NotificationChannel | null>(null);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [formData, setFormData] = useState({
    id: '',
    type: 'dingtalk' as string,
    name: '',
    description: '',
    config: {} as Record<string, any>,
  });

  const loadChannels = useCallback(async () => {
    try {
      const [channelsData, defaultChannel] = await Promise.all([
        fetchChannels(),
        getDefaultChannel(),
      ]);
      setChannels(channelsData);
      setDefaultChannelId(defaultChannel);
    } catch (error) {
      console.error('Failed to load channels:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const handleToggle = async (id: string) => {
    try {
      const updated = await toggleChannel(id);
      setChannels((prev) =>
        prev.map((ch) => (ch.id === id ? { ...ch, enabled: updated.enabled } : ch))
      );
    } catch (error) {
      console.error('Failed to toggle:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('notifications.deleteConfirm', { name: id }))) return;
    try {
      await deleteChannel(id);
      setChannels((prev) => prev.filter((ch) => ch.id !== id));
      // Clear default if deleted channel was the default
      if (defaultChannelId === id) {
        setDefaultChannelId(null);
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultChannel(id);
      setDefaultChannelId(id);
    } catch (error) {
      console.error('Failed to set default:', error);
    }
  };

  const handleTest = async (id: string) => {
    setTestingChannel(id);
    setTestResult(null);
    try {
      const result = await testChannel(id);
      setTestResult({
        success: result.success,
        message: result.success ? t('notifications.testSuccess') : (result.error || t('notifications.testFailed')),
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : t('notifications.testFailed'),
      });
    } finally {
      setTestingChannel(null);
    }
  };

  const handleEdit = async (id: string) => {
    try {
      const channel = await fetchChannel(id);
      setEditingChannel(channel);
      setFormData({
        id: channel.id,
        type: channel.type,
        name: channel.name || '',
        description: channel.description || '',
        config: channel.config || {},
      });
      setDialogOpen(true);
    } catch (error) {
      console.error('Failed to fetch channel:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      type: 'dingtalk',
      name: '',
      description: '',
      config: {},
    });
    setEditingChannel(null);
  };

  const handleSave = async () => {
    try {
      if (editingChannel) {
        await updateChannel(editingChannel.id, {
          name: formData.name || undefined,
          description: formData.description || undefined,
          config: formData.config,
        });
      } else {
        await createChannel({
          id: formData.id,
          type: formData.type,
          name: formData.name || undefined,
          description: formData.description || undefined,
          enabled: true,
          config: formData.config,
        });
      }
      setDialogOpen(false);
      resetForm();
      loadChannels();
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  const selectedTypeConfig = CHANNEL_TYPES.find((t) => t.type === formData.type);

  const getTypeLabel = (type: string) => {
    const config = CHANNEL_TYPES.find((t) => t.type === type);
    return lang === 'zh' ? config?.labelZh : config?.label || type;
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
          <h1 className="text-2xl font-bold">{t('notifications.title')}</h1>
          <p className="text-muted-foreground">{t('notifications.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadChannels}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.refresh')}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('notifications.addChannel')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingChannel ? t('notifications.editChannel') : t('notifications.addChannel')}
                </DialogTitle>
                <DialogDescription>
                  {editingChannel ? t('notifications.editChannelDesc') : t('notifications.addChannelDesc')}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {!editingChannel && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="id">{t('notifications.form.id')}</Label>
                      <Input
                        id="id"
                        value={formData.id}
                        onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                        placeholder={t('notifications.form.idPlaceholder')}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="type">{t('notifications.form.type')}</Label>
                      <select
                        id="type"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value, config: {} })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {CHANNEL_TYPES.map((ct) => (
                          <option key={ct.type} value={ct.type}>
                            {lang === 'zh' ? ct.labelZh : ct.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="name">{t('notifications.form.name')}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('notifications.form.namePlaceholder')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">{t('notifications.form.description')}</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('notifications.form.descriptionPlaceholder')}
                  />
                </div>
                {selectedTypeConfig && (
                  <div className="space-y-3 pt-2 border-t">
                    <Label className="text-sm font-medium">{t('notifications.form.config')}</Label>
                    {selectedTypeConfig.fields.map((field) => (
                      <div key={field.key} className="grid gap-1">
                        <Label htmlFor={field.key} className="text-xs text-muted-foreground">
                          {lang === 'zh' ? field.labelZh : field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        <Input
                          id={field.key}
                          type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
                          value={formData.config[field.key] || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              config: {
                                ...formData.config,
                                [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSave}>{t('common.save')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {testResult && (
        <div className={`p-3 rounded-md ${testResult.success ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
          {testResult.message}
        </div>
      )}

      {channels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">{t('notifications.noChannels')}</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('notifications.addFirst')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel) => (
            <Card key={channel.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {channel.name || channel.id}
                      {defaultChannelId === channel.id && (
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">{getTypeLabel(channel.type)}</CardDescription>
                  </div>
                  <Badge variant={channel.enabled ? 'success' : 'secondary'}>
                    {channel.enabled ? t('common.enabled') : t('common.disabled')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">ID: </span>
                    <span className="font-mono text-xs">{channel.id}</span>
                  </div>
                  {channel.description && (
                    <div className="text-sm text-muted-foreground">{channel.description}</div>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={channel.enabled}
                        onCheckedChange={() => handleToggle(channel.id)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {channel.enabled ? t('common.enabled') : t('common.disabled')}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSetDefault(channel.id)}
                        disabled={defaultChannelId === channel.id}
                        title={t('notifications.setDefault')}
                      >
                        <Star className={`h-4 w-4 ${defaultChannelId === channel.id ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleTest(channel.id)}
                        disabled={!channel.enabled || testingChannel === channel.id}
                        title={t('notifications.testChannel')}
                      >
                        <Send className={`h-4 w-4 ${testingChannel === channel.id ? 'animate-pulse' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(channel.id)}
                        title={t('common.edit')}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(channel.id)}
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
