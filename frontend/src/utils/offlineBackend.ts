import type { AxiosAdapter, AxiosRequestConfig, AxiosResponse } from 'axios'

type User = {
  uid: number
  username: string
  password: string
  nickname: string
  avatar: string
  role: 'admin' | 'user'
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

type Deck = {
  id: number
  name: string
  is_global: boolean
  cards: Record<string, number>
  initial_cards: number
  created_by: number
  created_at: string
}

type Card = { type: string; count: number; effect?: string }
type PlayedCard = { card: Card; substance: string; player_uid: number; reactants?: string[] }
type PlayerState = {
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

type GameState = {
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
  tutorial_script_mode: boolean
  tutorial_current_step: number
  pending_forced_plays: number
  draw_pile: Card[]
}

type RoomMessage = {
  uid: number
  username: string
  nickname: string
  avatar: string
  message: string
  created_at: string
}

type Room = {
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
  is_ranked: boolean
  level_range: number
  created_by_uid: number
  tutorial_script: boolean
  game_state?: GameState
  room_messages: RoomMessage[]
}

type History = {
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

type FeedbackItem = {
  id: number
  uid: number
  content: string
  type: string
  status: string
  created_at: string
}

type ChatMessage = {
  user_uid: number
  username: string
  nickname: string
  avatar: string
  message: string
  created_at: string
}

type FriendLink = {
  uid: number
  friend_uid: number
  remark?: string
}

type State = {
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

type DispatchResult = { status: number; data: any }

const STORAGE_KEY = 'chemistry-uno-offline-state-v2'
const TURN_TIMEOUT_MS = 25000
const eventBus = new EventTarget()
const turnTimers = new Map<string, number>()
const aiTimers = new Map<string, number>()
const aiNames = ['Mendeleev', 'Curie', 'Bohr', 'Faraday', 'Lavoisier']
const specialCards = new Set(['+2', '+4', 'Au', 'He', 'Ne', 'Ar', 'Kr'])

const builtinDeck: Record<string, number> = {
  H: 12, O: 12, C: 4, N: 4, F: 4, Na: 4, Mg: 4, Al: 4, Si: 4, P: 4, S: 4,
  Cl: 4, K: 4, Ca: 4, Mn: 4, Fe: 4, Cu: 4, Zn: 4, Br: 4, I: 4, Ag: 4,
  '+2': 8, '+4': 4, Au: 4, He: 1, Ne: 1, Ar: 1, Kr: 1
}

const substanceNames: Record<string, string> = {
  H: 'Hydrogen', O: 'Oxygen', C: 'Carbon', N: 'Nitrogen', Na: 'Sodium', Mg: 'Magnesium', Al: 'Aluminum', Si: 'Silicon', P: 'Phosphorus', S: 'Sulfur', Cl: 'Chlorine', K: 'Potassium', Ca: 'Calcium', Fe: 'Iron', Cu: 'Copper', Zn: 'Zinc', Ag: 'Silver', Br: 'Bromine', I: 'Iodine',
  H2: 'Hydrogen Gas', O2: 'Oxygen Gas', N2: 'Nitrogen Gas', Cl2: 'Chlorine Gas', Br2: 'Bromine', I2: 'Iodine',
  H2O: 'Water', CO2: 'Carbon Dioxide', HCl: 'Hydrochloric Acid', H2SO4: 'Sulfuric Acid', HNO3: 'Nitric Acid', NaOH: 'Sodium Hydroxide', KOH: 'Potassium Hydroxide', 'Ca(OH)2': 'Calcium Hydroxide', NH3: 'Ammonia', NaCl: 'Sodium Chloride', CuSO4: 'Copper Sulfate', Fe2O3: 'Iron Oxide', CuO: 'Copper Oxide', MgO: 'Magnesium Oxide', CaO: 'Calcium Oxide', SO2: 'Sulfur Dioxide', SO3: 'Sulfur Trioxide', Na2CO3: 'Sodium Carbonate', NaHCO3: 'Sodium Bicarbonate', CaCO3: 'Calcium Carbonate', BaCl2: 'Barium Chloride', BaSO4: 'Barium Sulfate', AgNO3: 'Silver Nitrate', AgCl: 'Silver Chloride',
  '+2': '+2', '+4': '+4', Au: 'Gold', He: 'Helium', Ne: 'Neon', Ar: 'Argon', Kr: 'Krypton'
}

const reactionPairs: Array<[string, string]> = [
  ['H2', 'O2'], ['H2', 'Cl2'], ['Na', 'H2O'], ['K', 'H2O'], ['Ca', 'H2O'], ['CaO', 'H2O'], ['CO2', 'H2O'],
  ['HCl', 'NaOH'], ['H2SO4', 'NaOH'], ['HNO3', 'NaOH'], ['HCl', 'AgNO3'], ['H2SO4', 'BaCl2'], ['Na2CO3', 'HCl'],
  ['NaHCO3', 'HCl'], ['CuSO4', 'Fe'], ['CuSO4', 'Zn'], ['AgNO3', 'Cu'], ['CuO', 'H2'], ['Fe2O3', 'CO'],
  ['O2', 'C'], ['O2', 'S'], ['O2', 'P'], ['SO2', 'NaOH'], ['SO3', 'NaOH']
]

const announcements = [{ id: 1, title: 'Offline Mode', content: 'Running fully offline with local data only.', type: 'info', is_ticker: false, is_persistent: true }]
const hints = [
  { id: 1, content: 'Offline mode is active. Everything stays on this device.' },
  { id: 2, content: 'Use AI Arena in the lobby for quick local matches.' },
  { id: 3, content: 'No backend server is required in this build.' }
]

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const nowISO = () => new Date().toISOString()
const nowMs = () => Date.now()
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const makeInitialState = (): State => ({
  users: [{
    uid: 1,
    username: 'offline-admin',
    password: 'offline-admin',
    nickname: 'Local Admin',
    avatar: '🧪',
    role: 'admin',
    is_admin: true,
    points: 1200,
    exp: 120,
    level: 3,
    created_at: nowISO(),
    sound_volume: 0.8,
    vibration_enabled: true,
    enable_element_input: false,
    custom_contact: 'offline://local',
    bio: 'Offline profile'
  }],
  session_uid: null,
  next_uid: 2,
  next_deck_id: 2,
  next_history_id: 1,
  next_feedback_id: 1,
  decks: [{
    id: 1,
    name: 'Offline Default Deck',
    is_global: true,
    cards: clone(builtinDeck),
    initial_cards: 10,
    created_by: 1,
    created_at: nowISO()
  }],
  rooms: [],
  histories: [],
  feedbacks: [],
  friends: [],
  global_messages: [{
    user_uid: 0,
    username: 'system',
    nickname: 'Offline Lab',
    avatar: '🧪',
    message: 'Offline mode is ready. No server connection is required.',
    created_at: nowISO()
  }]
})

const readState = (): State => {
  const raw = localStorage.getItem(STORAGE_KEY)
  const seeded = makeInitialState()
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
    return seeded
  }
  try {
    const parsed = JSON.parse(raw) as Partial<State>
    return {
      ...seeded,
      ...parsed,
      rooms: parsed.rooms || [],
      histories: parsed.histories || [],
      feedbacks: parsed.feedbacks || [],
      friends: parsed.friends || [],
      decks: parsed.decks || seeded.decks,
      users: parsed.users || seeded.users,
      global_messages: parsed.global_messages || seeded.global_messages
    }
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
    return seeded
  }
}

const writeState = (state: State) => localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
const currentUser = (state: State) => state.users.find((u) => u.uid === state.session_uid) || null
const requireAuth = (state: State) => {
  const user = currentUser(state)
  if (!user) throw { status: 401, data: { error: 'Not logged in' } }
  return user
}

const emit = (type: string, data: any) => eventBus.dispatchEvent(new CustomEvent(type, { detail: data }))
const clearTimer = (map: Map<string, number>, roomId: string) => {
  const timer = map.get(roomId)
  if (timer) {
    clearTimeout(timer)
    map.delete(roomId)
  }
}

const randomId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`
const unique = <T>(items: T[]) => Array.from(new Set(items))
const normalizeFormula = (value: string) => String(value || '').replace(/\s+/g, '')

const parseFormula = (formula: string): Record<string, number> => {
  const input = normalizeFormula(formula)
  const stack: Array<Record<string, number>> = [{}]
  let i = 0

  const addElement = (target: Record<string, number>, key: string, count: number) => {
    target[key] = (target[key] || 0) + count
  }

  while (i < input.length) {
    const char = input[i]
    if (char === '(') {
      stack.push({})
      i += 1
      continue
    }
    if (char === ')') {
      i += 1
      let digits = ''
      while (i < input.length && /\d/.test(input[i])) {
        digits += input[i]
        i += 1
      }
      const multiplier = digits ? Number(digits) : 1
      const group = stack.pop() || {}
      const parent = stack[stack.length - 1]
      Object.entries(group).forEach(([key, value]) => addElement(parent, key, value * multiplier))
      continue
    }
    if (/[A-Z]/.test(char)) {
      let symbol = char
      i += 1
      while (i < input.length && /[a-z]/.test(input[i])) {
        symbol += input[i]
        i += 1
      }
      let digits = ''
      while (i < input.length && /\d/.test(input[i])) {
        digits += input[i]
        i += 1
      }
      addElement(stack[stack.length - 1], symbol, digits ? Number(digits) : 1)
      continue
    }
    i += 1
  }

  const parsed = stack[0]
  if (Object.keys(parsed).length === 0 && input) {
    parsed[input] = 1
  }
  return parsed
}

const getCardCounts = (cards: Card[]) => {
  const result: Record<string, number> = {}
  cards.forEach((card) => {
    result[card.type] = (result[card.type] || 0) + 1
  })
  return result
}

const canFormSubstance = (cards: Card[], substance: string) => {
  if (specialCards.has(substance)) {
    return cards.some((card) => card.type === substance)
  }
  const counts = getCardCounts(cards)
  const need = parseFormula(substance)
  return Object.entries(need).every(([key, value]) => (counts[key] || 0) >= value)
}

const removeFormulaCards = (cards: Card[], substance: string) => {
  const next = [...cards]
  if (specialCards.has(substance)) {
    const index = next.findIndex((card) => card.type === substance)
    if (index >= 0) next.splice(index, 1)
    return next
  }
  const need = parseFormula(substance)
  Object.entries(need).forEach(([symbol, count]) => {
    let remaining = count
    for (let i = next.length - 1; i >= 0 && remaining > 0; i -= 1) {
      if (next[i].type === symbol) {
        next.splice(i, 1)
        remaining -= 1
      }
    }
  })
  return next
}

const isReactionPair = (a: string, b: string) => {
  const left = normalizeFormula(a)
  const right = normalizeFormula(b)
  if (!left || !right) return false
  if (specialCards.has(left) || specialCards.has(right)) return true
  return reactionPairs.some(([x, y]) => (x === left && y === right) || (x === right && y === left))
}

const getAvailableSubstances = (cards: Card[]) => {
  const formulas = unique([...Object.keys(substanceNames), ...Object.keys(builtinDeck)])
  return formulas.filter((formula) => canFormSubstance(cards, formula))
}

const serializeUser = (user: User) => ({ ...user, id: user.uid })
const getPlayerInfo = (state: State, uid: number) => state.users.find((user) => user.uid === uid)
const ensureRoom = (state: State, roomId: string) => {
  const room = state.rooms.find((item) => item.id === roomId)
  if (!room) throw { status: 404, data: { error: 'Room not found' } }
  return room
}
const ensureGame = (room: Room) => {
  if (!room.game_state) throw { status: 400, data: { error: 'Game not started' } }
  return room.game_state
}

const toPlayerState = (user: User | { uid: number; username: string; nickname: string; avatar: string }, isReady: boolean, isAi = false): PlayerState => ({
  uid: user.uid,
  username: user.username,
  nickname: user.nickname || user.username,
  avatar: user.avatar || '🧪',
  hand_cards: [],
  card_count: 0,
  is_ready: isReady,
  double_action_available: false,
  action_progress: 0,
  is_ai: isAi
})

const buildDrawPile = (deck: Deck) => {
  const pile: Card[] = []
  Object.entries(deck.cards).forEach(([type, count]) => {
    for (let i = 0; i < count; i += 1) {
      pile.push({ type, count: 1, effect: specialCards.has(type) ? type : undefined })
    }
  })
  for (let i = pile.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = pile[i]
    pile[i] = pile[j]
    pile[j] = tmp
  }
  return pile
}

const findPlayerIndexByUid = (game: GameState, uid: number) => game.players.findIndex((player) => player.uid === uid)
const refreshCardCounts = (game: GameState) => {
  game.players.forEach((player) => {
    player.card_count = player.hand_cards.length
  })
}

const drawCardsForPlayer = (game: GameState, index: number, count: number) => {
  const player = game.players[index]
  for (let i = 0; i < count; i += 1) {
    const drawn = game.draw_pile.shift()
    if (!drawn) break
    player.hand_cards.push(drawn)
  }
  refreshCardCounts(game)
}
