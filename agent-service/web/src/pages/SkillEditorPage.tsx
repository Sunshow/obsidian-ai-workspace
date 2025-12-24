import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  GripVertical,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  fetchSkillDefinition,
  fetchBuiltinVariables,
  createSkillDefinition,
  updateSkillDefinition,
  SkillStep,
  UserInputField,
  BuiltinVariableInfo,
  SkillSchedule,
} from '@/api/skills';
import { fetchExecutors, fetchExecutorTypes, Executor, ExecutorType, ActionDefinition } from '@/api/executors';

const INPUT_TYPES = [
  { value: 'text', label: '单行文本' },
  { value: 'textarea', label: '多行文本' },
  { value: 'number', label: '数字' },
  { value: 'checkbox', label: '复选框' },
  { value: 'select', label: '下拉选择' },
];

const CLAUDE_MODELS = [
  { value: '', label: '默认（使用环境变量配置）' },
  { value: 'claude-opus-4-5-20251101', label: 'Claude Opus 4.5' },
  { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
];

export default function SkillEditorPage() {
  const { t } = useTranslation();
  const { skillId } = useParams<{ skillId: string }>();
  const navigate = useNavigate();
  const isEditing = !!skillId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [executors, setExecutors] = useState<Executor[]>([]);
  const [executorTypes, setExecutorTypes] = useState<ExecutorType[]>([]);
  const [builtinVars, setBuiltinVars] = useState<BuiltinVariableInfo[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [builtinVariables, setBuiltinVariables] = useState<Record<string, boolean>>({});
  const [userInputs, setUserInputs] = useState<UserInputField[]>([]);
  const [steps, setSteps] = useState<SkillStep[]>([]);
  const [schedule, setSchedule] = useState<SkillSchedule | undefined>(undefined);

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState({
    builtinVars: true,
    userInputs: true,
    steps: true,
    schedule: false,
  });

  useEffect(() => {
    loadData();
  }, [skillId]);

  const loadData = async () => {
    try {
      const [execsList, varsList, typesList] = await Promise.all([
        fetchExecutors(),
        fetchBuiltinVariables(),
        fetchExecutorTypes(),
      ]);
      setExecutors(execsList);
      setBuiltinVars(varsList);
      setExecutorTypes(typesList);

      if (skillId) {
        const skill = await fetchSkillDefinition(skillId);
        if (skill) {
          setName(skill.name);
          setDescription(skill.description);
          setEnabled(skill.enabled);
          setBuiltinVariables((skill.builtinVariables || {}) as Record<string, boolean>);
          setUserInputs(skill.userInputs || []);
          setSteps(skill.steps || []);
          setSchedule(skill.schedule);
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (checked: boolean) => {
    setEnabled(checked);
    if (isEditing && skillId) {
      try {
        await updateSkillDefinition(skillId, { enabled: checked });
      } catch (error) {
        console.error('Failed to toggle enabled:', error);
        setEnabled(!checked); // Rollback on error
      }
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert(t('skillEditor.saveNameRequired'));
      return;
    }

    setSaving(true);
    try {
      const skillData = {
        name,
        description,
        enabled,
        builtinVariables,
        userInputs,
        steps,
        schedule,
      };

      if (isEditing && skillId) {
        await updateSkillDefinition(skillId, skillData);
      } else {
        await createSkillDefinition(skillData as any);
      }
      navigate('/skills');
    } catch (error) {
      console.error('Failed to save skill:', error);
      alert(t('skillEditor.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const addUserInput = () => {
    setUserInputs([
      ...userInputs,
      {
        name: `input${userInputs.length + 1}`,
        label: `输入 ${userInputs.length + 1}`,
        type: 'text',
        required: false,
      },
    ]);
  };

  const updateUserInput = (index: number, field: Partial<UserInputField>) => {
    const updated = [...userInputs];
    updated[index] = { ...updated[index], ...field };
    setUserInputs(updated);
  };

  const removeUserInput = (index: number) => {
    setUserInputs(userInputs.filter((_, i) => i !== index));
  };

  const addStep = () => {
    const newStep: SkillStep = {
      id: `step${steps.length + 1}`,
      name: `步骤 ${steps.length + 1}`,
      executorType: executors[0]?.type || 'claudecode',
      action: '',
      params: {},
      outputVariable: `result${steps.length + 1}`,
    };
    setSteps([...steps, newStep]);
  };

  const updateStep = (index: number, field: Partial<SkillStep>) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], ...field };
    setSteps(updated);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const getAvailableVariables = (upToStepIndex: number = steps.length) => {
    const vars: { name: string; category: string }[] = [];

    // Builtin variables
    Object.entries(builtinVariables).forEach(([key, enabled]) => {
      if (enabled) {
        vars.push({ name: key, category: '内置' });
      }
    });

    // User inputs
    userInputs.forEach((input) => {
      vars.push({ name: input.name, category: '用户输入' });
    });

    // Previous step outputs
    steps.slice(0, upToStepIndex).forEach((step) => {
      if (step.outputVariable) {
        vars.push({ name: step.outputVariable, category: '步骤输出' });
        vars.push({ name: `${step.outputVariable}.data`, category: '步骤输出' });
      }
    });

    return vars;
  };

  const getActionsForType = (executorType: string): ActionDefinition[] => {
    const typeInfo = executorTypes.find((t) => t.name === executorType);
    return typeInfo?.actionDefinitions || [];
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/skills')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {isEditing ? t('skillEditor.editTitle') : t('skillEditor.createTitle')}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? t('skillEditor.editSubtitle') : t('skillEditor.createSubtitle')}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {t('common.save')}
        </Button>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>{t('skillEditor.basicInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('skillEditor.skillName')} *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('skillEditor.skillNamePlaceholder')}
              />
            </div>
            <div className="flex items-center gap-4 pt-6">
              <Switch checked={enabled} onCheckedChange={handleToggleEnabled} />
              <Label>{t('skillEditor.enableSkill')}</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>描述</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('skillEditor.descriptionPlaceholder')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Builtin Variables */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection('builtinVars')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {expandedSections.builtinVars ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              {t('skillEditor.builtinVariables')}
            </CardTitle>
            <Badge variant="outline">
              {Object.values(builtinVariables).filter(Boolean).length} {t('skillEditor.builtinVarsEnabled')}
            </Badge>
          </div>
          <CardDescription>{t('skillEditor.builtinVarsDesc')}</CardDescription>
        </CardHeader>
        {expandedSections.builtinVars && (
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {builtinVars.map((v) => (
                <label
                  key={v.name}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                    builtinVariables[v.name]
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={builtinVariables[v.name] || false}
                    onChange={(e) =>
                      setBuiltinVariables({
                        ...builtinVariables,
                        [v.name]: e.target.checked,
                      })
                    }
                    className="sr-only"
                  />
                  <span className="font-mono text-sm">{`{{${v.name}}}`}</span>
                  <span className="text-xs text-muted-foreground">
                    {v.description}
                  </span>
                </label>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* User Inputs */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection('userInputs')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {expandedSections.userInputs ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              {t('skillEditor.userInputParams')}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                addUserInput();
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('skillEditor.addParam')}
            </Button>
          </div>
          <CardDescription>{t('skillEditor.userInputParamsDesc')}</CardDescription>
        </CardHeader>
        {expandedSections.userInputs && (
          <CardContent className="space-y-4">
            {userInputs.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                {t('skillEditor.noParams')}
              </p>
            ) : (
              userInputs.map((input, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 border rounded-md"
                >
                  <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-move" />
                  <div className="flex-1 grid grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">变量名</Label>
                      <Input
                        value={input.name}
                        onChange={(e) =>
                          updateUserInput(index, { name: e.target.value })
                        }
                        placeholder="url"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">显示标签</Label>
                      <Input
                        value={input.label}
                        onChange={(e) =>
                          updateUserInput(index, { label: e.target.value })
                        }
                        placeholder="网页地址"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">类型</Label>
                      <select
                        value={input.type}
                        onChange={(e) =>
                          updateUserInput(index, {
                            type: e.target.value as UserInputField['type'],
                          })
                        }
                        className="w-full h-9 px-3 rounded-md border bg-background"
                      >
                        {INPUT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end gap-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={input.required || false}
                          onChange={(e) =>
                            updateUserInput(index, { required: e.target.checked })
                          }
                        />
                        <span className="text-sm">必填</span>
                      </label>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeUserInput(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        )}
      </Card>

      {/* Execution Steps */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection('steps')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {expandedSections.steps ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              {t('skillEditor.executionSteps')}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                addStep();
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('skillEditor.addStep')}
            </Button>
          </div>
          <CardDescription>
            {t('skillEditor.executionStepsDesc')}
          </CardDescription>
        </CardHeader>
        {expandedSections.steps && (
          <CardContent className="space-y-4">
            {steps.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                {t('skillEditor.noSteps')}
              </p>
            ) : (
              steps.map((step, index) => (
                <StepEditor
                  key={step.id}
                  step={step}
                  index={index}
                  executors={executors}
                  executorTypes={executorTypes}
                  availableVariables={getAvailableVariables(index)}
                  getActionsForType={getActionsForType}
                  onUpdate={(field) => updateStep(index, field)}
                  onRemove={() => removeStep(index)}
                />
              ))
            )}
          </CardContent>
        )}
      </Card>

      {/* Schedule Configuration */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection('schedule')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {expandedSections.schedule ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              {t('skillEditor.scheduleConfig')}
            </CardTitle>
            <Badge variant={schedule?.enabled ? 'default' : 'outline'}>
              {schedule?.enabled ? t('skillEditor.scheduleEnabled') : t('skillEditor.scheduleDisabled')}
            </Badge>
          </div>
          <CardDescription>{t('skillEditor.scheduleConfigDesc')}</CardDescription>
        </CardHeader>
        {expandedSections.schedule && (
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Switch
                checked={schedule?.enabled || false}
                onCheckedChange={(checked) =>
                  setSchedule(prev => ({
                    enabled: checked,
                    cron: prev?.cron || '',
                    timezone: prev?.timezone || 'Asia/Shanghai',
                    retryOnFailure: prev?.retryOnFailure ?? true,
                    maxRetries: prev?.maxRetries ?? 3,
                  }))
                }
              />
              <Label>{t('skillEditor.enableSchedule')}</Label>
            </div>

            {schedule?.enabled && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('skillEditor.cronExpression')}</Label>
                    <Input
                      value={schedule?.cron || ''}
                      onChange={(e) =>
                        setSchedule(prev => prev ? { ...prev, cron: e.target.value } : prev)
                      }
                      placeholder="*/5 * * * *"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('skillEditor.cronHint')}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('skillEditor.timezone')}</Label>
                    <Input
                      value={schedule?.timezone || 'Asia/Shanghai'}
                      onChange={(e) =>
                        setSchedule(prev => prev ? { ...prev, timezone: e.target.value } : prev)
                      }
                      placeholder="Asia/Shanghai"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={schedule?.retryOnFailure ?? true}
                      onChange={(e) =>
                        setSchedule(prev => prev ? { ...prev, retryOnFailure: e.target.checked } : prev)
                      }
                      className="h-4 w-4"
                    />
                    <Label>{t('skillEditor.retryOnFailure')}</Label>
                  </div>
                  {schedule?.retryOnFailure && (
                    <div className="flex items-center gap-2">
                      <Label>{t('skillEditor.maxRetries')}</Label>
                      <Input
                        type="number"
                        value={schedule?.maxRetries ?? 3}
                        onChange={(e) =>
                          setSchedule(prev => prev ? { ...prev, maxRetries: Number(e.target.value) } : prev)
                        }
                        className="w-20"
                        min={1}
                        max={10}
                      />
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-md bg-muted/50 text-xs space-y-1">
                  <div className="font-medium">{t('skillEditor.cronExamples')}</div>
                  <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                    <span>*/5 * * * * - {t('skillEditor.every5min')}</span>
                    <span>0 * * * * - {t('skillEditor.everyHour')}</span>
                    <span>0 9 * * * - {t('skillEditor.everyDay9am')}</span>
                    <span>0 0 * * 1 - {t('skillEditor.everyMonday')}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

interface StepEditorProps {
  step: SkillStep;
  index: number;
  executors: Executor[];
  executorTypes: ExecutorType[];
  availableVariables: { name: string; category: string }[];
  getActionsForType: (type: string) => ActionDefinition[];
  onUpdate: (field: Partial<SkillStep>) => void;
  onRemove: () => void;
}

function StepEditor({
  step,
  index,
  executors,
  executorTypes,
  availableVariables,
  getActionsForType,
  onUpdate,
  onRemove,
}: StepEditorProps) {
  const [expanded, setExpanded] = useState(true);
  const [paramsText, setParamsText] = useState(
    JSON.stringify(step.params, null, 2)
  );
  const paramsRef = useRef<HTMLTextAreaElement>(null);
  
  // 判断当前是否为自定义模型模式
  const isCustomModel = step.model !== undefined && !CLAUDE_MODELS.some(m => m.value === step.model);
  const [customModelMode, setCustomModelMode] = useState(isCustomModel);

  const typeNames = [...new Set(executors.map((e) => e.type))];
  const actionDefs = getActionsForType(step.executorType);
  const selectedAction = actionDefs.find((a) => a.name === step.action);
  const executorsOfType = executors.filter((e) => e.type === step.executorType);

  const handleParamsChange = (value: string) => {
    setParamsText(value);
    try {
      const parsed = JSON.parse(value);
      onUpdate({ params: parsed });
    } catch {
      // Invalid JSON, don't update
    }
  };

  const insertVar = (varName: string) => {
    const textarea = paramsRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue =
      paramsText.substring(0, start) +
      `{{${varName}}}` +
      paramsText.substring(end);
    setParamsText(newValue);

    try {
      JSON.parse(newValue.replace(/\{\{[^}]+\}\}/g, '"placeholder"'));
      // If it parses (with placeholder), update
    } catch {
      // Keep the text anyway for user to fix
    }

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + varName.length + 4,
        start + varName.length + 4
      );
    }, 0);
  };

  return (
    <div className="border rounded-md">
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
        <Badge variant="outline">Step {index + 1}</Badge>
        <span className="font-medium flex-1">{step.name}</span>
        <span className="text-sm text-muted-foreground">
          {step.executorType} / {step.action || '(未配置)'}
        </span>
        {expanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {expanded && (
        <div className="p-4 pt-0 space-y-4 border-t">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">步骤名称</Label>
              <Input
                value={step.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">输出变量名</Label>
              <Input
                value={step.outputVariable || ''}
                onChange={(e) => onUpdate({ outputVariable: e.target.value })}
                placeholder="result"
                className="font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">执行条件 (可选)</Label>
              <Input
                value={step.condition || ''}
                onChange={(e) => onUpdate({ condition: e.target.value })}
                placeholder="例如: {{step1.success}} === true"
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">执行器类型</Label>
              <select
                value={step.executorType}
                onChange={(e) =>
                  onUpdate({ executorType: e.target.value, action: '' })
                }
                className="w-full h-9 px-3 rounded-md border bg-background"
              >
                {typeNames.map((t) => (
                  <option key={t} value={t}>
                    {executorTypes.find((et) => et.name === t)?.displayName || t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">指定执行器 (可选)</Label>
              <select
                value={step.executorName || ''}
                onChange={(e) => onUpdate({ executorName: e.target.value })}
                className="w-full h-9 px-3 rounded-md border bg-background"
              >
                <option value="">自动选择</option>
                {executorsOfType.map((e) => (
                  <option key={e.name} value={e.name}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">动作</Label>
              <select
                value={step.action}
                onChange={(e) => onUpdate({ action: e.target.value })}
                className="w-full h-9 px-3 rounded-md border bg-background"
              >
                <option value="">选择动作</option>
                {actionDefs.map((a) => (
                  <option key={a.name} value={a.name}>
                    {a.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Model selector for claudecode executor */}
          {step.executorType === 'claudecode' && (
            <div className="space-y-1">
              <Label className="text-xs">模型 (可选)</Label>
              <div className="flex gap-2">
                <select
                  value={customModelMode ? '__custom__' : (step.model || '')}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setCustomModelMode(true);
                      onUpdate({ model: '' });
                    } else {
                      setCustomModelMode(false);
                      onUpdate({ model: e.target.value || undefined });
                    }
                  }}
                  className="flex-1 h-9 px-3 rounded-md border bg-background"
                >
                  {CLAUDE_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                  <option value="__custom__">自定义模型</option>
                </select>
                {customModelMode && (
                  <Input
                    value={step.model || ''}
                    onChange={(e) => onUpdate({ model: e.target.value || undefined })}
                    placeholder="输入自定义模型名称"
                    className="flex-1 font-mono text-xs"
                  />
                )}
              </div>
            </div>
          )}

          {selectedAction && (
            <div className="p-3 rounded-md bg-muted/50 space-y-2">
              <div className="text-sm font-medium">{selectedAction.displayName}</div>
              <div className="text-xs text-muted-foreground">{selectedAction.description}</div>
              {selectedAction.params.length > 0 && (
                <div className="space-y-1 mt-2">
                  <div className="text-xs font-medium">参数说明:</div>
                  <div className="grid gap-1">
                    {selectedAction.params.map((p) => (
                      <div key={p.name} className="text-xs flex gap-2">
                        <code className="px-1 bg-background rounded">{p.name}</code>
                        <span className="text-muted-foreground">
                          ({p.type}{p.required ? ', 必填' : ''})
                        </span>
                        <span>{p.description}</span>
                        {p.default !== undefined && (
                          <span className="text-muted-foreground">默认: {JSON.stringify(p.default)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="text-xs mt-2">
                <span className="font-medium">返回: </span>
                <span className="text-muted-foreground">{selectedAction.returns.description}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">参数 (JSON)</Label>
              <div className="flex flex-wrap gap-1">
                {availableVariables.slice(0, 8).map((v) => (
                  <button
                    key={v.name}
                    type="button"
                    onClick={() => insertVar(v.name)}
                    className="px-2 py-0.5 text-xs rounded bg-muted hover:bg-muted-foreground/20 font-mono"
                    title={v.category}
                  >
                    {v.name}
                  </button>
                ))}
                {availableVariables.length > 8 && (
                  <span className="text-xs text-muted-foreground">
                    +{availableVariables.length - 8} more
                  </span>
                )}
              </div>
            </div>
            <textarea
              ref={paramsRef}
              value={paramsText}
              onChange={(e) => handleParamsChange(e.target.value)}
              className="w-full h-32 p-3 rounded-md border bg-background font-mono text-sm resize-none"
              placeholder='{"url": "{{url}}"}'
            />
          </div>
        </div>
      )}
    </div>
  );
}
