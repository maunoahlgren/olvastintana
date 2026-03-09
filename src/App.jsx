import { useTranslation } from 'react-i18next';
import './i18n/index.js';
import LanguageToggle from './components/ui/LanguageToggle';

export default function App() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-yellow-400 text-black">
      <header className="w-full flex justify-end p-4 absolute top-0">
        <LanguageToggle />
      </header>

      <main className="flex flex-col items-center gap-4 text-center px-6">
        <div className="text-8xl font-black tracking-tight leading-none">
          {t('app.title')}
        </div>
        <div className="text-xl font-semibold tracking-widest uppercase text-black/60">
          {t('app.tagline')}
        </div>
        <div className="mt-8 text-sm text-black/40">2005 – 2025</div>
      </main>
    </div>
  );
}
