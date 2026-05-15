export interface CardInfo {
  color: string
  element: string
  reaction: string
  details: string
}

export interface GameLogSnapshot {
  playerHand: CardInfo[]
  opponentHandCount: number
  centerCard: CardInfo | null
  playerScore: number
  opponentScore?: number
}

export interface GameLogActionResult {
  cardsDrawn?: number
  pointsGained?: number
  opponentPassed?: boolean
}

export interface GameLogEntry {
  step: number
  timestamp: number
  actor: 'player' | 'opponent' | 'system'
  action: 'play_card' | 'draw_card' | 'pass' | 'skip' | 'reverse' | 'game_end'
  card?: CardInfo
  snapshot: GameLogSnapshot
  result?: GameLogActionResult
}

export interface PlayerState {
  hand: CardInfo[]
  score: number
}

export interface OpponentState {
  handCount: number
  score: number
}

export interface BoardState {
  centerCard: CardInfo | null
  lastPlayedCard?: CardInfo
  lastPlayedBy?: 'player' | 'opponent'
}

export interface GameContextForAI {
  currentTurn: 'player' | 'opponent'
  turnNumber: number
  playerState: PlayerState
  opponentState: OpponentState
  boardState: BoardState
  gameHistory: GameLogEntry[]
}

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AIConversationEntry {
  id: string
  timestamp: number
  relatedLogStep?: number
  messages: AIMessage[]
  gameContextSnapshot: GameContextForAI
  questionType: 'why_play_card' | 'strategy_advice' | 'rule_question' | 'game_analysis'
}
