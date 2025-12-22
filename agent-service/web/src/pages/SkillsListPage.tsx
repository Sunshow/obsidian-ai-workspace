import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Zap, Edit, Trash2, Play, Lock, RefreshCw } from 'lucide-react';
import {
  fetchSkills,
  fetchSkillDefinitions,
  deleteSkillDefinition,
  reloadSkills,
  Skill,
  SkillDefinition,
} from '@/api/skills';

export default function SkillsListPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [, setDefinitions] = useState<SkillDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [skillsList, defsList] = await Promise.all([
        fetchSkills(),
        fetchSkillDefinitions(),
      ]);
      setSkills(skillsList);
      setDefinitions(defsList);
    } catch (error) {
      console.error('Failed to load skills:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个技能吗？')) return;
    try {
      await deleteSkillDefinition(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete skill:', error);
    }
  };

  const handleReload = async () => {
    setReloading(true);
    try {
      await reloadSkills();
      await loadData();
    } catch (error) {
      console.error('Failed to reload skills:', error);
    } finally {
      setReloading(false);
    }
  };

  const builtinSkills = skills.filter((s) => s.builtin || s.reserved);
  const customSkills = skills.filter((s) => !s.builtin && !s.reserved);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Skills</h1>
          <p className="text-muted-foreground">管理和创建自动化技能</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReload} disabled={reloading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${reloading ? 'animate-spin' : ''}`} />
            刷新配置
          </Button>
          <Button onClick={() => navigate('/skills/new')}>
            <Plus className="mr-2 h-4 w-4" />
            创建技能
          </Button>
        </div>
      </div>

      {/* Builtin Skills */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">内置技能</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {builtinSkills.map((skill) => (
            <Card key={skill.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    {skill.name}
                  </CardTitle>
                  <Badge variant="secondary">
                    <Lock className="h-3 w-3 mr-1" />
                    内置
                  </Badge>
                </div>
                <CardDescription className="text-sm">
                  {skill.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate(`/skills/${skill.id}`)}
                >
                  <Play className="mr-2 h-4 w-4" />
                  运行
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Custom Skills */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">自定义技能</h2>
        {customSkills.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Zap className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">暂无自定义技能</p>
              <Button onClick={() => navigate('/skills/new')}>
                <Plus className="mr-2 h-4 w-4" />
                创建第一个技能
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {customSkills.map((skill) => {
              return (
                <Card key={skill.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        {skill.name}
                      </CardTitle>
                      <Badge variant={skill.enabled ? 'default' : 'secondary'}>
                        {skill.enabled ? '已启用' : '已禁用'}
                      </Badge>
                    </div>
                    <CardDescription className="text-sm">
                      {skill.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/skills/${skill.id}`)}
                        disabled={!skill.enabled}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        运行
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/skills/${skill.id}/edit`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(skill.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
