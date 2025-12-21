import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
import { fetchSkills, Skill } from '@/api/skills';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/executors', label: 'Executors', icon: Cpu },
  { path: '/obsidian', label: 'Obsidian', icon: BookOpen },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillsExpanded, setSkillsExpanded] = useState(true);
  const location = useLocation();

  useEffect(() => {
    fetchSkills()
      .then(setSkills)
      .catch((err) => console.error('Failed to load skills:', err));
  }, []);

  const isSkillsActive = location.pathname.startsWith('/skills');

  return (
    <aside className="w-56 border-r bg-card flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-lg font-bold">Agent Service</h1>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.slice(0, 3).map(({ path, label, icon: Icon }) => (
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
            {label}
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
            <span className="flex-1 text-left">Skills</span>
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
                管理技能
              </NavLink>
              {skills.map((skill) => (
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
                  {skill.name}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {navItems.slice(3).map(({ path, label, icon: Icon }) => (
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
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
