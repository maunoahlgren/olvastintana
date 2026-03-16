/**
 * @file DerbyResultScreen.tsx
 * Derby Night result screen — shown on all devices at the end of the match.
 *
 * Displays:
 *   - Final score
 *   - Win / Draw / Loss banner (contextual to role)
 *   - Manager names (p1 = host, p2 = player)
 *   - "Back to Lobby" button → resets room and returns to title screen
 *
 * All devices (host, player, spectator) see the same result layout.
 * The "Back to Lobby" button is available to all devices; each resets their own state.
 */

import { useTranslation } from 'react-i18next';
import { useRoomStore } from '../../store/roomStore';
import { useDerbyStore } from '../../store/derbyStore';
import { useMatchStore } from '../../store/matchStore';
import { MATCH_PHASE } from '../../engine/match';
import managersData from '../../data/managers.json';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Manager {
  id: string;
  display_name: string;
  color: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * DerbyResultScreen — full-time result display for all Derby Night devices.
 *
 * @returns The final match result screen
 */
export default function DerbyResultScreen(): JSX.Element {
  const { t } = useTranslation();
  const role = useRoomStore((s) => s.role);
  const myManagerId = useRoomStore((s) => s.myManagerId);
  const connectedPlayers = useRoomStore((s) => s.connectedPlayers);
  const scoreHome = useDerbyStore((s) => s.scoreHome);
  const scoreAway = useDerbyStore((s) => s.scoreAway);
  const resetRoom = useRoomStore((s) => s.reset);
  const resetDerby = useDerbyStore((s) => s.reset);
  const resetMatch = useMatchStore((s) => s.reset);

  const managers = managersData as Manager[];

  // Identify p1 (host) and p2 (player) from connected players
  const hostPlayer = connectedPlayers.find((p) => p.isHost);
  const guestPlayer = connectedPlayers.find((p) => !p.isHost);

  const p1Manager = managers.find((m) => m.id === hostPlayer?.managerId);
  const p2Manager = managers.find((m) => m.id === guestPlayer?.managerId);

  /** Determine outcome label from this device's perspective */
  function getOutcomeLabel(): string {
    if (scoreHome === scoreAway) return t('derby_match.result_draw');

    if (role === 'host') {
      return scoreHome > scoreAway
        ? t('derby_match.result_win')
        : t('derby_match.result_loss');
    }
    if (role === 'player') {
      return scoreAway > scoreHome
        ? t('derby_match.result_win')
        : t('derby_match.result_loss');
    }
    // Spectator / big screen — show neutral
    return scoreHome > scoreAway
      ? `${t('derby_match.p1_label')} ${t('derby_match.result_win')}`
      : `${t('derby_match.p2_label')} ${t('derby_match.result_win')}`;
  }

  /** Outcome colour */
  function getOutcomeColour(): string {
    if (scoreHome === scoreAway) return 'text-[#FFE600]';
    if (role === 'host') return scoreHome > scoreAway ? 'text-green-400' : 'text-red-400';
    if (role === 'player') return scoreAway > scoreHome ? 'text-green-400' : 'text-red-400';
    return 'text-[#FFE600]';
  }

  /**
   * Reset all stores and return to the title screen.
   */
  function handleBackToLobby(): void {
    resetRoom();
    resetDerby();
    resetMatch();
  }

  return (
    <div
      className="min-h-screen bg-[#1A1A1A] text-[#F5F0E8] flex flex-col items-center justify-center p-8 gap-8"
      data-testid="derby-result-screen"
    >
      {/* Title */}
      <h1 className="text-2xl font-bold text-[#FFE600]">{t('derby_match.result_title')}</h1>

      {/* Outcome banner */}
      <div className={`text-4xl font-black ${getOutcomeColour()}`} data-testid="result-outcome">
        {getOutcomeLabel()}
      </div>

      {/* Score board */}
      <div className="flex items-center gap-6" data-testid="result-scoreboard">
        {/* p1 / Home */}
        <div className="flex flex-col items-center gap-1">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black text-[#1A1A1A]"
            style={{ backgroundColor: p1Manager?.color ?? '#888' }}
          >
            {(p1Manager?.display_name ?? 'H')[0]}
          </div>
          <span className="text-sm text-[#A0A0A0]">{p1Manager?.display_name ?? t('derby_match.p1_label')}</span>
        </div>

        <div className="text-5xl font-black text-[#FFE600]" data-testid="final-score">
          {scoreHome} – {scoreAway}
        </div>

        {/* p2 / Away */}
        <div className="flex flex-col items-center gap-1">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black text-[#1A1A1A]"
            style={{ backgroundColor: p2Manager?.color ?? '#888' }}
          >
            {(p2Manager?.display_name ?? 'A')[0]}
          </div>
          <span className="text-sm text-[#A0A0A0]">{p2Manager?.display_name ?? t('derby_match.p2_label')}</span>
        </div>
      </div>

      {/* Goal tally labels */}
      <div className="flex gap-6 text-xs text-[#A0A0A0]">
        <span>{t('derby_match.result_home')}</span>
        <span>–</span>
        <span>{t('derby_match.result_away')}</span>
      </div>

      {/* Back to lobby */}
      <button
        data-testid="back-to-lobby-btn"
        onClick={handleBackToLobby}
        className="mt-4 px-8 py-3 rounded-lg bg-[#FFE600] text-[#1A1A1A] font-bold hover:bg-[#FFD000] transition-colors"
      >
        {t('derby_match.result_next')}
      </button>
    </div>
  );
}
