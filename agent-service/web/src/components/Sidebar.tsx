import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Cpu,
  BookOpen,
  Zap,
  Settings,
  ChevronDown,
  ChevronRight,
  List,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchSkills, fetchSkillDefinitions, Skill, SkillDefinition } from '@/api/skills';
import { getLocalizedSkillName } from '@/hooks/useLocalizedSkill';

const navItems = [
  { path: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { path: '/executors', labelKey: 'nav.executors', icon: Cpu },
  { path: '/obsidian', labelKey: 'nav.obsidian', icon: BookOpen },
  { path: '/settings', labelKey: 'nav.settings', icon: Settings },
];

export function Sidebar() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [skills, setSkills] = useState<Skill[]>([]);
  const [definitions, setDefinitions] = useState<SkillDefinition[]>([]);
  const [skillsExpanded, setSkillsExpanded] = useState(true);
  const location = useLocation();

  // 当路径变化时刷新技能列表（包括从技能创建页面返回）
  useEffect(() => {
    Promise.all([fetchSkills(), fetchSkillDefinitions()])
      .then(([skillsList, defsList]) => {
        setSkills(skillsList);
        setDefinitions(defsList);
      })
      .catch((err) => console.error('Failed to load skills:', err));
  }, [location.pathname]);

  // 监听自定义事件刷新技能列表
  useEffect(() => {
    const handleSkillsUpdated = () => {
      Promise.all([fetchSkills(), fetchSkillDefinitions()])
        .then(([skillsList, defsList]) => {
          setSkills(skillsList);
          setDefinitions(defsList);
        })
        .catch((err) => console.error('Failed to load skills:', err));
    };
    window.addEventListener('skills-updated', handleSkillsUpdated);
    return () => window.removeEventListener('skills-updated', handleSkillsUpdated);
  }, []);

  const getDefinition = (skillId: string) => definitions.find(d => d.id === skillId);

  const isSkillsActive = location.pathname.startsWith('/skills');

  return (
    <aside className="w-56 border-r bg-card flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-lg font-bold">Agent Service</h1>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.slice(0, 3).map(({ path, labelKey, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <Icon className="h-4 w-4" />
            {t(labelKey)}
          </NavLink>
        ))}

        {/* Skills multi-level menu */}
        <div>
          <button
            onClick={() => setSkillsExpanded(!skillsExpanded)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isSkillsActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Zap className="h-4 w-4" />
            <span className="flex-1 text-left">{t('nav.skills')}</span>
            {skillsExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          {skillsExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              <NavLink
                to="/skills"
                end
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )
                }
              >
                <List className="h-3 w-3" />
                {t('nav.manageSkills')}
              </NavLink>
              {skills.map((skill) => {
                const def = getDefinition(skill.id);
                const hasSchedule = def?.schedule?.enabled;
                const hasRequiredInputs = def?.userInputs?.some(i => i.required);
                const needsConfig = hasSchedule && hasRequiredInputs && 
                  !def?.userInputs?.filter(i => i.required).every(i => 
                    i.defaultValue !== undefined
                  );
                
                return (
                <NavLink
                  key={skill.id}
                  to={`/skills/${skill.id}`}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )
                  }
                >
                  <span className="flex-1 truncate">{getLocalizedSkillName(skill, lang)}</span>
                  {hasSchedule && (
                    <span 
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${needsConfig ? 'bg-destructive' : 'bg-green-500'}`} 
                      title={needsConfig ? t('skills.scheduleNeedsConfig') : t('skills.scheduled')}
                    />
                  )}
                </NavLink>
                );
              })}
            </div>
          )}
        </div>

        {navItems.slice(3).map(({ path, labelKey, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <Icon className="h-4 w-4" />
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
