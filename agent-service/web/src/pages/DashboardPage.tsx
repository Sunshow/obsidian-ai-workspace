import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Executor, fetchExecutors, checkAllHealth } from '@/api/executors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Cpu, CheckCircle, XCircle, HelpCircle } from 'lucide-react';

export default function DashboardPage() {
  const { t } = useTranslation();
  const [executors, setExecutors] = useState<Executor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
    const interval = setInterval(loadExecutors, 10000);
    return () => clearInterval(interval);
  }, [loadExecutors]);

  const handleRefresh = async () => {
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

  const healthyCount = executors.filter((e) => e.enabled && e.status === 'healthy').length;
  const unhealthyCount = executors.filter((e) => e.enabled && e.status === 'unhealthy').length;
  const unknownCount = executors.filter((e) => e.enabled && e.status === 'unknown').length;
  const disabledCount = executors.filter((e) => !e.enabled).length;

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
          <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground">{t('dashboard.subtitle')}</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.totalExecutors')}</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{executors.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.healthy')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{healthyCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.unhealthy')}</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{unhealthyCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.unknownDisabled')}</CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {unknownCount + disabledCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.executorStatus')}</CardTitle>
        </CardHeader>
        <CardContent>
          {executors.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">{t('dashboard.noExecutors')}</p>
          ) : (
            <div className="space-y-2">
              {executors.map((executor) => (
                <div
                  key={executor.name}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Cpu className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{executor.name}</p>
                      <p className="text-xs text-muted-foreground">{executor.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {executor.responseTime !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        {executor.responseTime}ms
                      </span>
                    )}
                    {!executor.enabled ? (
                      <Badge variant="secondary">{t('status.disabled')}</Badge>
                    ) : executor.status === 'healthy' ? (
                      <Badge variant="success">{t('status.healthy')}</Badge>
                    ) : executor.status === 'unhealthy' ? (
                      <Badge variant="error">{t('status.unhealthy')}</Badge>
                    ) : (
                      <Badge variant="warning">{t('status.unknown')}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
