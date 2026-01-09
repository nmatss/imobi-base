import { useTranslation } from 'react-i18next';
import { LANGUAGES, type LanguageCode } from '@/i18n/config';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Languages, Check } from 'lucide-react';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language as LanguageCode;

  const changeLanguage = (lang: LanguageCode) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <span className="text-xl">{LANGUAGES[currentLanguage]?.flag || '🌐'}</span>
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(LANGUAGES).map(([code, lang]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => changeLanguage(code as LanguageCode)}
            className="gap-2 cursor-pointer"
          >
            <span className="text-lg">{lang.flag}</span>
            <span>{lang.name}</span>
            {currentLanguage === code && <Check className="h-4 w-4 ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
