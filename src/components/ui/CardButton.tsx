/**
 * @file CardButton.tsx
 * Reusable button for playing a duel card (Press / Feint / Shot).
 *
 * Styled with club colours: dark background, yellow accent on hover/active.
 * Disabled state shows reduced opacity and blocks interaction.
 *
 * @example
 * <CardButton card="press" onClick={() => handleCard('press')} />
 * <CardButton card="shot" onClick={() => handleCard('shot')} disabled />
 */

import { useTranslation } from 'react-i18next';
import { type Card } from '../../engine/duel';

interface CardButtonProps {
  /** The card type this button represents */
  card: Card;
  /** Called when the button is clicked (only fires when not disabled) */
  onClick: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
}

/** Emoji decorators for each card type */
const CARD_EMOJI: Record<Card, string> = {
  press: '⚔️',
  feint: '💨',
  shot: '🎯',
};

/**
 * CardButton — renders a styled card-pick button for a duel.
 *
 * @param props - CardButtonProps
 * @returns A styled button element
 */
export default function CardButton({ card, onClick, disabled = false }: CardButtonProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={`card-btn-${card}`}
      className={[
        'flex flex-col items-center justify-center',
        'w-24 h-24 rounded-xl border-2',
        'text-sm font-bold uppercase tracking-widest transition-all',
        disabled
          ? 'border-[#F5F0E8]/20 text-[#F5F0E8]/30 cursor-not-allowed'
          : 'border-[#FFE600] text-[#FFE600] hover:bg-[#FFE600] hover:text-[#1A1A1A] active:scale-95 cursor-pointer',
      ].join(' ')}
      aria-label={t(`cards.${card}`)}
    >
      <span className="text-2xl mb-1">{CARD_EMOJI[card]}</span>
      <span>{t(`cards.${card}`)}</span>
    </button>
  );
}
