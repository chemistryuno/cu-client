import type { GameContextForAI, CardInfo } from '../types/gameLog'
import { getGameLogs } from './gameLogCollector'

let gameContextForAI: GameContextForAI = {
  currentTurn: 'player',
  turnNumber: 0,
  playerState: { hand: [], score: 0 },
  opponentState: { handCount: 0, score: 0 },
  boardState: { centerCard: null },
  gameHistory: []
}

/**
 * Initialize game context
 */
export const initializeGameContextForAI = () => {
  gameContextForAI = {
    currentTurn: 'player',
    turnNumber: 0,
    playerState: { hand: [], score: 0 },
    opponentState: { handCount: 0, score: 0 },
    boardState: { centerCard: null },
    gameHistory: []
  }
}

/**
 * Update game context based on latest game logs
 * Called automatically after each action is logged
 */
export const updateGameContextForAI = () => {
  const logs = getGameLogs()
  if (logs.length === 0) {
    initializeGameContextForAI()
    return
  }

  const latestLog = logs[logs.length - 1]

  gameContextForAI = {
    currentTurn: latestLog.actor === 'player' ? 'opponent' : 'player',
    turnNumber: logs.length,
    playerState: {
      hand: latestLog.snapshot.playerHand,
      score: latestLog.snapshot.playerScore
    },
    opponentState: {
      handCount: latestLog.snapshot.opponentHandCount,
      score: latestLog.snapshot.opponentScore || 0
    },
    boardState: {
      centerCard: latestLog.snapshot.centerCard,
      lastPlayedCard: latestLog.card,
      lastPlayedBy: latestLog.actor === 'system' ? undefined : latestLog.actor
    },
    gameHistory: logs
  }
}

/**
 * Get current game context for AI
 * Returns synchronously from in-memory store
 */
export const getGameContextForAI = (): GameContextForAI => {
  return JSON.parse(JSON.stringify(gameContextForAI))
}

/**
 * Build game context from current game state
 * Use this to initially seed context with current game state
 */
export const buildGameContextForAI = (params: {
  currentTurn: 'player' | 'opponent'
  turnNumber: number
  playerHand: CardInfo[]
  playerScore: number
  opponentHandCount: number
  opponentScore: number
  centerCard: CardInfo | null
}): GameContextForAI => {
  const logs = getGameLogs()
  return {
    currentTurn: params.currentTurn,
    turnNumber: params.turnNumber,
    playerState: {
      hand: params.playerHand,
      score: params.playerScore
    },
    opponentState: {
      handCount: params.opponentHandCount,
      score: params.opponentScore
    },
    boardState: {
      centerCard: params.centerCard
    },
    gameHistory: logs
  }
}

/**
 * Get game context as a formatted string for AI prompts
 */
export const formatGameContextForAIPrompt = (context: GameContextForAI): string => {
  const hand = context.playerState.hand
    .map(c => `${c.color}·${c.element} (${c.reaction})`)
    .join(', ') || 'empty'

  const centerCard = context.boardState.centerCard
    ? `${context.boardState.centerCard.color}·${context.boardState.centerCard.element}`
    : 'empty'

  return `
Current Game State:
- Your hand: ${hand}
- Your score: ${context.playerState.score}
- Opponent's hand count: ${context.opponentState.handCount}
- Opponent's score: ${context.opponentState.score}
- Center card: ${centerCard}
- Current turn: ${context.currentTurn === 'player' ? 'Your turn' : "Opponent's turn"}
  `.trim()
}

/**
 * Export current context globally for components to access
 */
export const getGlobalGameContextForAI = (): GameContextForAI => {
  return getGameContextForAI()
}
