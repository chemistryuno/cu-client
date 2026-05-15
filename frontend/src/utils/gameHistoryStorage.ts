import type { GameHistory, GameEvent } from '../types/gameLog'

let currentGameHistory: GameHistory | null = null
const gameHistoriesInMemory: Map<string, GameHistory> = new Map()

/**
 * Generate unique ID for games/events
 */
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Create a new game history
 */
export const createGameHistory = (
  userId: number,
  gameMode: 'single_player' | 'multiplayer',
  metadata?: Record<string, any>
): GameHistory => {
  const gameHistory: GameHistory = {
    id: generateId(),
    userId,
    gameMode,
    startTime: Date.now(),
    playerScore: 0,
    opponentScore: 0,
    events: [],
    metadata: metadata || {}
  }

  currentGameHistory = gameHistory
  return gameHistory
}

/**
 * Set current game history (for ongoing games)
 */
export const setCurrentGameHistory = (history: GameHistory): void => {
  currentGameHistory = history
}

/**
 * Get current game history
 */
export const getCurrentGameHistory = (): GameHistory | null => {
  return currentGameHistory
}

/**
 * Record an event in current game history
 */
export const recordGameEvent = (event: Omit<GameEvent, 'id' | 'gameId'>): GameEvent => {
  if (!currentGameHistory) {
    throw new Error('No current game history. Create one with createGameHistory()')
  }

  const gameEvent: GameEvent = {
    ...event,
    id: generateId(),
    gameId: currentGameHistory.id
  }

  currentGameHistory.events.push(gameEvent)
  return gameEvent
}

/**
 * Update game history scores
 */
export const updateGameHistoryScores = (playerScore: number, opponentScore: number): void => {
  if (currentGameHistory) {
    currentGameHistory.playerScore = playerScore
    currentGameHistory.opponentScore = opponentScore
  }
}

/**
 * End current game history
 */
export const endGameHistory = (
  winner: 'player' | 'opponent' | 'tie'
): GameHistory | null => {
  if (!currentGameHistory) return null

  currentGameHistory.winner = winner
  currentGameHistory.endTime = Date.now()
  currentGameHistory.duration = (currentGameHistory.endTime - currentGameHistory.startTime) / 1000

  return currentGameHistory
}

/**
 * Save game history to memory storage
 */
export const saveGameHistory = (history: GameHistory): void => {
  gameHistoriesInMemory.set(history.id, {
    ...history,
    events: [...history.events]
  })
  currentGameHistory = null
}

/**
 * Get game history by ID
 */
export const getGameHistory = (gameId: string): GameHistory | undefined => {
  return gameHistoriesInMemory.get(gameId)
}

/**
 * Get all game histories for a user
 */
export const getGameHistoriesByUser = (userId: number): GameHistory[] => {
  return Array.from(gameHistoriesInMemory.values()).filter(
    (history) => history.userId === userId
  )
}

/**
 * Get all game histories
 */
export const getAllGameHistories = (): GameHistory[] => {
  return Array.from(gameHistoriesInMemory.values())
}

/**
 * Get recent game histories (last N games)
 */
export const getRecentGameHistories = (userId: number, limit: number = 10): GameHistory[] => {
  return getGameHistoriesByUser(userId)
    .sort((a, b) => (b.endTime || b.startTime) - (a.endTime || a.startTime))
    .slice(0, limit)
}

/**
 * Delete game history
 */
export const deleteGameHistory = (gameId: string): boolean => {
  return gameHistoriesInMemory.delete(gameId)
}

/**
 * Clear all game histories
 */
export const clearAllGameHistories = (): void => {
  gameHistoriesInMemory.clear()
  currentGameHistory = null
}

/**
 * Get game history statistics for a user
 */
export const getGameStatistics = (userId: number) => {
  const histories = getGameHistoriesByUser(userId).filter(h => h.endTime && h.winner)

  if (histories.length === 0) {
    return {
      totalGames: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      winRate: 0,
      averagePlayerScore: 0,
      averageOpponentScore: 0,
      totalDuration: 0,
      averageDuration: 0
    }
  }

  const wins = histories.filter(h => h.winner === 'player').length
  const losses = histories.filter(h => h.winner === 'opponent').length
  const ties = histories.filter(h => h.winner === 'tie').length
  const totalPlayerScore = histories.reduce((sum, h) => sum + h.playerScore, 0)
  const totalOpponentScore = histories.reduce((sum, h) => sum + h.opponentScore, 0)
  const totalDuration = histories.reduce((sum, h) => sum + (h.duration || 0), 0)

  return {
    totalGames: histories.length,
    wins,
    losses,
    ties,
    winRate: (wins / histories.length) * 100,
    averagePlayerScore: totalPlayerScore / histories.length,
    averageOpponentScore: totalOpponentScore / histories.length,
    totalDuration,
    averageDuration: totalDuration / histories.length
  }
}

/**
 * Get most used cards from game histories
 */
export const getMostUsedCards = (userId: number, limit: number = 5) => {
  const histories = getGameHistoriesByUser(userId)
  const cardUsage: Map<string, number> = new Map()

  histories.forEach(history => {
    history.events.forEach(event => {
      if (event.card) {
        const cardKey = `${event.card.color}·${event.card.element}`
        cardUsage.set(cardKey, (cardUsage.get(cardKey) || 0) + 1)
      }
    })
  })

  return Array.from(cardUsage.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([card, count]) => ({ card, count }))
}
