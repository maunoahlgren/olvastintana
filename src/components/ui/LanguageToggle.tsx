import { useTranslation } from 'react-i18next';
import { useSessionStore, type Language } from '../../store/sessionStore';

export default function LanguageToggle(): JSX.Element {
  const { i18n } = useTranslation();
  const { language, setLanguage } = useSessionStore();

  function toggle() {
    const next: Language = language === 'fi' ? 'en' : 'fi';
    setLanguage(next);
    i18n.changeLanguage(next);
  }

  return (
    <button
      data-testid="language-toggle"
      onClick={toggle}
      className="text-sm font-bold uppercase tracking-widest"
    >
      {language === 'fi' ? 'EN' : 'FI'}
    </button>
  );
}
