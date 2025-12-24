import { useState, useEffect, useRef } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Streamdown } from 'streamdown';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bot, Globe, Loader2, Settings, Copy, Check, AlertTriangle, CheckCircle, Play, Code, FileText, Clock, Save, Circle } from 'lucide-react';
import {
  fetchSmartFetchConfig,
  updateSmartFetchConfig,
  smartFetch,
  SmartFetchResult,
  fetchSkills,
  fetchSkillDefinition,
  executeSkillStream,
  saveSkillDefaultInputs,
  Skill,
  SkillDefinition,
  SkillExecutionResult,
} from '@/api/skills';
import { fetchExecutors, Executor } from '@/api/executors';
import { getLocalizedSkillName, getLocalizedSkillDescription, getLocalizedUserInput } from '@/hooks/useLocalizedSkill';

function SmartFetchSkill() {
  const { t } = useTranslation();
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
          <h1 className="text-2xl font-bold">{t('smartFetch.title')}</h1>
          <p className="text-muted-foreground">{t('smartFetch.subtitle')}</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => setShowSettings(!showSettings)}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('smartFetch.settings')}</CardTitle>
            <CardDescription>{t('smartFetch.settingsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('smartFetch.defaultPrompt')}</Label>
              <textarea
                className="w-full h-40 p-3 rounded-md border bg-background resize-none font-mono text-sm"
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder={t('smartFetch.promptPlaceholder')}
              />
              <p className="text-xs text-muted-foreground">
                {t('smartFetch.promptHint')}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('smartFetch.playwrightExecutor')}</Label>
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
                <Label>{t('smartFetch.claudeExecutor')}</Label>
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
                <Label htmlFor="autoGenerateNote">{t('smartFetch.autoGenerateNote')}</Label>
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
                <Label htmlFor="autoCreateCategory">{t('smartFetch.autoCreateCategory')}</Label>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <Label htmlFor="notePath" className="whitespace-nowrap">{t('smartFetch.notePath')}</Label>
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
              {t('smartFetch.saveSettings')}
            </Button>
          </CardFooter>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t('smartFetch.title')}
          </CardTitle>
          <CardDescription>
            {t('smartFetch.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder={t('smartFetch.urlPlaceholder')}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
              disabled={loading}
            />
            <Button onClick={handleFetch} disabled={loading || !url.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('smartFetch.processing')}
                </>
              ) : (
                <>
                  <Bot className="mr-2 h-4 w-4" />
                  {t('smartFetch.fetchGenerate')}
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
                    <span className="text-sm">{t('smartFetch.noteSaved')}: {result.noteSavePath}</span>
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
                      <Label className="text-sm font-medium">{t('smartFetch.originalContent')}</Label>
                      {result.originalContent && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy('left')}>
                          {copied === 'left' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      )}
                    </div>
                    <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md overflow-auto max-h-[500px]">
                      {normalizeWhitespace(result.originalContent || t('smartFetch.noContent'))}
                    </pre>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">{t('smartFetch.generatedNote')}</Label>
                      {result.generatedNote && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy('right')}>
                          {copied === 'right' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      )}
                    </div>
                    <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md overflow-auto max-h-[500px]">
                      {result.generatedNote || t('smartFetch.noNote')}
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
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { skillId } = useParams<{ skillId: string }>();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSkills = () => {
    fetchSkills()
      .then(setSkills)
      .catch((err) => console.error('Failed to load skills:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSkills();
  }, []);

  // 监听技能更新事件
  useEffect(() => {
    const handleSkillsUpdated = () => {
      loadSkills();
    };
    window.addEventListener('skills-updated', handleSkillsUpdated);
    return () => window.removeEventListener('skills-updated', handleSkillsUpdated);
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
        <p className="text-muted-foreground">{t('skills.noSkillsAvailable')}</p>
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
        <h1 className="text-2xl font-bold">{getLocalizedSkillName(skill, lang)}</h1>
        <p className="text-muted-foreground">{getLocalizedSkillDescription(skill, lang)}</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">{t('skillRunner.noSpecialUI')}</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Step status for real-time tracking
interface StepStatus {
  stepId: string;
  stepName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration?: number;
  rawOutput?: string;
  error?: string;
}

// Generic runner for custom skills
function CustomSkillRunner({ skillId, skill }: { skillId: string; skill: Skill }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language;
  const [definition, setDefinition] = useState<SkillDefinition | null>(null);
  const [inputs, setInputs] = useState<Record<string, any>>({});
  const [executing, setExecuting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SkillExecutionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRawOutput, setShowRawOutput] = useState(false);
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>([]);
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    fetchSkillDefinition(skillId)
      .then((def) => {
        setDefinition(def);
        // Initialize with field default values
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

    // Initialize step statuses from definition
    if (definition?.steps) {
      setStepStatuses(
        definition.steps.map((step) => ({
          stepId: step.id,
          stepName: step.name,
          status: 'pending',
        }))
      );
    }

    // Trigger task queue refresh immediately when starting execution
    window.dispatchEvent(new CustomEvent('task-queue-refresh'));

    // Use streaming API
    const { cancel } = executeSkillStream(skillId, inputs, {
      onStepStart: (event) => {
        setStepStatuses((prev) =>
          prev.map((s) =>
            s.stepId === event.stepId ? { ...s, status: 'running' } : s
          )
        );
      },
      onStepComplete: (event) => {
        setStepStatuses((prev) =>
          prev.map((s) =>
            s.stepId === event.stepId
              ? {
                  ...s,
                  status: 'completed',
                  duration: event.duration,
                  rawOutput: event.rawOutput,
                }
              : s
          )
        );
      },
      onStepError: (event) => {
        setStepStatuses((prev) =>
          prev.map((s) =>
            s.stepId === event.stepId
              ? {
                  ...s,
                  status: 'failed',
                  duration: event.duration,
                  error: event.error,
                }
              : s
          )
        );
      },
      onComplete: (res) => {
        setResult(res);
        setExecuting(false);
        cancelRef.current = null;
        // 如果是技能创建器执行成功，触发刷新事件
        if (res.success && skillId === 'skill-creator') {
          window.dispatchEvent(new CustomEvent('skills-updated'));
        }
        // Trigger task queue refresh when execution completes
        window.dispatchEvent(new CustomEvent('task-queue-refresh'));
      },
      onError: (error) => {
        setResult({
          success: false,
          skillId,
          stepResults: [],
          error,
          duration: 0,
        });
        setExecuting(false);
        cancelRef.current = null;
        window.dispatchEvent(new CustomEvent('task-queue-refresh'));
      },
    });

    cancelRef.current = cancel;
  };

  const handleSaveInputs = async () => {
    console.log('handleSaveInputs called, skillId:', skillId, 'inputs:', inputs);
    setSaving(true);
    try {
      const updatedDef = await saveSkillDefaultInputs(skillId, inputs);
      console.log('Save successful:', updatedDef);
      setDefinition(updatedDef);
      window.dispatchEvent(new CustomEvent('skills-updated'));
      alert(t('skillRunner.paramsSaved'));
    } catch (error) {
      console.error('Failed to save inputs:', error);
      alert(t('skillRunner.saveParamsFailed'));
    } finally {
      setSaving(false);
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

  // Check schedule status
  const hasSchedule = definition?.schedule?.enabled;
  const hasRequiredInputs = definition?.userInputs?.some(i => i.required);
  const hasDefaultInputs = hasRequiredInputs 
    ? definition?.userInputs?.filter(i => i.required).every(i => 
        i.defaultValue !== undefined
      )
    : true;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{getLocalizedSkillName(skill, lang)}</h1>
        <p className="text-muted-foreground">{getLocalizedSkillDescription(skill, lang)}</p>
      </div>

      {/* Schedule Status */}
      {hasSchedule && (
        <Card className={hasDefaultInputs ? 'border-primary/50' : 'border-destructive'}>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm">
                  {t('skillRunner.scheduleStatus')}: <code className="text-xs bg-muted px-1 rounded">{definition?.schedule?.cron}</code>
                </span>
                <Badge variant={hasDefaultInputs ? 'outline' : 'destructive'}>
                  {hasDefaultInputs ? t('skills.scheduled') : t('skills.scheduleNeedsConfig')}
                </Badge>
              </div>
              {!hasDefaultInputs && (
                <Button size="sm" variant="outline" onClick={() => navigate(`/skills/${skillId}/edit`)}>
                  {t('skillRunner.configureDefaults')}
                </Button>
              )}
            </div>
            {!hasDefaultInputs && (
              <p className="text-xs text-destructive mt-2">
                {t('skillRunner.scheduleNeedsDefaultInputs')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t('skillRunner.inputParams')}</CardTitle>
          <CardDescription>{t('skillRunner.inputParamsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {definition?.userInputs?.map((input) => {
            const localizedInput = getLocalizedUserInput(input, lang);
            return (
            <div key={input.name} className="space-y-2">
              <Label>
                {localizedInput.label}
                {input.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {input.type === 'textarea' ? (
                <textarea
                  className="w-full h-24 p-3 rounded-md border bg-background resize-none"
                  value={inputs[input.name] || ''}
                  onChange={(e) => updateInput(input.name, e.target.value)}
                  placeholder={localizedInput.placeholder}
                  disabled={executing}
                />
              ) : input.type === 'select' ? (
                <select
                  className="w-full p-2 rounded-md border bg-background"
                  value={inputs[input.name] || ''}
                  onChange={(e) => updateInput(input.name, e.target.value)}
                  disabled={executing}
                >
                  <option value="">{t('common.select')}...</option>
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
                  placeholder={localizedInput.placeholder}
                  disabled={executing}
                />
              ) : (
                <Input
                  value={inputs[input.name] || ''}
                  onChange={(e) => updateInput(input.name, e.target.value)}
                  placeholder={localizedInput.placeholder}
                  disabled={executing}
                />
              )}
            </div>
            );
          })}

          {(!definition?.userInputs || definition.userInputs.length === 0) && (
            <p className="text-muted-foreground text-center py-4">{t('skillRunner.noParamsRequired')}</p>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          {definition?.userInputs && definition.userInputs.length > 0 && (
            <Button
              variant="outline"
              onClick={handleSaveInputs}
              disabled={executing || saving}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {t('skillRunner.saveParams')}
            </Button>
          )}
          <Button onClick={handleExecute} disabled={executing} className="flex-1">
            {executing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('skillRunner.executing')}
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                {t('skillRunner.executeSkill')}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Real-time Step Progress (shown during execution) */}
      {executing && stepStatuses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t('skillRunner.executionSteps')}
            </CardTitle>
            <CardDescription>{t('skillRunner.executingInProgress')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stepStatuses.map((step, index) => (
                <LiveStepItem key={step.stepId} step={step} index={index} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                {t('skillRunner.executionResult')}
              </CardTitle>
              <Badge variant={result.success ? 'default' : 'destructive'}>
                {result.success ? t('common.success') : t('common.failed')}
              </Badge>
            </div>
            <CardDescription>
              {t('skillRunner.duration')}: {(result.duration / 1000).toFixed(2)}s
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
                <Label className="text-sm font-medium">{t('skillRunner.executionSteps')}</Label>
                <div className="space-y-2">
                  {result.stepResults.map((step, index) => (
                    <StepResultItem key={step.stepId} step={step} index={index} />
                  ))}
                </div>
              </div>
            )}

            {/* Final Output */}
            {result.finalOutput && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{t('skillRunner.finalOutput')}</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRawOutput(!showRawOutput)}
                    className="h-7 px-2 text-xs"
                  >
                    {showRawOutput ? (
                      <>
                        <FileText className="mr-1 h-3 w-3" />
                        {t('skillRunner.renderedView')}
                      </>
                    ) : (
                      <>
                        <Code className="mr-1 h-3 w-3" />
                        {t('skillRunner.rawOutput')}
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
                      <Streamdown>{extractContent(result.finalOutput)!}</Streamdown>
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

// Step result item with expandable raw output
function StepResultItem({ step, index }: { step: { stepId: string; stepName: string; success: boolean; duration: number; rawOutput?: string; error?: string }; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasOutput = step.rawOutput || step.error;

  return (
    <div
      className={`rounded-md border ${
        step.success
          ? 'bg-green-500/5 border-green-500/20'
          : 'bg-destructive/5 border-destructive/20'
      }`}
    >
      <div
        className={`flex items-center justify-between p-3 ${hasOutput ? 'cursor-pointer hover:bg-muted/50' : ''}`}
        onClick={() => hasOutput && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Badge variant="outline">{index + 1}</Badge>
          <span>{step.stepName}</span>
          {hasOutput && (
            <span className="text-xs text-muted-foreground">
              {expanded ? '▼' : '▶'}
            </span>
          )}
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
      {expanded && hasOutput && (
        <div className="px-3 pb-3 pt-0">
          <pre className="whitespace-pre-wrap text-xs bg-muted p-3 rounded-md overflow-auto max-h-[300px]">
            {step.error || step.rawOutput}
          </pre>
        </div>
      )}
    </div>
  );
}

// Live step item for real-time progress display
function LiveStepItem({ step, index }: { step: StepStatus; index: number }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const hasOutput = step.rawOutput || step.error;

  const getStatusIcon = () => {
    switch (step.status) {
      case 'pending':
        return <Circle className="h-4 w-4 text-muted-foreground" />;
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusClass = () => {
    switch (step.status) {
      case 'pending':
        return 'bg-muted/50 border-muted';
      case 'running':
        return 'bg-primary/5 border-primary/30';
      case 'completed':
        return 'bg-green-500/5 border-green-500/20';
      case 'failed':
        return 'bg-destructive/5 border-destructive/20';
    }
  };

  const getStatusText = () => {
    switch (step.status) {
      case 'pending':
        return t('skillRunner.stepPending');
      case 'running':
        return t('skillRunner.stepRunning');
      case 'completed':
        return step.duration ? `${(step.duration / 1000).toFixed(2)}s` : t('skillRunner.stepCompleted');
      case 'failed':
        return t('skillRunner.stepFailed');
    }
  };

  return (
    <div className={`rounded-md border ${getStatusClass()}`}>
      <div
        className={`flex items-center justify-between p-3 ${hasOutput ? 'cursor-pointer hover:bg-muted/50' : ''}`}
        onClick={() => hasOutput && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Badge variant="outline">{index + 1}</Badge>
          <span>{step.stepName}</span>
          {hasOutput && (
            <span className="text-xs text-muted-foreground">
              {expanded ? '▼' : '▶'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{getStatusText()}</span>
          {getStatusIcon()}
        </div>
      </div>
      {expanded && hasOutput && (
        <div className="px-3 pb-3 pt-0">
          <pre className="whitespace-pre-wrap text-xs bg-muted p-3 rounded-md overflow-auto max-h-[300px]">
            {step.error || step.rawOutput}
          </pre>
        </div>
      )}
    </div>
  );
}
