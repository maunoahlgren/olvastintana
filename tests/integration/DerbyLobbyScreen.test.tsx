/**
 * @file DerbyLobbyScreen.test.tsx
 * Integration tests for DerbyLobbyScreen.
 *
 * Firebase room functions are mocked at the module level so no real
 * Firebase SDK calls are made during tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderWithProviders } from '../utils/renderWithProviders';
import DerbyLobbyScreen from '../../src/components/screens/DerbyLobbyScreen';
import { useMatchStore } from '../../src/store/matchStore';
import { useRoomStore } from '../../src/store/roomStore';
import { MATCH_PHASE } from '../../src/engine/match';

// ─── Mock firebase/room ───────────────────────────────────────────────────────

vi.mock('../../src/firebase/room', () => ({
  generateRoomCode: vi.fn(() => 'TEST'),
  createRoom:       vi.fn(() => Promise.resolve()),
  roomExists:       vi.fn(() => Promise.resolve(true)),
  joinRoom:         vi.fn(() => Promise.resolve(true)),
  startRoom:        vi.fn(() => Promise.resolve()),
  listenToRoom:     vi.fn(() => vi.fn()), // returns unsubscribe fn
  leaveRoom:        vi.fn(() => Promise.resolve()),
}));

vi.mock('../../src/firebase/derbyMatch', () => ({
  initMatch:      vi.fn(() => Promise.resolve()),
  listenToMatch:  vi.fn(() => vi.fn()),
}));

import * as roomModule from '../../src/firebase/room';
const mockGenerateCode = vi.mocked(roomModule.generateRoomCode);
const mockCreateRoom   = vi.mocked(roomModule.createRoom);
const mockRoomExists   = vi.mocked(roomModule.roomExists);
const mockJoinRoom     = vi.mocked(roomModule.joinRoom);
const mockStartRoom    = vi.mocked(roomModule.startRoom);

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  useMatchStore.getState().reset();
  useRoomStore.getState().reset();
});

// ─── Helper: complete host create-room flow ───────────────────────────────────

/**
 * Navigates through the two-step host create-room flow:
 *   1. Click "Create Room" → host_manager view
 *   2. Pick the first manager card
 *   3. Click "Create Room" (confirm) → hosting view
 *
 * Resolves once `room-code-display` is visible.
 */
async function goThroughCreateRoomFlow(): Promise<void> {
  fireEvent.click(screen.getByTestId('create-room-btn'));
  await waitFor(() => screen.getByTestId('host-manager-grid'));
  const cards = screen.getAllByTestId(/^host-manager-card-/);
  fireEvent.click(cards[0]);
  fireEvent.click(screen.getByTestId('create-room-confirm-btn'));
  await waitFor(() => screen.getByTestId('room-code-display'));
}

// ─── Static rendering ────────────────────────────────────────────────────────

describe('DerbyLobbyScreen — initial render', () => {
  it('renders the Derby Night title', () => {
    renderWithProviders(<DerbyLobbyScreen />);
    expect(screen.getByText('Derby Night')).toBeInTheDocument();
  });

  it('renders the Create Room button', () => {
    renderWithProviders(<DerbyLobbyScreen />);
    expect(screen.getByTestId('create-room-btn')).toBeInTheDocument();
  });

  it('renders the Join Room button', () => {
    renderWithProviders(<DerbyLobbyScreen />);
    expect(screen.getByTestId('join-room-btn')).toBeInTheDocument();
  });

  it('renders the Back button', () => {
    renderWithProviders(<DerbyLobbyScreen />);
    expect(screen.getByTestId('back-btn')).toBeInTheDocument();
  });
});

// ─── Create Room flow ─────────────────────────────────────────────────────────

describe('DerbyLobbyScreen — Create Room', () => {
  it('shows room code after creating a room', async () => {
    mockGenerateCode.mockReturnValue('G7KP');
    renderWithProviders(<DerbyLobbyScreen />);
    await goThroughCreateRoomFlow();
    expect(screen.getByTestId('room-code-display')).toHaveTextContent('G7KP');
  });

  it('calls createRoom with the generated code', async () => {
    mockGenerateCode.mockReturnValue('G7KP');
    renderWithProviders(<DerbyLobbyScreen />);
    await goThroughCreateRoomFlow();
    expect(mockCreateRoom).toHaveBeenCalledWith('G7KP', expect.any(String), expect.any(String));
  });

  it('shows the QR code image after creating a room', async () => {
    mockGenerateCode.mockReturnValue('ABCD');
    renderWithProviders(<DerbyLobbyScreen />);
    await goThroughCreateRoomFlow();
    expect(screen.getByTestId('qr-code-img')).toBeInTheDocument();
  });

  it('Start Game button is disabled when fewer than 2 players connected', async () => {
    mockGenerateCode.mockReturnValue('G7KP');
    renderWithProviders(<DerbyLobbyScreen />);
    await goThroughCreateRoomFlow();
    expect(screen.getByTestId('start-game-btn')).toBeDisabled();
  });

  it('Start Game button is enabled when 2+ players are connected', async () => {
    mockGenerateCode.mockReturnValue('G7KP');
    renderWithProviders(<DerbyLobbyScreen />);
    await goThroughCreateRoomFlow();

    // Simulate a guest joining via store (host already present from create flow)
    useRoomStore.getState().setConnectedPlayers([
      { managerId: 'p1', displayName: 'OlliM', joinedAt: 1000, isHost: true },
      { managerId: 'p2', displayName: 'Mauno', joinedAt: 2000, isHost: false },
    ]);

    await waitFor(() => {
      expect(screen.getByTestId('start-game-btn')).not.toBeDisabled();
    });
  });
});

