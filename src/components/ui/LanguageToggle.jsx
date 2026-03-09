import { useTranslation } from 'react-i18next';
import { useSessionStore } from '../../store/sessionStore';

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const { language, setLanguage } = useSessionStore();

  function toggle() {
    const next = language === 'en' ? 'fi' : 'en';
    setLanguage(next);
    i18n.changeLanguage(next);
  }

  return (
    <button onClick={toggle} className="text-sm font-bold uppercase tracking-widest">
      {language === 'en' ? 'FI' : 'EN'}
    </button>
  );
}
