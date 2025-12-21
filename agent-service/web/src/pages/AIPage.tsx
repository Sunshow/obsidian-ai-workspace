import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bot, Globe, Loader2, Settings, Copy, Check, AlertTriangle, CheckCircle } from 'lucide-react';
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
  const [autoGenerateNote, setAutoGenerateNote] = useState(true);
  const [autoCreateCategory, setAutoCreateCategory] = useState(true);
  const [notePath, setNotePath] = useState('WebClips');
  const [copied, setCopied] = useState<'left' | 'right' | null>(null);
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
      setAutoGenerateNote(cfg.autoGenerateNote);
      setAutoCreateCategory(cfg.autoCreateCategory);
      setNotePath(cfg.notePath);
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
        autoGenerateNote,
        autoCreateCategory,
        notePath,
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
        autoGenerateNote,
        autoCreateCategory,
        notePath,
        executors: {
          playwright: selectedPlaywright,
          claudecode: selectedClaude,
        },
      });
      setEditPrompt(updated.defaultPrompt);
      setSelectedPlaywright(updated.executors.playwright);
      setSelectedClaude(updated.executors.claudecode);
      setAutoGenerateNote(updated.autoGenerateNote);
      setAutoCreateCategory(updated.autoCreateCategory);
      setNotePath(updated.notePath);
      setShowSettings(false);
    } catch (error) {
      console.error('Failed to save config:', error);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleCopy = (side: 'left' | 'right') => {
    const textToCopy = side === 'left' ? result?.originalContent : result?.generatedNote;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(side);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const normalizeWhitespace = (text: string) => {
    return text
      .split('\n')
      .map(line => line.trim() === '' ? '' : line)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n');
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
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoGenerateNote"
                  checked={autoGenerateNote}
                  onChange={(e) => setAutoGenerateNote(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="autoGenerateNote">自动生成笔记</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoCreateCategory"
                  checked={autoCreateCategory}
                  onChange={(e) => setAutoCreateCategory(e.target.checked)}
                  disabled={!autoGenerateNote}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="autoCreateCategory">自动创建分类</Label>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <Label htmlFor="notePath" className="whitespace-nowrap">笔记路径</Label>
                <Input
                  id="notePath"
                  value={notePath}
                  onChange={(e) => setNotePath(e.target.value)}
                  placeholder="WebClips"
                  disabled={!autoGenerateNote}
                  className="flex-1"
                />
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
            </div>
          </CardHeader>
          <CardContent>
            {result.success ? (
              <div className="space-y-4">
                {result.noteSaved && result.noteSavePath && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400">
                    <CheckCircle className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm">笔记已保存到: {result.noteSavePath}</span>
                  </div>
                )}
                {result.warning && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm">{result.warning}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">原始抓取内容</Label>
                      {result.originalContent && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy('left')}>
                          {copied === 'left' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      )}
                    </div>
                    <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md overflow-auto max-h-[500px]">
                      {normalizeWhitespace(result.originalContent || '(无内容)')}
                    </pre>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">生成的笔记</Label>
                      {result.generatedNote && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy('right')}>
                          {copied === 'right' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      )}
                    </div>
                    <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md overflow-auto max-h-[500px]">
                      {result.generatedNote || '(未生成笔记)'}
                    </pre>
                  </div>
                </div>
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
