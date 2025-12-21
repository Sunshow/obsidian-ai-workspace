import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bot, Globe, Loader2, Settings, Copy, Check } from 'lucide-react';
import {
  fetchSmartFetchConfig,
  updateSmartFetchConfig,
  smartFetch,
  SmartFetchResult,
} from '@/api/skills';
import { fetchExecutors, Executor } from '@/api/executors';

export default function AIPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SmartFetchResult | null>(null);
  const [executors, setExecutors] = useState<Executor[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [selectedPlaywright, setSelectedPlaywright] = useState('');
  const [selectedClaude, setSelectedClaude] = useState('');
  const [copied, setCopied] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    loadConfig();
    loadExecutors();
  }, []);

  const loadConfig = async () => {
    try {
      const cfg = await fetchSmartFetchConfig();
      setEditPrompt(cfg.defaultPrompt);
      setSelectedPlaywright(cfg.executors.playwright);
      setSelectedClaude(cfg.executors.claudecode);
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const loadExecutors = async () => {
    try {
      const execs = await fetchExecutors();
      setExecutors(execs);
    } catch (error) {
      console.error('Failed to load executors:', error);
    }
  };

  const handleFetch = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await smartFetch({
        url: url.trim(),
        playwrightExecutor: selectedPlaywright,
        claudecodeExecutor: selectedClaude,
      });
      setResult(res);
    } catch (error) {
      setResult({
        success: false,
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const updated = await updateSmartFetchConfig({
        defaultPrompt: editPrompt,
        executors: {
          playwright: selectedPlaywright,
          claudecode: selectedClaude,
        },
      });
      setEditPrompt(updated.defaultPrompt);
      setSelectedPlaywright(updated.executors.playwright);
      setSelectedClaude(updated.executors.claudecode);
      setShowSettings(false);
    } catch (error) {
      console.error('Failed to save config:', error);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleCopy = () => {
    if (result?.generatedNote) {
      navigator.clipboard.writeText(result.generatedNote);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const playwrightExecutors = executors.filter((e) => e.type === 'playwright');
  const claudeExecutors = executors.filter((e) => e.type === 'claudecode');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI</h1>
          <p className="text-muted-foreground">AI assistant and automation features</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => setShowSettings(!showSettings)}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Smart Fetch Settings</CardTitle>
            <CardDescription>Configure the smart fetch behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default Prompt</Label>
              <textarea
                className="w-full h-40 p-3 rounded-md border bg-background resize-none font-mono text-sm"
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="Enter the default prompt for note generation..."
              />
              <p className="text-xs text-muted-foreground">
                Use {'{{title}}'} and {'{{content}}'} as placeholders
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Playwright Executor</Label>
                <select
                  className="w-full p-2 rounded-md border bg-background"
                  value={selectedPlaywright}
                  onChange={(e) => setSelectedPlaywright(e.target.value)}
                >
                  {playwrightExecutors.map((e) => (
                    <option key={e.name} value={e.name}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Claude Executor</Label>
                <select
                  className="w-full p-2 rounded-md border bg-background"
                  value={selectedClaude}
                  onChange={(e) => setSelectedClaude(e.target.value)}
                >
                  {claudeExecutors.map((e) => (
                    <option key={e.name} value={e.name}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveConfig} disabled={savingConfig}>
              {savingConfig && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
          </CardFooter>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Smart Fetch
          </CardTitle>
          <CardDescription>
            Fetch web content and generate structured notes using AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter URL to fetch..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
              disabled={loading}
            />
            <Button onClick={handleFetch} disabled={loading || !url.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Bot className="mr-2 h-4 w-4" />
                  Fetch & Generate
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {result.success ? result.title || 'Result' : 'Error'}
                </CardTitle>
                <CardDescription>{result.url}</CardDescription>
              </div>
              {result.success && result.generatedNote && (
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {result.success ? (
              <div className="prose dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md overflow-auto max-h-[500px]">
                  {result.generatedNote}
                </pre>
              </div>
            ) : (
              <div className="text-destructive">{result.error}</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
