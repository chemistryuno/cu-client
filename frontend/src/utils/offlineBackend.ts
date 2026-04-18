import type { AxiosAdapter, AxiosRequestConfig, AxiosResponse } from 'axios'
import { TUTORIAL_INITIAL_STATE } from './tutorialScript'

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

const makeLocalPlayer = (nickname = '本地玩家', avatar = 'flask'): User => ({
  uid: 1,
  username: 'local-player',
  password: '',
  nickname,
  avatar,
  role: 'user',
  is_admin: false,
  points: 0,
  exp: 0,
  level: 1,
  created_at: nowISO(),
  sound_volume: 0.8,
  vibration_enabled: true,
  enable_element_input: false,
  custom_contact: 'offline://local',
  bio: 'Local single-player profile'
})

const makeInitialState = (): State => ({
  users: [makeLocalPlayer()],
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
const resetOfflineState = () => {
  turnTimers.forEach((timer) => clearTimeout(timer))
  aiTimers.forEach((timer) => clearTimeout(timer))
  turnTimers.clear()
  aiTimers.clear()
  const fresh = makeInitialState()
  writeState(fresh)
  updateStoredUser(null)
  return fresh
}
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

const serializeUser = (user: User) => {
  const serialized = { ...user, id: user.uid } as Record<string, any>
  delete serialized.password
  return serialized
}
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

const createCard = (type: string): Card => ({ type, count: 1, effect: specialCards.has(type) ? type : undefined })

const buildDrawPile = (deck: Deck) => {
  const pile: Card[] = []
  Object.entries(deck.cards).forEach(([type, count]) => {
    for (let i = 0; i < count; i += 1) {
      pile.push(createCard(type))
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

const nextActivePlayerIndex = (game: GameState) => {
  if (game.players.length <= 1) return 0
  let next = game.current_player
  for (let i = 0; i < game.players.length; i += 1) {
    next = (next + game.direction + game.players.length) % game.players.length
    const uid = game.players[next]?.uid
    if (!game.finished_players.includes(uid)) return next
  }
  return next
}

const getPlayerSummary = (state: State, room: Room) => room.players.map((uid) => serializeUser(getPlayerInfo(state, uid) || {
  uid,
  username: `player-${uid}`,
  password: '',
  nickname: `Player ${uid}`,
  avatar: '🧪',
  role: 'user',
  is_admin: false,
  points: 1000,
  exp: 0,
  level: 1,
  created_at: nowISO()
}))

const roomSnapshot = (state: State, room: Room) => ({
  ...clone(room),
  players_info: getPlayerSummary(state, room)
})

const emitRoomsUpdate = (state: State) => {
  emit('rooms_update', { type: 'rooms_update', data: clone(state.rooms) })
  emit('online_count', { type: 'online_count', data: Math.max(1, state.users.length) })
}

const emitGameUpdate = (room: Room) => {
  if (room.game_state) {
    emit('game_update', { type: 'game_update', data: clone(room.game_state) })
  }
}

const pushGlobalChat = (state: State, message: ChatMessage) => {
  state.global_messages.push(message)
  state.global_messages = state.global_messages.slice(-100)
}

const createHistory = (state: State, room: Room) => {
  const game = room.game_state
  if (!game) return
  const winnerUid = game.finished_players[0] ?? null
  const winner = winnerUid ? getPlayerInfo(state, winnerUid) : null
  state.histories.unshift({
    id: state.next_history_id++,
    room_id: room.id,
    winner_uid: winnerUid,
    winner_name: winner?.nickname || winner?.username || 'Unknown',
    is_invalid: false,
    invalid_reason: '',
    has_replay: true,
    replay_events: clone(game.discard_pile),
    replay_permanent: true,
    replay_expires_at: null,
    replay_cleared_at: null,
    cheat_detected: false,
    cheat_uids: [],
    players: clone(room.players),
    original_player_count: game.original_player_count,
    quitted_count: game.quitted_count,
    finished_players: clone(game.finished_players),
    started_at: room.created_at,
    finished_at: nowISO(),
    created_at: nowISO()
  })
}

const finishGameIfNeeded = (state: State, room: Room) => {
  const game = room.game_state
  if (!game || game.status === 'finished') return
  const alive = game.players.filter((player) => !game.finished_players.includes(player.uid))
  if (alive.length <= 1) {
    if (alive.length === 1 && !game.finished_players.includes(alive[0].uid)) {
      game.finished_players.unshift(alive[0].uid)
    }
    game.status = 'finished'
    room.status = 'finished'
    const winnerUid = game.finished_players[0]
    game.points_changes = {}
    game.xp_changes = {}
    game.players.forEach((player, index) => {
      const won = player.uid === winnerUid || (index === 0 && !winnerUid)
      game.points_changes[player.uid] = won ? 30 : 10
      game.xp_changes[player.uid] = won ? 20 : 8
      const user = getPlayerInfo(state, player.uid)
      if (user) {
        user.points += game.points_changes[player.uid]
        user.exp += game.xp_changes[player.uid]
        user.level = Math.max(1, Math.floor(user.exp / 100) + 1)
      }
    })
    clearTimer(turnTimers, room.id)
    clearTimer(aiTimers, room.id)
    createHistory(state, room)
    emit('action_toast', { type: 'action_toast', data: 'Game finished in offline mode.' })
    emitGameUpdate(room)
    emitRoomsUpdate(state)
  }
}

const runAiTurn = (state: State, room: Room) => {
  const game = ensureGame(room)
  const player = game.players[game.current_player]
  if (!player?.is_ai) return
  const available = getAvailableSubstances(player.hand_cards)
  const playable = available.filter((formula) => !game.last_card || isReactionPair(game.last_card.substance, formula))
  if (playable.length > 0) {
    applyPlay(state, room, game.current_player, playable[0], game.last_card ? [game.last_card.substance, playable[0]] : [playable[0]])
    emit('action_toast', { type: 'action_toast', data: `${player.nickname} played ${playable[0]}.` })
  } else {
    const drawCount = Math.max(1, game.pending_draw_count || 1)
    drawCardsForPlayer(game, game.current_player, drawCount)
    game.pending_draw_count = 0
    game.pending_draw_types = []
    emit('action_toast', { type: 'action_toast', data: `${player.nickname} drew cards.` })
  }
  advanceTurn(state, room)
}

const maybeScheduleAiTurn = (_state: State, room: Room) => {
  clearTimer(aiTimers, room.id)
  const game = room.game_state
  if (!game || game.status !== 'playing') return
  const current = game.players[game.current_player]
  if (!current?.is_ai) return
  const timer = window.setTimeout(() => {
    const latest = readState()
    const targetRoom = latest.rooms.find((item) => item.id === room.id)
    if (!targetRoom?.game_state || targetRoom.game_state.status !== 'playing') return
    runAiTurn(latest, targetRoom)
    writeState(latest)
    emitGameUpdate(targetRoom)
    emitRoomsUpdate(latest)
  }, 900)
  aiTimers.set(room.id, timer)
}

const scheduleTurnTimer = (_state: State, room: Room) => {
  clearTimer(turnTimers, room.id)
  const game = room.game_state
  if (!game || game.status !== 'playing') return
  game.turn_end_time = nowMs() + TURN_TIMEOUT_MS
  const current = game.players[game.current_player]
  const timer = window.setTimeout(() => {
    const latest = readState()
    const targetRoom = latest.rooms.find((item) => item.id === room.id)
    if (!targetRoom?.game_state || targetRoom.game_state.status !== 'playing') return
    const player = targetRoom.game_state.players[targetRoom.game_state.current_player]
    if (!player || player.uid !== current.uid) return
    drawCardsForPlayer(targetRoom.game_state, targetRoom.game_state.current_player, Math.max(1, targetRoom.game_state.pending_draw_count || 1))
    targetRoom.game_state.pending_draw_count = 0
    targetRoom.game_state.pending_draw_types = []
    targetRoom.game_state.current_player = nextActivePlayerIndex(targetRoom.game_state)
    writeState(latest)
    emit('action_toast', { type: 'action_toast', data: `${player.nickname} auto-drew due to timeout.` })
    emitGameUpdate(targetRoom)
    emitRoomsUpdate(latest)
    scheduleTurnTimer(latest, targetRoom)
    maybeScheduleAiTurn(latest, targetRoom)
  }, TURN_TIMEOUT_MS)
  turnTimers.set(room.id, timer)
}

const appendFinishedPlayer = (game: GameState, uid: number) => {
  if (!game.finished_players.includes(uid)) {
    game.finished_players.push(uid)
  }
}

const applyPlay = (_state: State, room: Room, playerIndex: number, substance: string, reactants?: string[]) => {
  const game = ensureGame(room)
  const player = game.players[playerIndex]
  const normalized = normalizeFormula(substance)
  if (!normalized) throw { status: 400, data: { error: 'Substance is required' } }
  if (!canFormSubstance(player.hand_cards, normalized)) {
    throw { status: 400, data: { error: 'Required cards are not available locally' } }
  }
  if (game.last_card && !isReactionPair(game.last_card.substance, normalized)) {
    throw { status: 400, data: { error: 'These substances cannot react' } }
  }

  player.hand_cards = removeFormulaCards(player.hand_cards, normalized)
  player.card_count = player.hand_cards.length
  player.action_progress = Math.min(2, player.action_progress + 1)
  if (player.action_progress >= 2) {
    player.double_action_available = true
  }

  const playedCard: PlayedCard = {
    card: { type: normalized, count: 1, effect: specialCards.has(normalized) ? normalized : undefined },
    substance: normalized,
    player_uid: player.uid,
    reactants
  }

  game.last_card = playedCard
  game.discard_pile.push(playedCard)
  game.current_reaction = reactants?.length ? reactants.join(' + ') : normalized

  if (normalized === '+2') {
    game.pending_draw_count += 2
    game.pending_draw_types.push('+2')
  }
  if (normalized === '+4') {
    game.pending_draw_count += 4
    game.pending_draw_types.push('+4')
  }

  if (player.hand_cards.length === 0) {
    appendFinishedPlayer(game, player.uid)
  }
}

const advanceTurn = (state: State, room: Room) => {
  const game = ensureGame(room)
  refreshCardCounts(game)
  finishGameIfNeeded(state, room)
  if (game.status === 'finished') return
  game.current_player = nextActivePlayerIndex(game)
  scheduleTurnTimer(state, room)
  maybeScheduleAiTurn(state, room)
}

const buildGameState = (state: State, room: Room) => {
  const players = room.players.map((uid) => {
    const user = getPlayerInfo(state, uid)
    if (!user) throw { status: 400, data: { error: 'User not found in room' } }
    return toPlayerState(user, room.ready_uids.includes(uid))
  })

  for (let i = 0; i < room.ai_count; i += 1) {
    const uid = -1 - i
    players.push(toPlayerState({
      uid,
      username: `ai-${Math.abs(uid)}`,
      nickname: aiNames[i % aiNames.length],
      avatar: '🤖'
    }, true, true))
  }

  const deck = buildDrawPile(room.deck_config)
  const initialCards = room.deck_config.initial_cards || 10
  const game: GameState = {
    room_id: room.id,
    players,
    spectators: clone(room.spectators),
    finished_players: [],
    current_player: 0,
    direction: 1,
    last_card: null,
    discard_pile: [],
    original_player_count: players.length,
    quitted_count: 0,
    status: 'playing',
    is_points_mode: room.is_points_mode,
    turn_end_time: 0,
    pending_draw_count: 0,
    pending_draw_types: [],
    allowed_any_player: -1,
    points_changes: {},
    xp_changes: {},
    current_reaction: '',
    tutorial_script_mode: room.tutorial_script,
    tutorial_current_step: room.tutorial_script ? 1 : 0,
    pending_forced_plays: 0,
    draw_pile: deck
  }

  if (room.tutorial_script && game.players.length >= 2) {
    game.players[0].hand_cards = TUTORIAL_INITIAL_STATE.humanHand.map(createCard)
    game.players[1].hand_cards = TUTORIAL_INITIAL_STATE.aiHand.map(createCard)
    game.last_card = {
      card: createCard(TUTORIAL_INITIAL_STATE.discardTop),
      substance: TUTORIAL_INITIAL_STATE.discardTop,
      player_uid: 0,
      reactants: [TUTORIAL_INITIAL_STATE.discardTop]
    }
    game.discard_pile = [game.last_card]
    game.current_reaction = TUTORIAL_INITIAL_STATE.discardTop

    const reservedCards = [...TUTORIAL_INITIAL_STATE.humanHand, ...TUTORIAL_INITIAL_STATE.aiHand]
      .reduce<Record<string, number>>((acc, type) => {
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {})

    game.draw_pile = game.draw_pile.filter((card) => {
      const remaining = reservedCards[card.type] || 0
      if (remaining <= 0) return true
      reservedCards[card.type] = remaining - 1
      return false
    })

    refreshCardCounts(game)
  } else {
    game.players.forEach((_player, index) => drawCardsForPlayer(game, index, initialCards))
  }

  room.status = 'playing'
  room.game_state = game
  scheduleTurnTimer(state, room)
  maybeScheduleAiTurn(state, room)
}

const getQueryParams = (url: URL) => Object.fromEntries(url.searchParams.entries())

const parseData = (config: AxiosRequestConfig) => {
  if (!config.data) return {}
  if (typeof config.data === 'string') {
    try {
      return JSON.parse(config.data)
    } catch {
      return {}
    }
  }
  return config.data as Record<string, any>
}

const success = (config: AxiosRequestConfig, data: any, status = 200): AxiosResponse => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config: config as any
})

const failure = (config: AxiosRequestConfig, status: number, data: any): never => {
  const error: any = new Error(data?.error || 'Offline request failed')
  error.response = success(config, data, status)
  throw error
}

const updateStoredUser = (user: User | null) => {
  if (user) {
    const serialized = serializeUser(user)
    delete (serialized as Record<string, any>).password
    delete (serialized as Record<string, any>).username
    localStorage.setItem('user', JSON.stringify(serialized))
    localStorage.setItem('token', 'offline-token')
    localStorage.setItem('access_token', 'offline-access-token')
    localStorage.setItem('refresh_token', 'offline-refresh-token')
  } else {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }
  window.dispatchEvent(new Event('auth-changed'))
}

const dispatchRequest = (config: AxiosRequestConfig): DispatchResult => {
  const method = String(config.method || 'get').toUpperCase()
  const url = new URL(config.url || '/', 'http://offline.local')
  const path = url.pathname.replace(/^\/api/, '') || '/'
  const body = parseData(config)
  const query = getQueryParams(url)
  const state = readState()

  const authed = () => requireAuth(state)
  const authedAdmin = () => {
    const user = requireAuth(state)
    if (!user.is_admin) throw { status: 403, data: { error: 'Admin only in offline mode' } }
    return user
  }

  try {
    if (method === 'GET' && path === '/auth/config') {
      return { status: 200, data: { enable_email: false, enable_oauth: false, enable_webauthn: false, offline_mode: true } }
    }
    if (method === 'POST' && path === '/auth/offline-profile') {
      const nickname = String(body.nickname || '').trim()
      const avatar = String(body.avatar || 'flask').trim() || 'flask'
      if (!nickname) throw { status: 400, data: { error: 'Nickname is required' } }
      const user = state.users[0] || makeLocalPlayer()
      user.nickname = nickname
      user.avatar = avatar
      user.username = 'local-player'
      user.password = ''
      user.role = 'user'
      user.is_admin = false
      if (!state.users.length) {
        state.users.push(user)
      } else {
        state.users[0] = user
      }
      state.session_uid = user.uid
      writeState(state)
      updateStoredUser(user)
      return { status: 200, data: { user: serializeUser(user), token: 'offline-token' } }
    }
    if (method === 'POST' && path === '/auth/register') {
      return dispatchRequest({ ...config, method: 'POST', url: '/auth/offline-profile', data: config.data })
    }
    if (method === 'POST' && path === '/auth/login') {
      const nickname = String(body.nickname || body.identifier || body.username || '').trim()
      if (!nickname) throw { status: 400, data: { error: 'Nickname is required' } }
      const user = state.users[0] || makeLocalPlayer()
      user.nickname = nickname
      user.avatar = user.avatar || 'flask'
      if (!state.users.length) {
        state.users.push(user)
      } else {
        state.users[0] = user
      }
      state.session_uid = user.uid
      writeState(state)
      updateStoredUser(user)
      return { status: 200, data: { user: serializeUser(user), token: 'offline-token' } }
    }
    if (method === 'POST' && path === '/auth/logout') {
      state.session_uid = null
      writeState(state)
      updateStoredUser(null)
      return { status: 200, data: { ok: true } }
    }
    if (method === 'POST' && path === '/auth/offline-profile/reset') {
      resetOfflineState()
      return { status: 200, data: { ok: true } }
    }
    if (method === 'POST' && path === '/auth/refresh') {
      const user = currentUser(state)
      if (!user) throw { status: 401, data: { error: 'Not logged in' } }
      return { status: 200, data: { access_token: 'offline-access-token', refresh_token: 'offline-refresh-token', user: serializeUser(user) } }
    }
    if (method === 'GET' && path === '/user/info') return { status: 200, data: serializeUser(authed()) }
    if (method === 'PUT' && path === '/user/profile') {
      const user = authed()
      Object.assign(user, body)
      writeState(state)
      updateStoredUser(user)
      return { status: 200, data: serializeUser(user) }
    }
    if (method === 'PUT' && path === '/user/avatar') {
      const user = authed()
      user.avatar = body.avatar || user.avatar
      writeState(state)
      updateStoredUser(user)
      return { status: 200, data: serializeUser(user) }
    }
    if (method === 'GET' && path.startsWith('/user/profile/')) {
      const uid = Number(path.split('/').pop())
      const user = state.users.find((item) => item.uid === uid)
      if (!user) throw { status: 404, data: { error: 'User not found' } }
      return { status: 200, data: serializeUser(user) }
    }
    if (method === 'GET' && path === '/version') return { status: 200, data: { version: 'offline', fullVersion: 'Chemistry UNO Offline Local Build' } }
    if (method === 'GET' && path === '/announcements') return { status: 200, data: announcements }
    if (method === 'GET' && path === '/hints') return { status: 200, data: hints }
    if (method === 'GET' && path === '/feedbacks/my') {
      const user = authed()
      return { status: 200, data: state.feedbacks.filter((item) => item.uid === user.uid) }
    }
    if (method === 'POST' && path === '/feedback') {
      const user = authed()
      const item: FeedbackItem = { id: state.next_feedback_id++, uid: user.uid, content: String(body.content || ''), type: String(body.type || 'general'), status: 'unread', created_at: nowISO() }
      state.feedbacks.unshift(item)
      writeState(state)
      return { status: 200, data: { ok: true, id: item.id } }
    }
    if (method === 'GET' && path === '/friends') {
      const user = authed()
      const friends = state.friends.filter((item) => item.uid === user.uid).map((item) => {
        const target = getPlayerInfo(state, item.friend_uid)
        return target ? { ...serializeUser(target), remark: item.remark, is_online: true } : null
      }).filter(Boolean)
      return { status: 200, data: friends }
    }
    if (method === 'POST' && path === '/friends/request') {
      const user = authed()
      const friendUid = Number(body.friend_uid)
      if (!friendUid || friendUid === user.uid) throw { status: 400, data: { error: 'Invalid friend uid' } }
      if (!state.users.some((item) => item.uid === friendUid)) throw { status: 404, data: { error: 'User not found' } }
      if (!state.friends.some((item) => item.uid === user.uid && item.friend_uid === friendUid)) state.friends.push({ uid: user.uid, friend_uid: friendUid })
      if (!state.friends.some((item) => item.uid === friendUid && item.friend_uid === user.uid)) state.friends.push({ uid: friendUid, friend_uid: user.uid })
      writeState(state)
      return { status: 200, data: { ok: true } }
    }
    if (method === 'GET' && path === '/my-decks') {
      const user = authed()
      return { status: 200, data: state.decks.filter((deck) => deck.is_global || deck.created_by === user.uid) }
    }
    if (method === 'POST' && path === '/my-decks') {
      const user = authed()
      const deck: Deck = { id: state.next_deck_id++, name: String(body.name || 'Offline Deck'), is_global: false, cards: clone(body.cards || builtinDeck), initial_cards: Number(body.initial_cards || 10), created_by: user.uid, created_at: nowISO() }
      state.decks.push(deck)
      writeState(state)
      return { status: 200, data: deck }
    }
    if ((method === 'PUT' || method === 'DELETE') && path.startsWith('/my-decks/')) {
      const user = authed()
      const deckId = Number(path.split('/').pop())
      const deck = state.decks.find((item) => item.id === deckId && !item.is_global && item.created_by === user.uid)
      if (!deck) throw { status: 404, data: { error: 'Deck not found' } }
      if (method === 'PUT') {
        deck.name = body.name || deck.name
        deck.cards = clone(body.cards || deck.cards)
        deck.initial_cards = Number(body.initial_cards || deck.initial_cards)
        writeState(state)
        return { status: 200, data: deck }
      }
      state.decks = state.decks.filter((item) => item.id !== deckId)
      writeState(state)
      return { status: 200, data: { ok: true } }
    }
    if (method === 'GET' && path === '/rooms') {
      authed()
      return { status: 200, data: state.rooms.filter((room) => !room.is_private || room.players.includes(state.session_uid || -1)) }
    }
    if (method === 'POST' && path === '/rooms') {
      const user = authed()
      const deck = state.decks.find((item) => item.id === Number(body.deck_id)) || state.decks[0]
      const room: Room = {
        id: randomId('room'), name: String(body.name || 'Offline Room'), players: [user.uid], ready_uids: [], countdown: 0, spectators: [], max_players: Number(body.max_players || 4),
        deck_config: clone(deck), status: 'waiting', is_points_mode: Boolean(body.is_points_mode), is_private: Boolean(body.is_private), access_key: body.access_key || '', created_at: nowISO(),
        is_pve: Boolean(body.is_pve), pve_difficulty: Number(body.pve_difficulty || 0), ai_count: Number(body.ai_count || 0), enable_ai_backfill: Boolean(body.enable_ai_backfill),
        ai_backfill_difficulty: Number(body.ai_backfill_difficulty || 0), is_ranked: Boolean(body.is_ranked), level_range: Number(body.level_range || 5), created_by_uid: user.uid,
        tutorial_script: Boolean(body.tutorial_script), room_messages: []
      }
      state.rooms.unshift(room)
      writeState(state)
      emitRoomsUpdate(state)
      return { status: 200, data: roomSnapshot(state, room) }
    }
    if (method === 'GET' && /^\/rooms\/[^/]+$/.test(path)) {
      authed()
      const room = ensureRoom(state, path.split('/')[2])
      return { status: 200, data: roomSnapshot(state, room) }
    }
    if (method === 'GET' && /^\/rooms\/[^/]+\/status$/.test(path)) {
      const roomId = path.split('/')[2]
      const room = state.rooms.find((item) => item.id === roomId)
      return { status: 200, data: room ? { exists: true, status: room.status } : { exists: false, status: 'closed' } }
    }
    if (method === 'POST' && /^\/rooms\/[^/]+\/join$/.test(path)) {
      const user = authed()
      const room = ensureRoom(state, path.split('/')[2])
      const asSpectator = query.spectator === 'true'
      if (room.is_private && room.access_key && room.access_key !== query.key && room.created_by_uid !== user.uid) throw { status: 403, data: { error: 'Invalid room key' } }
      if (asSpectator) {
        if (!room.spectators.includes(user.uid)) room.spectators.push(user.uid)
      } else if (!room.players.includes(user.uid)) {
        if (room.players.length >= room.max_players) throw { status: 400, data: { error: 'Room is full' } }
        room.players.push(user.uid)
        emit('player_joined', { type: 'player_joined', data: room.id })
      }
      writeState(state)
      emitRoomsUpdate(state)
      return { status: 200, data: roomSnapshot(state, room) }
    }
    if (method === 'POST' && /^\/rooms\/[^/]+\/leave$/.test(path)) {
      const user = authed()
      const room = ensureRoom(state, path.split('/')[2])
      room.players = room.players.filter((uid) => uid !== user.uid)
      room.ready_uids = room.ready_uids.filter((uid) => uid !== user.uid)
      room.spectators = room.spectators.filter((uid) => uid !== user.uid)
      if (room.game_state) {
        const index = findPlayerIndexByUid(room.game_state, user.uid)
        if (index >= 0) {
          room.game_state.quitted_count += 1
          appendFinishedPlayer(room.game_state, user.uid)
          finishGameIfNeeded(state, room)
        }
      }
      if (room.players.length === 0 && (!room.game_state || room.game_state.status !== 'playing')) state.rooms = state.rooms.filter((item) => item.id !== room.id)
      writeState(state)
      emit('player_left', { type: 'player_left', data: room.id })
      emitRoomsUpdate(state)
      return { status: 200, data: { ok: true } }
    }
    if (method === 'POST' && /^\/rooms\/[^/]+\/ready$/.test(path)) {
      const user = authed()
      const room = ensureRoom(state, path.split('/')[2])
      if (room.ready_uids.includes(user.uid)) room.ready_uids = room.ready_uids.filter((uid) => uid !== user.uid)
      else room.ready_uids.push(user.uid)
      writeState(state)
      emitRoomsUpdate(state)
      return { status: 200, data: roomSnapshot(state, room) }
    }
    if (method === 'POST' && /^\/rooms\/[^/]+\/start$/.test(path)) {
      const user = authed()
      const room = ensureRoom(state, path.split('/')[2])
      if (room.created_by_uid !== user.uid) throw { status: 403, data: { error: 'Only the host can start offline games' } }
      if (!room.is_pve && room.players.length < 2) throw { status: 400, data: { error: 'At least two local players are required' } }
      if (room.status === 'playing' && room.game_state) {
        return { status: 200, data: roomSnapshot(state, room) }
      }
      buildGameState(state, room)
      writeState(state)
      emitGameUpdate(room)
      emitRoomsUpdate(state)
      return { status: 200, data: roomSnapshot(state, room) }
    }
    if (method === 'POST' && /^\/rooms\/[^/]+\/play$/.test(path)) {
      const user = authed()
      const room = ensureRoom(state, path.split('/')[2])
      const game = ensureGame(room)
      const index = findPlayerIndexByUid(game, user.uid)
      if (index !== game.current_player) throw { status: 400, data: { error: 'Not your turn' } }
      applyPlay(state, room, index, String(body.substance || body.card?.type || ''))
      advanceTurn(state, room)
      writeState(state)
      emitGameUpdate(room)
      return { status: 200, data: roomSnapshot(state, room) }
    }
    if (method === 'POST' && /^\/rooms\/[^/]+\/play-double$/.test(path)) {
      const user = authed()
      const room = ensureRoom(state, path.split('/')[2])
      const game = ensureGame(room)
      const index = findPlayerIndexByUid(game, user.uid)
      if (index !== game.current_player) throw { status: 400, data: { error: 'Not your turn' } }
      const player = game.players[index]
      const sub1 = String(body.sub1 || '')
      const sub2 = String(body.sub2 || '')
      if (!player.double_action_available && player.action_progress < 2) throw { status: 400, data: { error: 'Double action is not ready' } }
      applyPlay(state, room, index, sub1)
      player.double_action_available = false
      player.action_progress = 0
      if (sub2) applyPlay(state, room, index, sub2, [sub1, sub2])
      advanceTurn(state, room)
      writeState(state)
      emitGameUpdate(room)
      return { status: 200, data: roomSnapshot(state, room) }
    }
    if (method === 'POST' && /^\/rooms\/[^/]+\/draw$/.test(path)) {
      const user = authed()
      const room = ensureRoom(state, path.split('/')[2])
      const game = ensureGame(room)
      const index = findPlayerIndexByUid(game, user.uid)
      if (index !== game.current_player) throw { status: 400, data: { error: 'Not your turn' } }
      const drawCount = Math.max(1, game.pending_draw_count || 1)
      drawCardsForPlayer(game, index, drawCount)
      game.pending_draw_count = 0
      game.pending_draw_types = []
      advanceTurn(state, room)
      writeState(state)
      emitGameUpdate(room)
      return { status: 200, data: roomSnapshot(state, room) }
    }
    if (method === 'GET' && /^\/rooms\/[^/]+\/substances$/.test(path)) {
      const user = authed()
      const room = ensureRoom(state, path.split('/')[2])
      const game = ensureGame(room)
      const index = findPlayerIndexByUid(game, user.uid)
      if (index < 0) throw { status: 403, data: { error: 'You are not in this room' } }
      return { status: 200, data: getAvailableSubstances(game.players[index].hand_cards) }
    }
    if (method === 'GET' && /^\/rooms\/[^/]+\/reaction-hints$/.test(path)) {
      const user = authed()
      const room = ensureRoom(state, path.split('/')[2])
      const game = ensureGame(room)
      const index = findPlayerIndexByUid(game, user.uid)
      const available = index >= 0 ? getAvailableSubstances(game.players[index].hand_cards) : []
      const hintsData = available.filter((formula) => !game.last_card || isReactionPair(game.last_card.substance, formula)).slice(0, 12).map((formula, idx) => ({ id: idx + 1, formula, name: substanceNames[formula] || formula }))
      return { status: 200, data: hintsData }
    }
    if (method === 'POST' && path === '/game/check-reaction') {
      const valid = isReactionPair(String(body.r1 || ''), String(body.r2 || ''))
      return { status: 200, data: { can_react: valid, valid } }
    }
    if (method === 'GET' && path === '/points/leaderboard') return { status: 200, data: clone(state.users).sort((a, b) => b.points - a.points).map(serializeUser) }
    if (method === 'GET' && path === '/level/leaderboard') return { status: 200, data: clone(state.users).sort((a, b) => b.level - a.level || b.exp - a.exp).map(serializeUser) }
    if (method === 'GET' && path === '/level/info') {
      const user = authed()
      return { status: 200, data: { level: user.level, exp: user.exp, next_level_exp: user.level * 100 } }
    }
    if (method === 'GET' && path === '/data/substances') {
      return { status: 200, data: Object.keys(substanceNames).map((formula, index) => ({ id: index + 1, formula, name: substanceNames[formula], status: 'approved', creator_name: 'offline', created_at: nowISO() })) }
    }
    if (method === 'GET' && path === '/substances/names') return { status: 200, data: substanceNames }
    if (method === 'GET' && (path === '/reactions' || path === '/reactions/all' || path === '/reactions/my')) {
      return { status: 200, data: reactionPairs.map(([r1, r2], index) => ({ id: index + 1, r1, r2, display: `${r1} + ${r2}`, status: 'approved' })) }
    }
    if (method === 'GET' && path === '/user/game-history') {
      const user = authed()
      return { status: 200, data: state.histories.filter((item) => item.players.includes(user.uid)) }
    }
    if (method === 'GET' && /^\/user\/game-history\/\d+\/replay$/.test(path)) {
      const historyId = Number(path.split('/')[3])
      const history = state.histories.find((item) => item.id === historyId)
      if (!history) throw { status: 404, data: { error: 'Replay not found' } }
      return { status: 200, data: history }
    }
    if (method === 'GET' && path === '/user/sessions') {
      const user = authed()
      return { status: 200, data: [{ id: 'offline-session', created_at: user.created_at, current: true, mode: 'offline' }] }
    }
    if (method === 'GET' && (path === '/surveys/active' || path === '/surveys/all')) return { status: 200, data: [] }
    if (method === 'GET' && path === '/plugins') return { status: 200, data: [] }
    if (method === 'GET' && path === '/plugin-cards') return { status: 200, data: [] }
    if (method === 'GET' && path === '/chat/global/history') return { status: 200, data: state.global_messages.slice(-Number(query.limit || 50)) }
    if (method === 'GET' && path.startsWith('/chat/private/history/')) return { status: 200, data: [] }
    if (method === 'GET' && path === '/admin/rooms/active') {
      authedAdmin()
      return { status: 200, data: state.rooms }
    }
    if (method === 'POST' && path === '/admin/users/kick') {
      authedAdmin()
      return { status: 200, data: { ok: true } }
    }
    if (path.startsWith('/admin/')) {
      authedAdmin()
      return { status: 200, data: [] }
    }
    return { status: 200, data: [] }
  } catch (error: any) {
    if (error?.status) return error
    return { status: 500, data: { error: error?.message || 'Offline backend error' } }
  } finally {
    writeState(state)
  }
}

export const offlineAxiosAdapter: AxiosAdapter = async (config) => {
  await sleep(30)
  const result = dispatchRequest(config)
  if (result.status >= 400) failure(config, result.status, result.data)
  return success(config, result.data, result.status)
}

export const installOfflineFetchInterceptor = () => {
  const g = window as Window & typeof globalThis & { __offlineFetchInstalled?: boolean; __offlineOriginalFetch?: typeof fetch }
  if (g.__offlineFetchInstalled) return
  g.__offlineFetchInstalled = true
  g.__offlineOriginalFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const url = new URL(requestUrl, window.location.origin)
    if (!url.pathname.startsWith('/api/')) return g.__offlineOriginalFetch!(input as any, init)

    const result = dispatchRequest({ url: url.pathname + url.search, method: init?.method || 'GET', data: init?.body })
    return new Response(JSON.stringify(result.data), { status: result.status, headers: { 'Content-Type': 'application/json' } })
  }
}

const sendOfflineChat = (payload: { uid: number; nickname: string; username: string; avatar: string; message: string; target_uid?: number }) => {
  if (payload.target_uid) {
    emit('private_chat', { type: 'private_chat', uid: payload.uid, target_uid: payload.target_uid, message: payload.message, data: { nickname: payload.nickname, username: payload.username, avatar: payload.avatar } })
    return
  }
  emit('chat', { type: 'chat', uid: payload.uid, message: payload.message, data: { nickname: payload.nickname, username: payload.username, avatar: payload.avatar } })
}

export const offlineSocket = {
  on(event: string, handler: (message: any) => void) {
    const listener = (e: Event) => handler((e as CustomEvent).detail)
    eventBus.addEventListener(event, listener)
    return () => eventBus.removeEventListener(event, listener)
  },
  sendRoomChat(roomId: string, message: string) {
    const state = readState()
    const user = currentUser(state)
    if (!user) return
    if (roomId === 'lobby') {
      const entry: ChatMessage = { user_uid: user.uid, username: user.username, nickname: user.nickname, avatar: user.avatar, message, created_at: nowISO() }
      pushGlobalChat(state, entry)
      writeState(state)
      sendOfflineChat({ uid: user.uid, username: user.username, nickname: user.nickname, avatar: user.avatar, message })
      emit('chat_unread_count', { type: 'chat_unread_count', count: 0 })
      return
    }
    const room = state.rooms.find((item) => item.id === roomId)
    if (!room) return
    const entry: RoomMessage = { uid: user.uid, username: user.username, nickname: user.nickname, avatar: user.avatar, message, created_at: nowISO() }
    room.room_messages.push(entry)
    room.room_messages = room.room_messages.slice(-100)
    writeState(state)
    sendOfflineChat({ uid: user.uid, username: user.username, nickname: user.nickname, avatar: user.avatar, message })
  }
}
