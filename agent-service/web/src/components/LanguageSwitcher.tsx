import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';

const languages = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className="relative inline-flex items-center">
      <Globe className="h-4 w-4 absolute left-2 pointer-events-none text-muted-foreground" />
      <select
        value={i18n.language.startsWith('zh') ? 'zh' : i18n.language}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className="appearance-none bg-transparent border rounded-md pl-8 pr-7 py-1.5 text-sm cursor-pointer hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
      <ChevronDown className="h-4 w-4 absolute right-2 pointer-events-none text-muted-foreground" />
    </div>
  );
}
