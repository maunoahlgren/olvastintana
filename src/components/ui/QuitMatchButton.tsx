/**
 * @file QuitMatchButton.tsx
 * Unobtrusive "back to home" button for solo match screens.
 *
 * Renders a small, low-contrast button. Tapping it opens a confirmation
 * dialog before navigating away, so an accidental tap cannot destroy progress.
 *
 * On confirm:
 *   1. Remove persisted session from localStorage (prevents re-entering the
 *      abandoned match on next page load)
 *   2. Reset matchStore → phase becomes TITLE → App router shows TitleScreen
 *
 * The squadStore is intentionally NOT reset here; lineup selection always
 * starts from a clean local state on the LineupScreen, so stale squad data
 * causes no visible issue.
 *
 * Used on: TriviaScreen, LineupScreen, DuelScreen, HalftimeScreen.
 * NOT used on: ResultScreen (match is already over).
 *
 * @example
 * // Drop anywhere in the screen header area
 * <QuitMatchButton />
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../store/matchStore';

// The same key used by useSessionPersistence
const SESSION_KEY = 'ot_session';

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * QuitMatchButton — renders a small quit link plus a confirmation overlay.
 *
 * @returns The quit button element (and conditionally the confirm dialog)
 */
export default function QuitMatchButton(): JSX.Element {
  const { t } = useTranslation();
  const reset = useMatchStore((s) => s.reset);
  const [confirming, setConfirming] = useState(false);

  /**
   * Navigate back to the title screen.
   * Clears localStorage session first so the refresh-protection hook does
   * not re-enter the abandoned match on the next page load.
   */
  function handleConfirm(): void {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // Private browsing or quota issues — proceed anyway
    }
    reset();
  }

  return (
    <>
      {/* Small trigger button */}
      <button
        data-testid="quit-match-btn"
        onClick={() => setConfirming(true)}
        className="text-xs text-[#F5F0E8]/40 hover:text-[#F5F0E8]/70 font-medium transition-colors px-1"
      >
        {t('quit.btn')}
      </button>

      {/* Confirmation dialog overlay */}
      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75"
          data-testid="quit-confirm-overlay"
          onClick={() => setConfirming(false)}
        >
          <div
            className="bg-[#1A1A1A] border border-[#333] rounded-2xl p-6 max-w-xs w-full mx-4 flex flex-col gap-4"
            data-testid="quit-confirm-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-black text-[#F5F0E8]">
              {t('quit.title')}
            </h2>
            <p
              data-testid="quit-confirm-message"
              className="text-sm text-[#F5F0E8]/70 leading-snug"
            >
              {t('quit.message')}
            </p>
            <div className="flex gap-3">
              <button
                data-testid="quit-cancel-btn"
                onClick={() => setConfirming(false)}
                className="flex-1 py-2 rounded-lg border border-[#444] text-[#A0A0A0] font-bold hover:border-[#666] hover:text-[#F5F0E8] transition-colors"
              >
                {t('quit.cancel')}
              </button>
              <button
                data-testid="quit-confirm-btn"
                onClick={handleConfirm}
                className="flex-1 py-2 rounded-lg bg-red-700 text-white font-black hover:bg-red-600 transition-colors"
              >
                {t('quit.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
