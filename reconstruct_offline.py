import re
import json

# 1. Extract reactions from Go file
with open('backend/game/hardcoded_reactions.go', 'r', encoding='utf-8') as f:
    go_content = f.read()

# Match the content inside the map
match = re.search(r'var HardcodedReactions = map\[string\]\[\]string\{(.*?)\n\}', go_content, re.DOTALL)
reactions = {}
if match:
    inner = match.group(1)
    # Parse lines like "Br2": {"Ag", "Al"},
    for line in inner.strip().split('\n'):
        line = line.strip()
        if not line: continue
        m = re.match(r'"(.*?)": \{(.*?)\}', line)
        if m:
            key = m.group(1)
            values = [v.strip().strip('"') for v in m.group(2).split(',')]
            reactions[key] = [v for v in values if v]

reaction_pairs = set()
for r1, r2s in reactions.items():
    for r2 in r2s:
        pair = tuple(sorted([r1, r2]))
        reaction_pairs.add(pair)

formatted_pairs = 'const reactionPairs: Array<[string, string]> = [\n  ' + \
    ', '.join([f"['{p[0]}', '{p[1]}']" for p in sorted(list(reaction_pairs))]) + \
    '\n]\n'

# 2. Reconstruct the file
# I'll define the stable parts of the file
types_part = """import type { AxiosAdapter, AxiosRequestConfig, AxiosResponse } from 'axios'
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
"""

announcements_part = """
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
"""

# Now we need the rest of the game logic. I'll read it from the corrupted file, 
# searching for where 'readState' starts.
with open('frontend/src/utils/offlineBackend.ts', 'r', encoding='utf-8') as f:
    corrupted_content = f.read()

# Find the LAST occurrence of 'const readState = () => {' to avoid duplicated parts
logic_match = re.search(r'const readState = \(\): State => \{.*$', corrupted_content, re.DOTALL)
if not logic_match:
    print("Could not find logic part")
    exit(1)
logic_part = logic_match.group(0)

# Final reconstruction
final_content = types_part + "\n" + formatted_pairs + "\n" + announcements_part + "\n" + logic_part

with open('frontend/src/utils/offlineBackend.ts', 'w', encoding='utf-8') as f:
    f.write(final_content)

print("Successfully reconstructed offlineBackend.ts")
