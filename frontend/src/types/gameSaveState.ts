import type { CardInfo } from './gameLog'

export interface AIConfig {
  id: string
  name: string
  difficulty: string
  completed: boolean
}

export interface GameStateSnapshot {
  boardSubstances: any[]
  aiConfigs: AIConfig[]
  aiCompletionStatus: Record<string, boolean>
  playerHand: CardInfo[]
  currentTurn: 'player' | 'ai'
  gameMode: string
  playerScore: number
  opponentScore: number
  centerCard: CardInfo | null
}

export interface GameSessionSaveState {
  id: string
  userId: number
  timestamp: number
  status: 'in_progress' | 'paused' | 'completed'
  suspendedAt?: number
  gameState: GameStateSnapshot
  roomInfo?: {
    id: string
    name: string
    max_players: number
    current_players: string[]
  }
}

export interface GameSessionMetadata {
  id: string
  userId: number
  timestamp: number
  gameMode: string
  status: 'in_progress' | 'paused' | 'completed'
  roomName?: string
  playerCount?: number
}

