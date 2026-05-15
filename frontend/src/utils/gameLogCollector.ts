import type { GameLogEntry, CardInfo, GameLogActionResult } from '../types/gameLog'
import { updateGameContextForAI } from './gameContextForAI'

let gameLogs: GameLogEntry[] = []
const MAX_LOGS = 200

/**
 * Initialize game logs for a new game
 */
export const initializeGameLogs = () => {
  gameLogs = []
}

/**
 * Clear all game logs
 */
export const clearGameLogs = () => {
  gameLogs = []
}

/**
 * Get all current game logs
 */
export const getGameLogs = (): GameLogEntry[] => {
  return [...gameLogs]
}

/**
 * Get a specific log entry by step number
 */
export const getLogByStep = (step: number): GameLogEntry | undefined => {
  return gameLogs.find(log => log.step === step)
}

/**
 * Add a log entry (internal helper)
 */
const addLogEntry = (entry: Omit<GameLogEntry, 'step' | 'timestamp'>): GameLogEntry => {
  const logEntry: GameLogEntry = {
    ...entry,
    step: gameLogs.length + 1,
    timestamp: Date.now()
  }

  gameLogs.push(logEntry)

  // Keep only recent logs to avoid memory issues
  if (gameLogs.length > MAX_LOGS) {
    gameLogs = gameLogs.slice(-MAX_LOGS)
    // Re-number steps
    gameLogs.forEach((log, idx) => {
      log.step = idx + 1
    })
  }

  // Update AI context after logging
  updateGameContextForAI()

  return logEntry
}

/**
 * Record player card play action
 */
export const recordPlayerCardPlay = (
  card: CardInfo,
  playerHand: CardInfo[],
  opponentHandCount: number,
  centerCard: CardInfo | null,
  playerScore: number,
  opponentScore: number,
  result?: GameLogActionResult
): GameLogEntry => {
  return addLogEntry({
    actor: 'player',
    action: 'play_card',
    card,
    snapshot: {
      playerHand,
      opponentHandCount,
      centerCard,
      playerScore,
      opponentScore
    },
    result
  })
}

/**
 * Record opponent card play action
 */
export const recordOpponentCardPlay = (
  card: CardInfo,
  playerHand: CardInfo[],
  opponentHandCount: number,
  centerCard: CardInfo | null,
  playerScore: number,
  opponentScore: number
): GameLogEntry => {
  return addLogEntry({
    actor: 'opponent',
    action: 'play_card',
    card,
    snapshot: {
      playerHand,
      opponentHandCount,
      centerCard,
      playerScore,
      opponentScore
    }
  })
}

/**
 * Record card draw action
 */
export const recordCardDraw = (
  count: number,
  playerHand: CardInfo[],
  opponentHandCount: number,
  centerCard: CardInfo | null,
  playerScore: number,
  opponentScore: number,
  actor: 'player' | 'opponent' = 'player'
): GameLogEntry => {
  return addLogEntry({
    actor,
    action: 'draw_card',
    snapshot: {
      playerHand,
      opponentHandCount,
      centerCard,
      playerScore,
      opponentScore
    },
    result: {
      cardsDrawn: count
    }
  })
}

/**
 * Record pass/skip action
 */
export const recordPlayerPass = (
  actionType: 'pass' | 'skip' | 'reverse',
  playerHand: CardInfo[],
  opponentHandCount: number,
  centerCard: CardInfo | null,
  playerScore: number,
  opponentScore: number
): GameLogEntry => {
  return addLogEntry({
    actor: 'player',
    action: actionType,
    snapshot: {
      playerHand,
      opponentHandCount,
      centerCard,
      playerScore,
      opponentScore
    }
  })
}

/**
 * Record opponent pass/skip action
 */
export const recordOpponentPass = (
  actionType: 'pass' | 'skip' | 'reverse',
  playerHand: CardInfo[],
  opponentHandCount: number,
  centerCard: CardInfo | null,
  playerScore: number,
  opponentScore: number
): GameLogEntry => {
  return addLogEntry({
    actor: 'opponent',
    action: actionType,
    snapshot: {
      playerHand,
      opponentHandCount,
      centerCard,
      playerScore,
      opponentScore
    }
  })
}

/**
 * Record game end
 */
export const recordGameEnd = (
  winner: 'player' | 'opponent' | 'tie',
  playerHand: CardInfo[],
  opponentHandCount: number,
  playerScore: number,
  opponentScore: number
): GameLogEntry => {
  return addLogEntry({
    actor: 'system',
    action: 'game_end',
    snapshot: {
      playerHand,
      opponentHandCount,
      centerCard: null,
      playerScore,
      opponentScore
    },
    result: {
      pointsGained: winner === 'player' ? Math.max(0, opponentScore - playerScore) : 0
    }
  })
}
