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
  Bell,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchSkills, fetchSkillDefinitions, Skill, SkillDefinition } from '@/api/skills';
import { getLocalizedSkillName } from '@/hooks/useLocalizedSkill';

// Navigation item type definition
type NavItem = {
  id: string;
  path?: string;
  labelKey: string;
  icon: LucideIcon;
  expandable?: {
    basePath: string;
    staticChildren?: { path: string; labelKey: string; icon?: LucideIcon; end?: boolean }[];
    dynamicChildren?: boolean;
  };
};

// Navigation configuration
const navConfig: NavItem[] = [
  { id: 'dashboard', path: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { id: 'executors', path: '/executors', labelKey: 'nav.executors', icon: Cpu },
  { id: 'obsidian', path: '/obsidian', labelKey: 'nav.obsidian', icon: BookOpen },
  {
    id: 'skills',
    labelKey: 'nav.skills',
    icon: Zap,
    expandable: {
      basePath: '/skills',
      staticChildren: [
        { path: '/skills', labelKey: 'nav.manageSkills', icon: List, end: true }
      ],
      dynamicChildren: true,
    },
  },
  { id: 'notifications', path: '/notifications', labelKey: 'nav.notifications', icon: Bell },
  { id: 'settings', path: '/settings', labelKey: 'nav.settings', icon: Settings },
];

export function Sidebar() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [skills, setSkills] = useState<Skill[]>([]);
  const [definitions, setDefinitions] = useState<SkillDefinition[]>([]);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({ skills: true });
  const location = useLocation();

  useEffect(() => {
    Promise.all([fetchSkills(), fetchSkillDefinitions()])
      .then(([skillsList, defsList]) => {
        setSkills(skillsList);
        setDefinitions(defsList);
      })
      .catch((err) => console.error('Failed to load skills:', err));
  }, [location.pathname]);

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

  const toggleMenu = (id: string) => {
    setExpandedMenus(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;

    // Simple nav item (no expandable)
    if (!item.expandable) {
      return (
        <NavLink
          key={item.id}
          to={item.path!}
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
          {t(item.labelKey)}
        </NavLink>
      );
    }

    // Expandable nav item
    const isActive = location.pathname.startsWith(item.expandable.basePath);
    const isExpanded = expandedMenus[item.id] ?? false;

    return (
      <div key={item.id}>
        <button
          onClick={() => toggleMenu(item.id)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            isActive
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <Icon className="h-4 w-4" />
          <span className="flex-1 text-left">{t(item.labelKey)}</span>
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {isExpanded && (
          <div className="ml-4 mt-1 space-y-1">
            {/* Static children */}
            {item.expandable.staticChildren?.map((child) => {
              const ChildIcon = child.icon;
              return (
                <NavLink
                  key={child.path}
                  to={child.path}
                  end={child.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )
                  }
                >
                  {ChildIcon && <ChildIcon className="h-3 w-3" />}
                  {t(child.labelKey)}
                </NavLink>
              );
            })}
            {/* Dynamic children for skills */}
            {item.expandable.dynamicChildren && item.id === 'skills' && skills.map((skill) => {
              const def = getDefinition(skill.id);
              const hasSchedule = def?.schedule?.enabled;
              const hasRequiredInputs = def?.userInputs?.some(i => i.required);
              const needsConfig = hasSchedule && hasRequiredInputs &&
                !def?.userInputs?.filter(i => i.required).every(i => i.defaultValue !== undefined);

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
    );
  };

  return (
    <aside className="w-56 border-r bg-card flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-lg font-bold">Agent Service</h1>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navConfig.map(renderNavItem)}
      </nav>
    </aside>
  );
}
