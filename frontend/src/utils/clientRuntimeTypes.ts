export type ClientRuntimeModule = 'auth' | 'data' | 'game' | 'admin'

export interface RuntimeRouteDefinition {
  module: ClientRuntimeModule
  methods: string[]
  pattern: string
  description: string
}

export interface RuntimeRequest {
  url: string
  method?: string
  data?: unknown
}

export interface RuntimeErrorResponse {
  error: string
  code?: string
}

export interface RuntimeResult<T = any> {
  status: number
  data: T
  module?: ClientRuntimeModule
}

export type RuntimeSessionMetadata = {
  id: string
  uid: number
  user_agent: string
  ip: string
  host: 'browser' | 'electron' | 'capacitor'
  mode: 'offline'
  created_at: string
  last_active: string
  expires_at: string | null
  revoked_at: string | null
}

export type RuntimeExportBundle = {
  version: 1
  exported_at: string
  host: 'browser' | 'electron' | 'capacitor'
  entries: Record<string, string>
  sqlite?: {
    encoding: 'base64'
    data: string
  }
}

export type User = {
  uid: number
  username: string
  password: string
  nickname: string
  avatar: string
  role: 'user' | 'co_worker' | 'admin'
  is_admin: boolean
  points: number
  exp: number
  level: number
  created_at: string
  sound_volume?: number
  vibration_enabled?: boolean
  enable_element_input?: boolean
  custom_contact?: string
  bio?: string
  qq?: string
  wechat?: string
  email?: string
  show_email?: boolean
}

export type Deck = {
  id: number
  name: string
  is_global: boolean
  cards: Record<string, number>
  initial_cards: number
  created_by: number
  created_at: string
}

export type Card = {
  type: string
  count: number
  effect?: string
}

export type PlayedCard = {
  card: Card
  substance: string
  player_uid: number
  reactants?: string[]
}

export type PlayerState = {
  uid: number
  username: string
  nickname: string
  avatar: string
  hand_cards: Card[]
  card_count: number
  is_ready: boolean
  double_action_available: boolean
  action_progress: number
  is_ai: boolean
  is_offline?: boolean
}

export type GameState = {
  room_id: string
  players: PlayerState[]
  spectators: number[]
  finished_players: number[]
  current_player: number
  direction: number
  last_card: PlayedCard | null
  discard_pile: PlayedCard[]
  original_player_count: number
  quitted_count: number
  status: 'playing' | 'finished'
  is_points_mode: boolean
  turn_end_time: number
  pending_draw_count: number
  pending_draw_types: string[]
  allowed_any_player: number
  points_changes: Record<number, number>
  xp_changes: Record<number, number>
  current_reaction: string
  last_effect_type: string
  effect_target_uid: number | null
  tutorial_script_mode: boolean
  tutorial_current_step: number
  pending_forced_plays: number
  draw_pile: Card[]
}

export type RoomMessage = {
  uid: number
  username: string
  nickname: string
  avatar: string
  message: string
  created_at: string
}

export type Room = {
  id: string
  name: string
  players: number[]
  ready_uids: number[]
  countdown: number
  spectators: number[]
  max_players: number
  deck_config: Deck
  status: 'waiting' | 'playing' | 'finished'
  is_points_mode: boolean
  is_private: boolean
  access_key: string
  created_at: string
  is_pve: boolean
  pve_difficulty: number
  ai_count: number
  enable_ai_backfill: boolean
  ai_backfill_difficulty: number
  created_by_uid: number
  tutorial_script: boolean
  game_state?: GameState
  room_messages: RoomMessage[]
}

export type History = {
  id: number
  room_id: string
  winner_uid: number | null
  winner_name: string
  is_invalid: boolean
  invalid_reason: string
  has_replay: boolean
  replay_events: any[]
  replay_permanent: boolean
  replay_expires_at: string | null
  replay_cleared_at: string | null
  cheat_detected: boolean
  cheat_uids: number[]
  players: number[]
  original_player_count: number
  quitted_count: number
  finished_players: number[]
  started_at: string
  finished_at: string
  created_at: string
}

export type FeedbackItem = {
  id: number
  uid: number
  content: string
  type: string
  status: string
  created_at: string
}

export type ChatMessage = {
  user_uid: number
  username: string
  nickname: string
  avatar: string
  message: string
  created_at: string
}

export type FriendLink = {
  uid: number
  friend_uid: number
  remark?: string
}

export type State = {
  users: User[]
  session_uid: number | null
  next_uid: number
  next_deck_id: number
  next_history_id: number
  next_feedback_id: number
  decks: Deck[]
  rooms: Room[]
  histories: History[]
  feedbacks: FeedbackItem[]
  friends: FriendLink[]
  global_messages: ChatMessage[]
}

export type DispatchResult<T = any> = RuntimeResult<T>