// ─── Join Room flow ───────────────────────────────────────────────────────────

describe('DerbyLobbyScreen — Join Room', () => {
  it('shows the code input after clicking Join Room', () => {
    renderWithProviders(<DerbyLobbyScreen />);

    fireEvent.click(screen.getByTestId('join-room-btn'));

    expect(screen.getByTestId('room-code-input')).toBeInTheDocument();
  });

  it('join button is disabled when fewer than 4 characters entered', () => {
    renderWithProviders(<DerbyLobbyScreen />);
    fireEvent.click(screen.getByTestId('join-room-btn'));

    fireEvent.change(screen.getByTestId('room-code-input'), { target: { value: 'AB' } });

    expect(screen.getByTestId('join-code-btn')).toBeDisabled();
  });

  it('join button is enabled when exactly 4 characters entered', () => {
    renderWithProviders(<DerbyLobbyScreen />);
    fireEvent.click(screen.getByTestId('join-room-btn'));

    fireEvent.change(screen.getByTestId('room-code-input'), { target: { value: 'G7KP' } });

    expect(screen.getByTestId('join-code-btn')).not.toBeDisabled();
  });

  it('shows manager picker after entering valid code and clicking join', async () => {
    mockRoomExists.mockResolvedValue(true);
    renderWithProviders(<DerbyLobbyScreen />);
    fireEvent.click(screen.getByTestId('join-room-btn'));

    fireEvent.change(screen.getByTestId('room-code-input'), { target: { value: 'G7KP' } });
    fireEvent.click(screen.getByTestId('join-code-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('manager-grid')).toBeInTheDocument();
    });
  });

  it('renders all 10 manager cards in the picker', async () => {
    mockRoomExists.mockResolvedValue(true);
    renderWithProviders(<DerbyLobbyScreen />);
    fireEvent.click(screen.getByTestId('join-room-btn'));

    fireEvent.change(screen.getByTestId('room-code-input'), { target: { value: 'G7KP' } });
    fireEvent.click(screen.getByTestId('join-code-btn'));

    await waitFor(() => screen.getByTestId('manager-grid'));

    // 10 managers from managers.json
    const cards = screen.getAllByTestId(/^manager-card-/);
    expect(cards).toHaveLength(10);
  });

  it('confirm join button is disabled until a manager is selected', async () => {
    mockRoomExists.mockResolvedValue(true);
    renderWithProviders(<DerbyLobbyScreen />);
    fireEvent.click(screen.getByTestId('join-room-btn'));

    fireEvent.change(screen.getByTestId('room-code-input'), { target: { value: 'G7KP' } });
    fireEvent.click(screen.getByTestId('join-code-btn'));

    await waitFor(() => screen.getByTestId('confirm-manager-btn'));

    expect(screen.getByTestId('confirm-manager-btn')).toBeDisabled();
  });

  it('confirm join button is enabled after selecting a manager', async () => {
    mockRoomExists.mockResolvedValue(true);
    renderWithProviders(<DerbyLobbyScreen />);
    fireEvent.click(screen.getByTestId('join-room-btn'));

    fireEvent.change(screen.getByTestId('room-code-input'), { target: { value: 'G7KP' } });
    fireEvent.click(screen.getByTestId('join-code-btn'));

    await waitFor(() => screen.getByTestId('manager-grid'));

    fireEvent.click(screen.getByTestId('manager-card-olli_mehtonen'));

    await waitFor(() => {
      expect(screen.getByTestId('confirm-manager-btn')).not.toBeDisabled();
    });
  });
});

// ─── Start Game ──────────────────────────────────────────────────────────────

describe('DerbyLobbyScreen — Start Game', () => {
  it('start button calls startRoom when clicked with 2+ players', async () => {
    renderWithProviders(<DerbyLobbyScreen />);

    // Go through the full two-step create-room flow
    await goThroughCreateRoomFlow();

    // Simulate a guest joining
    useRoomStore.getState().setConnectedPlayers([
      { managerId: 'p1', displayName: 'OlliM', joinedAt: 1000, isHost: true },
      { managerId: 'p2', displayName: 'Mauno', joinedAt: 2000, isHost: false },
    ]);

    await waitFor(() => {
      expect(screen.getByTestId('start-game-btn')).not.toBeDisabled();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('start-game-btn'));
    });

    expect(mockStartRoom).toHaveBeenCalledTimes(1);
  });
});

// ─── Back navigation ─────────────────────────────────────────────────────────

describe('DerbyLobbyScreen — Back button', () => {
  it('clicking Back resets match phase to TITLE', async () => {
    useMatchStore.getState().goToDerbyLobby();
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.DERBY_LOBBY);

    renderWithProviders(<DerbyLobbyScreen />);

    fireEvent.click(screen.getByTestId('back-btn'));

    await waitFor(() => {
      expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.TITLE);
    });
  });

  it('clicking Back resets room store', async () => {
    useRoomStore.getState().setRoom('G7KP', 'host', 'olli_mehtonen');
    renderWithProviders(<DerbyLobbyScreen />);

    fireEvent.click(screen.getByTestId('back-btn'));

    await waitFor(() => {
      expect(useRoomStore.getState().roomCode).toBeNull();
    });
  });
});
