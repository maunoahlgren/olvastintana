/**
 * @file App.tsx
 * Application root. Shows the club title and language toggle.
 * Acts as the screen router — will grow as phases are built out.
 */

import { useTranslation } from 'react-i18next';
import './i18n/index.ts';
import LanguageToggle from './components/ui/LanguageToggle';

export default function App(): JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#1A1A1A] text-[#F5F0E8]">
      <header className="w-full flex justify-end p-4 absolute top-0">
        <LanguageToggle />
      </header>

      <main className="flex flex-col items-center gap-4 text-center px-6">
        <div className="text-8xl font-black tracking-tight leading-none text-[#FFE600]">
          {t('app.title')}
        </div>
        <div className="text-xl font-semibold tracking-widest uppercase text-[#F5F0E8]/60">
          {t('app.tagline')}
        </div>
        <div className="mt-8 text-sm text-[#F5F0E8]/40">2005 – 2025</div>
      </main>
    </div>
  );
}
