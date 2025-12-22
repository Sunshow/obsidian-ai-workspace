import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bot, Globe, Loader2, Settings, Copy, Check, AlertTriangle, CheckCircle, Play, Code, FileText } from 'lucide-react';
import {
  fetchSmartFetchConfig,
  updateSmartFetchConfig,
  smartFetch,
  SmartFetchResult,
  fetchSkills,
  fetchSkillDefinition,
  executeSkill,
  Skill,
  SkillDefinition,
  SkillExecutionResult,
} from '@/api/skills';
import { fetchExecutors, Executor } from '@/api/executors';

function SmartFetchSkill() {
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
          <h1 className="text-2xl font-bold">Smart Fetch</h1>
          <p className="text-muted-foreground">Fetch web content and generate structured notes using AI</p>
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

export default function SkillsPage() {
  const { skillId } = useParams<{ skillId: string }>();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSkills()
      .then(setSkills)
      .catch((err) => console.error('Failed to load skills:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const skill = skills.find((s) => s.id === skillId);

  if (!skill) {
    if (skills.length > 0) {
      return <Navigate to={`/skills/${skills[0].id}`} replace />;
    }
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">暂无可用技能</p>
      </div>
    );
  }

  if (skillId === 'smart-fetch') {
    return <SmartFetchSkill />;
  }

  // Custom skills use generic runner
  if (!skill.builtin) {
    return <CustomSkillRunner skillId={skillId!} skill={skill} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{skill.name}</h1>
        <p className="text-muted-foreground">{skill.description}</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">此技能暂无专属界面</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Generic runner for custom skills
function CustomSkillRunner({ skillId, skill }: { skillId: string; skill: Skill }) {
  const [definition, setDefinition] = useState<SkillDefinition | null>(null);
  const [inputs, setInputs] = useState<Record<string, any>>({});
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<SkillExecutionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRawOutput, setShowRawOutput] = useState(false);

  useEffect(() => {
    fetchSkillDefinition(skillId)
      .then((def) => {
        setDefinition(def);
        // Initialize default values
        const defaults: Record<string, any> = {};
        def?.userInputs?.forEach((input) => {
          if (input.defaultValue !== undefined) {
            defaults[input.name] = input.defaultValue;
          }
        });
        setInputs(defaults);
      })
      .catch((err) => console.error('Failed to load skill definition:', err))
      .finally(() => setLoading(false));
  }, [skillId]);

  // Reset showRawOutput when result changes
  useEffect(() => {
    setShowRawOutput(false);
  }, [result]);

  // Extract content from finalOutput for markdown rendering
  const extractContent = (output: any): string | null => {
    if (!output) return null;
    // Try claudecode format: data.choices[0].message.content
    if (output?.data?.choices?.[0]?.message?.content) {
      return output.data.choices[0].message.content;
    }
    // Try direct content
    if (output?.data?.content) {
      return output.data.content;
    }
    // Try string
    if (typeof output === 'string') {
      return output;
    }
    return null;
  };

  const handleExecute = async () => {
    // Validate required fields
    const missingFields = definition?.userInputs
      ?.filter((input) => input.required && !inputs[input.name])
      .map((input) => input.label);

    if (missingFields && missingFields.length > 0) {
      alert(`请填写必填字段: ${missingFields.join(', ')}`);
      return;
    }

    setExecuting(true);
    setResult(null);

    try {
      const res = await executeSkill(skillId, inputs);
      setResult(res);
    } catch (error) {
      setResult({
        success: false,
        skillId,
        stepResults: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: 0,
      });
    } finally {
      setExecuting(false);
    }
  };

  const updateInput = (name: string, value: any) => {
    setInputs((prev) => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{skill.name}</h1>
        <p className="text-muted-foreground">{skill.description}</p>
      </div>

      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle>输入参数</CardTitle>
          <CardDescription>填写技能执行所需的参数</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {definition?.userInputs?.map((input) => (
            <div key={input.name} className="space-y-2">
              <Label>
                {input.label}
                {input.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {input.type === 'textarea' ? (
                <textarea
                  className="w-full h-24 p-3 rounded-md border bg-background resize-none"
                  value={inputs[input.name] || ''}
                  onChange={(e) => updateInput(input.name, e.target.value)}
                  placeholder={input.placeholder}
                  disabled={executing}
                />
              ) : input.type === 'select' ? (
                <select
                  className="w-full p-2 rounded-md border bg-background"
                  value={inputs[input.name] || ''}
                  onChange={(e) => updateInput(input.name, e.target.value)}
                  disabled={executing}
                >
                  <option value="">请选择...</option>
                  {input.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : input.type === 'checkbox' ? (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={inputs[input.name] || false}
                    onChange={(e) => updateInput(input.name, e.target.checked)}
                    disabled={executing}
                    className="h-4 w-4"
                  />
                </div>
              ) : input.type === 'number' ? (
                <Input
                  type="number"
                  value={inputs[input.name] || ''}
                  onChange={(e) => updateInput(input.name, Number(e.target.value))}
                  placeholder={input.placeholder}
                  disabled={executing}
                />
              ) : (
                <Input
                  value={inputs[input.name] || ''}
                  onChange={(e) => updateInput(input.name, e.target.value)}
                  placeholder={input.placeholder}
                  disabled={executing}
                />
              )}
            </div>
          ))}

          {(!definition?.userInputs || definition.userInputs.length === 0) && (
            <p className="text-muted-foreground text-center py-4">此技能无需输入参数</p>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleExecute} disabled={executing} className="w-full">
            {executing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                执行中...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                执行技能
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Execution Result */}
      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                )}
                执行结果
              </CardTitle>
              <Badge variant={result.success ? 'default' : 'destructive'}>
                {result.success ? '成功' : '失败'}
              </Badge>
            </div>
            <CardDescription>
              耗时: {(result.duration / 1000).toFixed(2)}s
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive">
                {result.error}
              </div>
            )}

            {/* Step Results */}
            {result.stepResults.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">执行步骤</Label>
                <div className="space-y-2">
                  {result.stepResults.map((step, index) => (
                    <div
                      key={step.stepId}
                      className={`flex items-center justify-between p-3 rounded-md border ${
                        step.success
                          ? 'bg-green-500/5 border-green-500/20'
                          : 'bg-destructive/5 border-destructive/20'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{index + 1}</Badge>
                        <span>{step.stepName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{(step.duration / 1000).toFixed(2)}s</span>
                        {step.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Final Output */}
            {result.finalOutput && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">最终输出</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRawOutput(!showRawOutput)}
                    className="h-7 px-2 text-xs"
                  >
                    {showRawOutput ? (
                      <>
                        <FileText className="mr-1 h-3 w-3" />
                        渲染视图
                      </>
                    ) : (
                      <>
                        <Code className="mr-1 h-3 w-3" />
                        原始输出
                      </>
                    )}
                  </Button>
                </div>
                {showRawOutput ? (
                  <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md overflow-auto max-h-[400px]">
                    {typeof result.finalOutput === 'string'
                      ? result.finalOutput
                      : JSON.stringify(result.finalOutput, null, 2)}
                  </pre>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none bg-muted p-4 rounded-md overflow-auto max-h-[400px]">
                    {extractContent(result.finalOutput) ? (
                      <ReactMarkdown>{extractContent(result.finalOutput)!}</ReactMarkdown>
                    ) : (
                      <pre className="whitespace-pre-wrap text-sm">
                        {typeof result.finalOutput === 'string'
                          ? result.finalOutput
                          : JSON.stringify(result.finalOutput, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
