/**
 * @file PlayerCard.tsx
 * Displays a player's name, position, stats, and ability.
 *
 * Optionally shows a selected/highlighted state (for lineup picking)
 * and applies stat modifier overlays (e.g. trivia -1 penalty).
 *
 * @example
 * <PlayerCard player={alanen} />
 * <PlayerCard player={alanen} selected onSelect={() => pick(alanen)} />
 * <PlayerCard player={alanen} statModifier={{ pace: -1 }} />
 */

import { useTranslation } from 'react-i18next';
import type { Player } from '../../store/squadStore';
import type { PlayerStats } from '../../engine/duel';

interface PlayerCardProps {
  /** Player data from players.json */
  player: Player;
  /** Whether this card is in a selected state (lineup picking) */
  selected?: boolean;
  /** Called when the card is clicked */
  onSelect?: () => void;
  /** Stat modifiers applied this match (trivia penalty, Sattuma, etc.) */
  statModifier?: Partial<PlayerStats>;
  /** Show the ability description block */
  showAbility?: boolean;
}

const STAT_KEYS: (keyof PlayerStats)[] = ['pace', 'technique', 'power', 'iq', 'stamina', 'chaos'];

/** Ability type icons */
const ABILITY_ICON: Record<string, string> = {
  boost: '💥',
  chaos: '🎲',
  reactive: '⚡',
  restriction: '🔒',
  dominant: '🏆',
};

/**
 * PlayerCard — shows a player's full card for lineup selection or display.
 *
 * @param props - PlayerCardProps
 * @returns A styled player card element
 */
export default function PlayerCard({
  player,
  selected = false,
  onSelect,
  statModifier = {},
  showAbility = true,
}: PlayerCardProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'fi' ? 'fi' : 'en';

  const abilityName = lang === 'fi' ? player.ability.name_fi : player.ability.name_en;
  const abilityDesc = lang === 'fi' ? player.ability.description_fi : player.ability.description_en;

  return (
    <div
      data-testid={`player-card-${player.id}`}
      onClick={onSelect}
      className={[
        'rounded-xl border-2 p-3 flex flex-col gap-2 transition-all',
        onSelect ? 'cursor-pointer' : '',
        selected
          ? 'border-[#FFE600] bg-[#FFE600]/10'
          : 'border-[#F5F0E8]/20 bg-[#1A1A1A]',
      ].join(' ')}
    >
      {/* Header: name + positions */}
      <div className="flex items-center justify-between">
        <span
          data-testid={`player-name-${player.id}`}
          className="font-black text-base text-[#F5F0E8] uppercase tracking-wide"
        >
          {player.name}
        </span>
        <span className="text-xs text-[#F5F0E8]/50 font-bold">
          {player.position.join(' · ')}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-x-4 gap-y-1">
        {STAT_KEYS.map((key) => {
          const base = player.stats[key];
          const mod = statModifier[key] ?? 0;
          const effective = base + mod;
          return (
            <div key={key} className="flex justify-between text-xs">
              <span className="text-[#F5F0E8]/50 uppercase">{t(`stats.${key}`)}</span>
              <span
                data-testid={`stat-${player.id}-${key}`}
                className={mod < 0 ? 'text-red-400 font-bold' : 'text-[#FFE600] font-bold'}
              >
                {effective}
              </span>
            </div>
          );
        })}
      </div>

      {/* Ability */}
      {showAbility && (
        <div className="mt-1 border-t border-[#F5F0E8]/10 pt-2">
          <div className="flex items-center gap-1 text-xs">
            <span>{ABILITY_ICON[player.ability.type] ?? '?'}</span>
            <span className="font-bold text-[#FFE600]">{abilityName}</span>
          </div>
          <p className="text-xs text-[#F5F0E8]/60 mt-0.5">{abilityDesc}</p>
        </div>
      )}
    </div>
  );
}
