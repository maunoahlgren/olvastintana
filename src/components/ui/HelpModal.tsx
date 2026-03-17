/**
 * @file HelpModal.tsx
 * In-game help modal for DuelScreen and DerbyDuelScreen.
 *
 * Displays:
 *   - The card triangle (Press beats Feint, Feint beats Shot, Shot beats Press)
 *   - Possession rule (only the ball-holder can attempt a goal)
 *   - Current tactics (solo DuelScreen only — passed as props)
 *   - Active card restrictions (solo DuelScreen only — passed as props)
 *
 * Dismissable by:
 *   - Tapping the backdrop
 *   - Tapping the × close button
 *   - Tapping the close button at the bottom
 *
 * @example
 * <HelpModal
 *   onClose={() => setShowHelp(false)}
 *   homeTactic="aggressive"
 *   awayTactic="defensive"
 *   restrictions={{ press: false, feint: true, shot: false }}
 * />
 */

import { useTranslation } from 'react-i18next';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Tactic type — mirrors the engine Tactic type without importing the engine */
type Tactic = 'aggressive' | 'defensive' | 'creative';

interface HelpModalProps {
  /** Called when the modal should be dismissed */
  onClose: () => void;
  /**
   * Home team's current tactic (solo DuelScreen only).
   * Omit or pass null/undefined for Derby Night.
   */
  homeTactic?: Tactic | null;
  /**
   * Away team's current tactic (solo DuelScreen only).
   * Omit or pass null/undefined for Derby Night.
   */
  awayTactic?: Tactic | null;
  /**
   * Active card restrictions for the current attacker/player.
   * Omit for Derby Night (no restriction system in Derby).
   */
  restrictions?: {
    /** True if Press is blocked this duel */
    press: boolean;
    /** True if Feint is blocked this duel */
    feint: boolean;
    /** True if Shot is blocked this duel */
    shot: boolean;
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * HelpModal — persistent in-game reference card.
 *
 * @param onClose      - Callback to close the modal
 * @param homeTactic   - Home side tactic (optional)
 * @param awayTactic   - Away side tactic (optional)
 * @param restrictions - Active card blocks for this duel (optional)
 * @returns The help modal overlay
 */
export default function HelpModal({
  onClose,
  homeTactic,
  awayTactic,
  restrictions,
}: HelpModalProps): JSX.Element {
  const { t } = useTranslation();

  const hasRestrictions =
    restrictions &&
    (restrictions.press || restrictions.feint || restrictions.shot);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
      data-testid="help-modal-backdrop"
    >
      <div
        className="bg-[#1A1A1A] border border-[#333] rounded-2xl p-6 max-w-sm w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        data-testid="help-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('help.title')}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-[#FFE600]">
            {t('help.title')}
          </h2>
          <button
            data-testid="help-close-x"
            onClick={onClose}
            className="text-[#A0A0A0] hover:text-[#F5F0E8] text-2xl leading-none transition-colors"
            aria-label={t('help.close')}
          >
            ×
          </button>
        </div>

        {/* ── Card Triangle ─────────────────────────────────────────────── */}
        <section className="mb-5" data-testid="help-triangle-section">
          <h3 className="text-xs font-bold text-[#A0A0A0] uppercase tracking-widest mb-3">
            {t('help.card_triangle')}
          </h3>
          <ul className="flex flex-col gap-2 text-sm text-[#F5F0E8]">
            <li data-testid="help-press-beats-feint" className="flex items-center gap-2">
              <span className="text-base">⚔️</span>
              <span>{t('help.press_beats_feint')}</span>
            </li>
            <li data-testid="help-feint-beats-shot" className="flex items-center gap-2">
              <span className="text-base">💨</span>
              <span>{t('help.feint_beats_shot')}</span>
            </li>
            <li data-testid="help-shot-beats-press" className="flex items-center gap-2">
              <span className="text-base">🎯</span>
              <span>{t('help.shot_beats_press')}</span>
            </li>
          </ul>
        </section>

        {/* ── Possession Rule ───────────────────────────────────────────── */}
        <section className="mb-5" data-testid="help-possession-section">
          <h3 className="text-xs font-bold text-[#A0A0A0] uppercase tracking-widest mb-2">
            {t('help.possession')}
          </h3>
          <p className="text-sm text-[#F5F0E8]/80">
            ⚽ {t('help.possession_rule')}
          </p>
        </section>

        {/* ── Tactics (solo DuelScreen only) ────────────────────────────── */}
        {(homeTactic || awayTactic) && (
          <section className="mb-5" data-testid="help-tactics-section">
            <h3 className="text-xs font-bold text-[#A0A0A0] uppercase tracking-widest mb-2">
              {t('help.tactic')}
            </h3>
            {homeTactic && (
              <p data-testid="help-home-tactic" className="text-sm text-[#F5F0E8]/80 mb-1">
                🏠 {t(`help.tactic_${homeTactic}`)}
              </p>
            )}
            {awayTactic && (
              <p data-testid="help-away-tactic" className="text-sm text-[#F5F0E8]/80">
                ✈️ {t(`help.tactic_${awayTactic}`)}
              </p>
            )}
          </section>
        )}

        {/* ── Active Restrictions (solo DuelScreen only) ────────────────── */}
        {hasRestrictions && (
          <section className="mb-5" data-testid="help-restrictions-section">
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2">
              {t('help.restrictions')}
            </h3>
            <ul className="flex flex-col gap-1 text-sm">
              {restrictions!.press && (
                <li data-testid="help-press-blocked" className="text-red-400">
                  ⚔️ {t('cards.press')} — {t('help.card_blocked')}
                </li>
              )}
              {restrictions!.feint && (
                <li data-testid="help-feint-blocked" className="text-red-400">
                  💨 {t('cards.feint')} — {t('help.card_blocked')}
                </li>
              )}
              {restrictions!.shot && (
                <li data-testid="help-shot-blocked" className="text-red-400">
                  🎯 {t('cards.shot')} — {t('help.card_blocked')}
                </li>
              )}
            </ul>
          </section>
        )}

        {/* ── Close Button ──────────────────────────────────────────────── */}
        <button
          data-testid="help-close-btn"
          onClick={onClose}
          className="w-full py-3 border border-[#444] text-[#A0A0A0] rounded-xl hover:border-[#FFE600] hover:text-[#FFE600] transition-colors font-bold"
        >
          {t('help.close')}
        </button>
      </div>
    </div>
  );
}
