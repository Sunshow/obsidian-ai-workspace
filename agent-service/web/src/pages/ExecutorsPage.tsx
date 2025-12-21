import { useState, useEffect, useCallback } from 'react';
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
    if (!confirm(`Delete executor "${name}"?`)) return;
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
      return <Badge variant="secondary">Disabled</Badge>;
    }
    switch (executor.status) {
      case 'healthy':
        return <Badge variant="success">Healthy</Badge>;
      case 'unhealthy':
        return <Badge variant="error">Unhealthy</Badge>;
      default:
        return <Badge variant="warning">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Executors</h1>
          <p className="text-muted-foreground">
            Manage and monitor your executors
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
              Refresh All
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Executor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Executor</DialogTitle>
                  <DialogDescription>
                    Configure a new executor to manage
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="my-executor"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="type">Type</Label>
                    <Input
                      id="type"
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value })
                      }
                      placeholder="claudecode, puppeteer, etc."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="endpoint">Endpoint</Label>
                    <Input
                      id="endpoint"
                      value={formData.endpoint}
                      onChange={(e) =>
                        setFormData({ ...formData, endpoint: e.target.value })
                      }
                      placeholder="http://executor:3000"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="healthPath">Health Path</Label>
                    <Input
                      id="healthPath"
                      value={formData.healthPath}
                      onChange={(e) =>
                        setFormData({ ...formData, healthPath: e.target.value })
                      }
                      placeholder="/health"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Optional description"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate}>Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {executors.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No executors configured</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Executor
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
                      <span className="text-muted-foreground">Endpoint: </span>
                      <span className="font-mono text-xs">{executor.endpoint}</span>
                    </div>
                    {executor.description && (
                      <div className="text-sm text-muted-foreground">
                        {executor.description}
                      </div>
                    )}
                    {executor.lastChecked && (
                      <div className="text-xs text-muted-foreground">
                        Last checked:{' '}
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
                          {executor.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCheckHealth(executor.name)}
                          title="Check health"
                        >
                          <Activity className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(executor.name)}
                          title="Delete"
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
