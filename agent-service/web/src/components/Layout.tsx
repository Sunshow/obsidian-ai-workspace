import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useTheme } from '@/hooks/useTheme';

export function Layout() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b flex items-center justify-end px-4 gap-2">
          <LanguageSwitcher />
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
