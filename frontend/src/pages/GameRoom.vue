<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { OFFLINE_MODE } from '../utils/runtimeConfig'
import { useRoute, useRouter } from 'vue-router'
import PhlogistonIcon from '../components/icons/PhlogistonIcon.vue'
import BilingualText from '../components/BilingualText.vue'
import { useI18n } from '../utils/i18n'
import { gameAPI, commonAPI, substanceAPI, friendAPI } from '../utils/api'
import { useDialog, setToastRef } from '../utils/dialog'
import websocket from '../utils/websocket'
import feedback from '../utils/feedback'
import { ArrowLeft, Play, RefreshCw, Zap, Activity, FlaskConical, Trophy, ChevronRight, Loader2, Timer, Plus, Sparkles, Ban, X, MessageCircle, Send, Binary, Radar, Orbit, Users, QrCode, UserPlus } from 'lucide-vue-next'
import { cn } from '../utils/cn'
import { consoleButton } from '../utils/ui'
import ChatBox from '../components/ChatBox.vue'
import LevelUpAnimation from '../components/LevelUpAnimation.vue'
import GameToast from '../components/GameToast.vue'
import ChemicalKeyboard from '../components/ChemicalKeyboard.vue'
import FeedbackSettings from '../components/FeedbackSettings.vue'
import UserAvatar from '../components/UserAvatar.vue'
import { getTutorialActionCheck, getTutorialStep, TUTORIAL_TOTAL_STEPS, type TutorialStep } from '../utils/tutorialScript'
import { closeAIAssistant, openAIAssistant } from '../utils/aiAssistantUI'
import { setGlobalAIAssistantContext } from '../utils/aiAssistantContext'
import '../styles/mobile-game.css'

const route = useRoute()
const router = useRouter()
const { td } = useI18n()
const { showAlert, showConfirm, showToast } = useDialog()
const gameToastRef = ref()
const id = route.params.id as string
const replayHistoryQueryID = computed(() => Number(route.query.replay_history_id || 0))
const isReplayBridgeMode = computed(() => Number.isFinite(replayHistoryQueryID.value) && replayHistoryQueryID.value > 0)
// Replay scope logic removed

const user = ref<any>({})
try {
  const userData = JSON.parse(localStorage.getItem('user') || '{}')
  // 鍏煎鏃х増鏈殑 id 瀛楁
  if (userData.id && !userData.uid) {
    userData.uid = userData.id
  }
  user.value = userData
} catch (e) {
  console.error('Failed to parse user in GameRoom:', e)
}

const gameState = ref<any>(null)
const roomInfo = ref<any>(null)
const playersInfo = ref<any[]>([])
const friendsList = ref<any[]>([])
const friendMap = computed(() => {
  const entries = friendsList.value.map((friend) => [Number(friend.uid), friend] as const)
  return new Map(entries)
})
const availableSubstances = ref<string[]>([])

// 鏁欏妯″紡妫€
const isTutorialMode = ref(false)
const tutorialHintText = ref('')
const tutorialCurrentStep = ref(1) // 褰撳墠鑴氭湰姝ラ
const tutorialScriptMode = ref(false) // 鏄惁鍚敤鑴氭湰鍖栨暀

const loading = ref(true)
const loadError = ref<string | null>(null)
const isRedirecting = ref(false)
const timeRemaining = ref(0)
const timePercent = ref(100)
let timerRaf: any = null
let lastTimeUpdate = 0
const selectedCard = ref<any>(null)
const selectedSubstance = ref<string | null>(null)
const turnReadySubstances = ref<string[]>([])
const doubleMode = ref(false)
const firstDoubleSubstance = ref<string | null>(null)
const secondDoubleSubstance = ref<string | null>(null)
const substanceInput = ref('')
const randomHints = ref<any[]>([])
const reactionHints = ref<any[]>([])
const centerEffectAnimation = ref<'reverse' | 'ban' | ''>('')
let centerEffectTimer: number | null = null

type RoomNoticeTone = 'info' | 'success' | 'warning' | 'error'

// 鍥炴斁妯℃嫙鎾斁鐘?
const replayEvents = ref<any[]>([])
const replayPlaybackIndex = ref(0)
const replayIsPlaying = ref(false)
const replaySpeed = ref(1)
const replayGameOver = ref(false)
const replayEndType = ref('')
const replayPerspectiveUID = ref<number | null>(null)
const replayInitialHands = ref<Record<number, any[]>>({})
const replaySpeedOptions = [0.5, 1, 1.5, 2, 3, 4]
let replayTimer: number | null = null
const replayActionEventTypes = new Set(['play_card', 'double_play', 'draw_card', 'timeout_auto_draw'])

// UI State
const isMobile = ref(false)
const showHints = ref(!isReplayBridgeMode.value)
const showDeckDetailModal = ref(false)
const showChemicalKeyboard = ref(false)
const handContainer = ref<HTMLElement | null>(null)
const substancesContainer = ref<HTMLElement | null>(null)
const playersContainer = ref<HTMLElement | null>(null)
const levelUpAnimationRef = ref<InstanceType<typeof LevelUpAnimation> | null>(null)
const syncAIAssistantContext = () => {
  const roomName = roomInfo.value?.name || 'Unknown room'
  const reactionText = gameState.value?.current_reaction || 'No current reaction'
  const playersText = Array.isArray(playersInfo.value) && playersInfo.value.length > 0
    ? playersInfo.value.slice(0, 4).map((player: any) => player.nickname || player.username || `UID ${player.uid}`).join(', ')
    : 'No players loaded'

  setGlobalAIAssistantContext({
    surface: 'room',
    title: roomName,
    summary: `Room ${roomName} is currently ${roomInfo.value?.status || 'loading'}. Local player: ${user.value.nickname || user.value.username || 'Unknown'}. Current reaction: ${reactionText}. Visible players: ${playersText}.`,
    hints: [
      `Room status: ${roomInfo.value?.status || 'loading'}`,
      `Current reaction: ${reactionText}`,
      `Visible players: ${playersText}`,
    ],
  })
}

// 绉诲姩绔嚜鍔ㄥ叏灞?
const requestFullscreen = () => {
  if (!isMobile.value) return
  const el = document.documentElement as any
  const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen
  if (rfs) {
    rfs.call(el).catch(() => {})
  }
}

// 绉诲姩绔€€鍑哄叏灞?
const exitFullscreen = () => {
  if (!isMobile.value) return
  const doc = document as any
  if (doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement) {
    const efs = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen
    if (efs) {
      efs.call(doc).catch(() => {})
    }
  }
}

// 杈撳叆妗嗙劍鐐圭鐞嗭細绉诲姩绔墦寮€鍖栧閿洏锛屾闈㈢閫€鍑哄叏灞?
const handleInputFocus = () => {
  if (tutorialLockActive.value) {
    showTutorialLockToast()
    return
  }

  if (isMobile.value || user.value.enable_element_input) {
    // 绉诲姩绔垨鍚敤浜嗗厓绱犺緭鍏ユ硶锛氭墦寮€鍖栧閿洏
    showChemicalKeyboard.value = true
  }
  
  if (!isMobile.value) {
    // 妗岄潰绔細閫€鍑哄叏灞忥紙闄ら潪鍦ㄦ暀瀛︽ā寮忥級
    if (!isTutorialMode.value) {
      exitFullscreen()
    }
  }
}
const handleInputBlur = () => {
  // 妗岄潰绔細鎭㈠鍏ㄥ睆锛堥櫎闈炲湪鏁欏妯″紡
  if (!isMobile.value && !isTutorialMode.value) {
    requestFullscreen()
  }
}

// 鑷姩婊氬姩鍒板綋鍓嶈鍔ㄧ帺
const scrollToActivePlayer = () => {
  if (!playersContainer.value || gameState.value?.current_player == null) return
  const container = playersContainer.value
  const playerCards = container.querySelectorAll('[data-player-card]')
  const activeIndex = gameState.value.current_player
  const activeCard = playerCards[activeIndex] as HTMLElement
  if (!activeCard) return
  const containerRect = container.getBoundingClientRect()
  const cardRect = activeCard.getBoundingClientRect()
  const scrollLeft = activeCard.offsetLeft - containerRect.width / 2 + cardRect.width / 2
  container.scrollTo({ left: scrollLeft, behavior: 'smooth' })
}

const fetchRandomHints = async () => {
  try {
    const res = await commonAPI.getHints()
    randomHints.value = res.data || []
  } catch (error) {
    console.error('Failed to fetch hints from labs:', error)
  }
}

const normalizeReactionHint = (hint: any, index: number) => {
  const substance = String(hint?.substance || hint?.formula || '').trim()
  if (!substance) return null
  return {
    ...hint,
    id: hint?.id ?? index + 1,
    substance,
    formula: String(hint?.formula || substance),
    name: String(hint?.name || getSubstanceName(substance)),
  }
}

const fetchReactionHints = async () => {
  try {
    const res = await gameAPI.getReactionHints(id)
    reactionHints.value = (Array.isArray(res.data) ? res.data : [])
      .map(normalizeReactionHint)
      .filter(Boolean)
  } catch (error) {
    console.error('Failed to fetch reaction hints:', error)
    reactionHints.value = []
  }
}

const viewCurrentDeckConfig = () => {
  if (tutorialLockActive.value) {
    showTutorialLockToast()
    return
  }
  if (roomInfo.value?.deck_config) {
    showDeckDetailModal.value = true
  }
}

const isReady = computed(() => {
  return roomInfo.value?.ready_uids?.includes(Number(user.value.uid))
})

const handleToggleReady = async () => {
  if (!roomInfo.value || !user.value.uid) {
    if (!roomInfo.value) {
      showToast('鎴块棿淇℃伅鏈姞杞斤紝璇峰埛鏂伴〉闈?, '閿欒', 'error')
    } else if (!user.value.uid) {
      showToast('鐢ㄦ埛淇℃伅寮傚父锛岃閲嶆柊鐧诲綍', '閿欒', 'error')
    }
    return
  }

  // 涔愯鏇存柊锛氱珛鍗冲垏鎹㈢姸鎬?
  const uidNum = Number(user.value.uid)
  const isCurrentlyReady = roomInfo.value.ready_uids.includes(uidNum)

  if (isCurrentlyReady) {
    roomInfo.value.ready_uids = roomInfo.value.ready_uids.filter((id: number) => id !== uidNum)
  } else {
    roomInfo.value.ready_uids = [...roomInfo.value.ready_uids, uidNum]
  }

  try {
    await gameAPI.ready(id)
    // 鐘舵€佷篃浼氶€氳繃 WebSocket 鏇存柊锛屼絾鎵嬪姩鏍囪涓€涓嬫彁楂樹綋
    await loadGameState(true)
    feedback.success()
  } catch (error: any) {
    console.error('Ready API error:', error)
    // 鎭㈠鐘?
    if (isCurrentlyReady) {
      if (!roomInfo.value.ready_uids.includes(uidNum)) {
        roomInfo.value.ready_uids.push(uidNum)
      }
    } else {
      roomInfo.value.ready_uids = roomInfo.value.ready_uids.filter((id: number) => id !== uidNum)
    }
    showToast(error.response?.data?.error || '鎿嶄綔澶辫触', '閿欒', 'error')
    feedback.error()
  }
}

const isFriend = (uid: number) => {
  return friendMap.value.has(Number(uid))
}

// 鑾峰彇鐜╁鏄剧ず鍚嶇О锛堜紭鍏堟樉绀哄娉級
const getPlayerDisplayName = (player: any) => {
  if (!player) return '鐮旂┒鍛?

  // 濡傛灉AI 鐜╁锛屾樉绀哄叾鍒嗛厤鍒扮殑绉戝瀹跺
  if (player.uid < 0 || player.is_ai) {
    return player.nickname || 'AI'
  }

  // 鏌ユ壘濂藉弸澶囨敞
  const friend = friendMap.value.get(Number(player.uid))
  if (friend?.remark) {
    return friend.remark
  }

  // 鍚﹀垯杩斿洖鏄电О鎴栫敤鎴峰悕
  return player.nickname || player.username || '鐮旂┒鍛?
}

// 妫€鏌ユ槸鍚﹀簲璇ョ敤钃濊壊鏄剧ず锛堟湁澶囨敞鐨勫ソ鍙嬶級
const shouldShowInBlue = (player: any) => {
  if (!player) return false
  const friend = friendMap.value.get(Number(player.uid))
  return !!(friend?.remark)
}

// Friends logic removed in offline mode
const handleAddFriend = (_player?: any) => {}

// Chat system
const showPlayers = ref(false)
const showChat = ref(false)
const hasNewMessage = ref(false)
const showInviteFriendsModal = ref(false)

// 鍔ㄧ敾鐘舵€佺
const drawAnimatingUIDs = ref<Set<number>>(new Set())
const playerCardCounts = ref<Record<number, number>>({})

// 璁＄畻灞炴€э細鍙洃鍚琾layers鐨勫叧閿彉鍖栵紙uid + card_count?
const playersCardState = computed(() => {
  return gameState.value?.players?.map((p: any) => `${p.uid}:${p.card_count}`).join(',') || ''
})

// 鏀逛负鐩戝惉绠€鍖栫増鏈€屼笉鏄痙eep watch
watch(playersCardState, (_newState) => {
  if (!gameState.value?.players) return
  gameState.value.players.forEach((p: any) => {
    const oldVal = playerCardCounts.value[p.uid]
    // 鍙湁褰撶墝鏁板鍔犱笖涓嶆槸鍒濆鍙戠墝锛堝浜庢父鎴忎腑锛夋椂瑙﹀彂
    if (gameState.value?.status === 'playing' && typeof oldVal !== 'undefined' && p.card_count > oldVal) {
      drawAnimatingUIDs.value.add(p.uid)
      setTimeout(() => {
        drawAnimatingUIDs.value.delete(p.uid)
      }, 1000)
    }
    playerCardCounts.value[p.uid] = p.card_count
  })
})

const pushRoomNotice = (
  message: string,
  title = '瀹為獙鍔ㄦ€?,
  type: RoomNoticeTone = 'info',
  duration = 3200,
) => {
  gameToastRef.value?.showToast(message, title, type, duration)
}

// startPrivateChat 宸茶寮冪敤锛屽疄楠屽鍐呯姝㈢


// Game invites removed in offline mode
const sendGameInvite = (_friend?: any) => {}



watch(showChat, (val) => {
  if (val) {
    hasNewMessage.value = false
    if (isMobile.value) {
      showHints.value = false
      showPlayers.value = false
    }
  }
})

watch(showPlayers, (val) => {
  if (val && isMobile.value) {
    showHints.value = false
    showChat.value = false
  }
})

watch(showHints, (val) => {
  if (val) {
    if (isMobile.value) {
      showChat.value = false
      showPlayers.value = false
    }
    if (randomHints.value.length === 0) {
      fetchRandomHints()
    }
    // 濡傛灉鏄帺瀹跺洖鍚堜笖鎻愮ず涓虹┖锛屽皾璇曡幏鍙栨彁绀猴紙寤惰繜妫€鏌ワ紝閬垮厤 computed 鏈垵濮嬪寲
    nextTick(() => {
      if (isMyTurn.value && turnReadySubstances.value.length === 0) {
        fetchTurnSubstances()
      }
    })
  }
}, { immediate: true })

// 绉诲姩绔嚜鍔ㄥ叧闂彁绀洪潰
watch(isMobile, (val) => {
  if (val) {
    showHints.value = false
  }
})

// 鏁欏妯″紡锛氱洃鍚€夋嫨鐗╄川鍜屽弻鍏冪礌妯″紡鍙樺寲
watch([selectedSubstance, doubleMode], () => {
  if (isTutorialMode.value && isMyTurn.value) {
    generateTutorialHint()
  }
})

// 鏁欏妯″紡锛氱洃鍚父鎴忕姸鎬佸彉鍖栵紝娓告垙寮€濮嬫椂鎻愮ず
watch(() => gameState.value?.status, (newStatus, oldStatus) => {
  if (isTutorialMode.value && newStatus === 'playing' && oldStatus === 'waiting') {
    setTimeout(() => {
      showToast(
        '娓告垙宸插紑濮嬶紒娉ㄦ剰鏌ョ湅搴曢儴鐨勬鑹叉彁绀哄崱鐗囷紝瀹冧細鍦ㄤ綘鐨勫洖鍚堟椂鍛婅瘔浣犺鍋氫粈涔?,
        '馃幃 寮€濮嬫父鎴?,
        'info',
        6000
      )
    }, 1000)
  }
})







const allPlayers = computed(() => {
  if (gameState.value?.players) {
    return gameState.value.players.map((p: any) => {
      const baseInfo = playersInfo.value.find(b => Number(b.uid) === Number(p.uid))
      return {
        ...p,
        avatar: p.avatar || baseInfo?.avatar || '馃И',
        // 寮哄埗鏄剧ず鏄电О锛屽洖閫€鍒扮敤鎴峰悕
        username: p.nickname || baseInfo?.nickname || p.username || baseInfo?.username,
        is_ready: roomInfo.value?.ready_uids?.includes(Number(p.uid)),
        is_offline: baseInfo?.is_offline
      }
    })
  }
  return playersInfo.value.map(p => ({
    ...p,
    avatar: p.avatar || '馃И',
    username: p.nickname || p.username,
    is_ready: roomInfo.value?.ready_uids?.includes(Number(p.uid)),
    is_offline: p.is_offline
  }))
})

const currentPlayerObj = computed(() => {
  if (!gameState.value) return null
  return gameState.value.players?.[gameState.value.current_player]
})
const isSpectator = computed(() => {
  if (!user.value?.uid) return false
  
  // 浼樺厛妫€鏌ユ牴绾у埆spectators 瀛楁锛堢敤浜庢埧闂寸瓑寰呯姸鎬侊級
  if (roomInfo.value?.spectators) {
    const inRoomSpectators = (roomInfo.value.spectators as number[]).includes(Number(user.value.uid))
    if (inRoomSpectators) return true
  }
  
  // 娓告垙杩愯鏃舵鏌ユ父鎴忕姸鎬佷腑鐨勮鎴樿€呬俊
  if (gameState.value) {
    // 宸插畬鎴愭瘮璧涚殑鐜╁
    const isFinished = gameState.value.finished_players?.includes(user.value.uid)
    // 鐩存帴鍔犲叆鐨勮鎴?
    const inSpectatorsList = gameState.value.spectators?.includes(user.value.uid)
    // 涓嶅湪閫夋墜鍒楄〃涓殑鐜╁涔熸槸瑙傛垬
    const isNotPlayer = !gameState.value.players?.some((p: any) => Number(p.uid) === Number(user.value?.uid))
    
    if (isFinished || inSpectatorsList || isNotPlayer) return true
  }
  
  return false
})

const isMyTurn = computed(() => {
  if (isReplayBridgeMode.value) return false
  if (!currentPlayerObj.value || !user.value || isSpectator.value) return false
  return Number(currentPlayerObj.value.uid) === Number(user.value.uid)
})
const hasTurnLimit = computed(() => {
  if (tutorialScriptMode.value) return false
  return !!(gameState.value?.turn_end_time && gameState.value.turn_end_time > 0)
})
const tutorialStepDisplay = computed(() => Math.min(tutorialCurrentStep.value, TUTORIAL_TOTAL_STEPS))
const tutorialProgressPercent = computed(() => Math.round((tutorialStepDisplay.value / TUTORIAL_TOTAL_STEPS) * 100))
const roomStatusLabel = computed(() => {
  if (isReplayBridgeMode.value) return '鍥炴斁鐩戠湅'
  if (roomInfo.value?.status === 'waiting') return '绛夊緟寮€濮?
  if (gameState.value?.status === 'finished') return '瀹為獙缁撶畻'
  if (isSpectator.value) return '瑙傛垬妯″紡'
  if (isMyTurn.value) return '浣犵殑鎿嶄綔绐楀彛'
  if (currentPlayerObj.value) return `${getPlayerDisplayName(currentPlayerObj.value)} 琛屽姩涓璥
  return '瀹為獙鍚屾'
})
const roomStatusMessage = computed(() => {
  if (isReplayBridgeMode.value) {
    return `褰撳墠瑙嗚{replayPerspectiveName.value}`
  }
  if (roomInfo.value?.status === 'waiting') {
    const readyCount = roomInfo.value?.ready_uids?.length || 0
    const total = roomInfo.value?.max_players || allPlayers.value.length || 1
    return `宸插氨${readyCount}/${total}锛屼繚鎸佺晫闈㈡竻鐖界瓑寰呬富鎸佷汉寮€濮媊
  }
  if (gameState.value?.status === 'finished') {
    return winner.value ? `鏈眬宸茬粨鏉燂紝${getPlayerDisplayName(winner.value)} 鑾疯儨` : '鏈眬宸茬粨鏉燂紝鍙煡鐪嬬粨绠楀苟瀹夊叏绂诲紑'
  }
  if (isSpectator.value) {
    return '浠呰瀵熷叧閿俊鎭紝涓嶉伄鎸′富鎴樺満'
  }
  if (isMyTurn.value) {
    return hasTurnLimit.value ? `璇峰湪 ${timeRemaining.value}s 鍐呭畬鎴愭湰杞搷浣渀 : '宸蹭负浣犲睍寮€杈撳叆涓庢搷浣滃尯'
  }
  if (currentPlayerObj.value) {
    return `褰撳墠${getPlayerDisplayName(currentPlayerObj.value)} 鎺ㄨ繘鍥炲悎`
  }
  return '姝ｅ湪鍚屾鎴块棿鐘舵€侊紝璇风◢鍊?
})
const roomStatusTone = computed<RoomNoticeTone>(() => {
  if (gameState.value?.status === 'finished') return 'success'
  if (roomInfo.value?.status === 'waiting') return 'warning'
  if (isMyTurn.value) return 'info'
  return 'info'
})
const activeTutorialStep = computed(() => tutorialScriptMode.value ? getTutorialStep(tutorialCurrentStep.value) : undefined)
const tutorialLockActive = computed(() => Boolean(
  tutorialScriptMode.value &&
  activeTutorialStep.value &&
  gameState.value?.status === 'playing' &&
  !isReplayBridgeMode.value,
))
const tutorialAssistiveTitle = computed(() => tutorialScriptMode.value ? `鏁欏姝ラ ${tutorialStepDisplay.value}/${TUTORIAL_TOTAL_STEPS}` : '鍥炲悎寮曞')
const replayPerspectivePlayer = computed(() => {
  if (!isReplayBridgeMode.value || replayPerspectiveUID.value == null || !gameState.value?.players) {
    return null
  }
  return (gameState.value.players || []).find((p: any) => Number(p.uid) === Number(replayPerspectiveUID.value)) || null
})
const replayPerspectiveName = computed(() => {
  const player = replayPerspectivePlayer.value
  if (player) {
    return getPlayerDisplayName(player)
  }
  return '绯荤粺瑙嗚'
})
const myData = computed(() => {
  if (!gameState.value) return null
  if (isReplayBridgeMode.value) {
    if (replayPerspectiveUID.value == null) return null
    return (gameState.value.players || []).find((p: any) => Number(p.uid) === Number(replayPerspectiveUID.value)) || null
  }
  if (!user.value) return null
  return (gameState.value.players || []).find((p: any) => Number(p.uid) === Number(user.value.uid))
})
const myIndex = computed(() => {
  if (!gameState.value) return -1
  if (isReplayBridgeMode.value) {
    if (replayPerspectiveUID.value == null) return -1
    return (gameState.value.players || []).findIndex((p: any) => Number(p.uid) === Number(replayPerspectiveUID.value))
  }
  if (!user.value) return -1
  return (gameState.value.players || []).findIndex((p: any) => Number(p.uid) === Number(user.value.uid))
})
const allowedAny = computed(() => {
  if (!gameState.value) return false
  return typeof gameState.value?.allowed_any_player !== 'undefined' && gameState.value?.allowed_any_player === myIndex.value
})
const winner = computed(() => {
  if (!gameState.value) return null
  const finishers = gameState.value.finished_players || []
  const winnerUid = finishers.length > 0 ? finishers[0] : null
  if (winnerUid !== null) {
     return gameState.value.players.find((p: any) => p.uid === winnerUid)
  }
  return gameState.value.players?.find((p: any) => p.card_count === 0)
})
const isAnyPlayWindow = computed(() => gameState.value?.status === 'playing' && Number(gameState.value?.allowed_any_player) >= 0)
const centerCard = computed(() => gameState.value?.last_card || null)
const centerCardSubstance = computed(() => centerCard.value?.substance || '')
const shouldHideCenterCardForEffect = computed(() => centerEffectAnimation.value === 'reverse' && ['He', 'Ne', 'Ar', 'Kr'].includes(centerCardSubstance.value))

const isManualSettlement = ref(false)

const sortedPointsChanges = computed(() => {
  if (!gameState.value?.points_changes) return []
  return Object.entries(gameState.value.points_changes)
    .map(([uid, points]) => ({
      uid: Number(uid),
      points: Number(points),
      xp: gameState.value.xp_changes?.[uid] || 0,
      player: gameState.value.players.find((p: any) => String(p.uid) === String(uid))
    }))
    .sort((a, b) => {
      // 浼樺厛鎸夌収 finished_players 涓殑椤哄簭锛堟帓鍚嶏級鎺掑簭
      const rankA = gameState.value.finished_players?.indexOf(a.uid) ?? 999
      const rankB = gameState.value.finished_players?.indexOf(b.uid) ?? 999
      
      if (rankA !== rankB) {
        return rankA - rankB
      }
      
      // 濡傛灉閮芥病finished_players 涓紙姣斿涓€旈€€鍑虹殑锛夛紝鎸夌Н鍒嗛檷
      return b.points - a.points
    })
})


const ELEMENTS_DATA: Record<string, { name: string, class: string }> = {
  'H': { name: '姘?, class: 'element-H' },
  'O': { name: '姘?, class: 'element-O' },
  'C': { name: '纰?, class: 'element-C' },
  'N': { name: '姘?, class: 'element-N' },
  'S': { name: '纭?, class: 'element-S' },
  'F': { name: '姘?, class: 'element-F' },
  'P': { name: '纾?, class: 'element-P' },
  'Cl': { name: '姘?, class: 'element-Cl' },
  'Br': { name: '婧?, class: 'element-Br' },
  'I': { name: '纰?, class: 'element-I' },
  'Na': { name: '閽?, class: 'element-Na' },
  'K': { name: '閽?, class: 'element-K' },
  'Mg': { name: '闀?, class: 'element-Mg' },
  'Ca': { name: '閽?, class: 'element-Ca' },
  'Ba': { name: '閽?, class: 'element-Ba' },
  'Al': { name: '閾?, class: 'element-Al' },
  'Fe': { name: '閾?, class: 'element-Fe' },
  'Zn': { name: '閿?, class: 'element-Zn' },
  'Ag': { name: '閾?, class: 'element-Ag' },
  'Hg': { name: '姹?, class: 'element-Hg' },
  'Cu': { name: '閾?, class: 'element-Cu' },
}

// 鐗╄川鍚嶇О鏄犲皠锛堜粠 API 鍔犺浇
const substanceNames = ref<Record<string, string>>({})

// 鍔犺浇鐗╄川鍚嶇О鏄犲皠
const loadSubstanceNames = async () => {
  try {
    const response = await substanceAPI.getSubstanceNames()
    substanceNames.value = response.data || {}
  } catch (error) {
    console.error('[GameRoom] Failed to load substance names:', error)
    // 浣跨敤榛樿鏄犲皠浣滀负鍚庡
    substanceNames.value = {
      'H2O': '姘?, 'H2': '姘㈡皵', 'O2': '姘ф皵', 'HCl': '鐩愰吀', 'H2SO4': '纭吀',
      'NaOH': '姘㈡哀鍖栭挔', 'NaCl': '姘寲閽?, 'CO2': '浜屾哀鍖栫⒊', 'CaO': '姘у寲閽?,
      'CuO': '姘у寲閾?, 'Fe2O3': '姘у寲閾?, 'Fe': '閾?, 'Cu': '閾?, 'Zn': '閿?,
      'Mg': '闀?, 'Al': '閾?, 'C': '纰?, 'S': '纭?, 'Cl2': '姘皵', 'AgNO3': '纭濋吀閾?
    }
  }
}

const formatFormula = (formula: string) => {
  if (!formula) return ''
  return formula.replace(/(\d+)/g, '<sub>$1</sub>')
}

const getSubstanceName = (formula: string) => {
  if (substanceNames.value[formula]) return substanceNames.value[formula]
  // 鍥為€€鍒扮‖缂栫爜鐨勫厓绱犳暟
  if (ELEMENTS_DATA[formula]) return ELEMENTS_DATA[formula].name
  return formula
}

const getDynamicWidthClass = (formula: string, type: 'single' | 'double' = 'single') => {
  if (!formula) return type === 'single' ? 'w-40 sm:w-48' : 'w-28 sm:w-32'
  const len = formula.length
  if (type === 'single') {
    if (len <= 3) return 'w-40 sm:w-48'
    if (len <= 6) return 'w-48 sm:w-56'
    if (len <= 9) return 'w-56 sm:w-64'
    return 'w-64 sm:w-80'
  } else {
    if (len <= 3) return 'w-28 sm:w-32'
    if (len <= 6) return 'w-32 sm:w-40'
    return 'w-40 sm:w-48'
  }
}

const getFormulaFontSize = (formula: string, type: 'single' | 'double' = 'single') => {
  if (!formula) return ''
  const len = formula.length
  if (type === 'single') {
    if (len > 12) return 'text-[20px] sm:text-[28px]'
    if (len > 8) return 'text-[24px] sm:text-[32px]'
    if (len > 5) return 'text-[28px] sm:text-[38px]'
    return 'text-[32px] sm:text-[44px]'
  } else {
    if (len > 8) return 'text-[18px] sm:text-[24px]'
    if (len > 5) return 'text-[22px] sm:text-[30px]'
    return 'text-[28px] sm:text-[36px]'
  }
}

// 瑙ｆ瀽鍖栧寮忥紝杩斿洖鍏冪礌鍙婂叾鏁伴噺锛堜笌鍚庣 parseSubstance 閫昏緫涓€鑷达級
const parseSubstanceElements = (substance: string): Record<string, number> => {
  const formula = String(substance || '').trim()
  const result: Record<string, number> = {}
  if (!formula) return result
  const stack: Record<string, number>[] = [result]
  let i = 0
  while (i < formula.length) {
    const c = formula[i]
    if (c === '(') {
      stack.push({})
      i++
    } else if (c === ')') {
      i++
      let count = 0
      while (i < formula.length && formula[i] >= '0' && formula[i] <= '9') {
        count = count * 10 + (formula.charCodeAt(i) - 48)
        i++
      }
      if (count === 0) count = 1
      const top = stack.pop()!
      const parent = stack[stack.length - 1]
      for (const [k, v] of Object.entries(top)) {
        parent[k] = (parent[k] || 0) + v * count
      }
    } else if (c >= 'A' && c <= 'Z') {
      const start = i
      i++
      while (i < formula.length && formula[i] >= 'a' && formula[i] <= 'z') i++
      const element = formula.slice(start, i)
      let count = 0
      while (i < formula.length && formula[i] >= '0' && formula[i] <= '9') {
        count = count * 10 + (formula.charCodeAt(i) - 48)
        i++
      }
      if (count === 0) count = 1
      const current = stack[stack.length - 1]
      current[element] = (current[element] || 0) + count
    } else {
      i++
    }
  }
  return result
}

// 妫€鏌ョ帺瀹舵墜鐗屾槸鍚﹀寘鍚悎鎴愯鐗╄川鎵€闇€鐨勬墍鏈夊厓
const canPlayerMakeSubstance = (substance: string): boolean => {
  if (!myData.value?.hand_cards) return false
  if (!String(substance || '').trim()) return false
  const required = parseSubstanceElements(substance)
  if (Object.keys(required).length === 0) return false
  // 缁熻鎵嬬墝涓悇鍏冪礌鏁伴噺
  const handElements: Record<string, number> = {}
  for (const card of myData.value.hand_cards) {
    handElements[card.type] = (handElements[card.type] || 0) + 1
  }
  for (const [elem, count] of Object.entries(required)) {
    if ((handElements[elem] || 0) < count) return false
  }
  return true
}

// 杩囨护骞堕殢鏈哄彇鏈€澶?3 涓彲鎺ョ画鍙嶅簲鐗╂彁绀?
const filteredReactionHints = computed(() => {
  if (!reactionHints.value.length || !isMyTurn.value) return []
  const eligible = reactionHints.value.filter((hint: any) => canPlayerMakeSubstance(String(hint?.substance || hint?.formula || '')))
  if (eligible.length <= 3) return eligible
  // 闅忔満鎵撲贡鍚庡彇鍓?3 涓?
  const shuffled = [...eligible]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, 3)
})

const exp = ref(Number(localStorage.getItem('chem_exp') || '0'))
const achievements = ref<string[]>(JSON.parse(localStorage.getItem('chem_achievements') || '[]'))

const getAchievementTier = (achievementName: string): 'normal' | 'milestone' | 'rare' | 'final' => {
  // Map achievement names to tiers
  // 'rare' tier for rare achievements like synthesizing gold
  // 'normal' tier for basic achievements
  if (achievementName.includes('鐐奸噾鏈＋')) return 'rare'
  return 'normal'
}

const checkAchievements = (substance: string) => {
  if (!substance) return
  if (substance.includes('Au') && !achievements.value.includes('鐐奸噾鏈＋')) {
    achievements.value.push('鐐奸噾鏈＋')
    const { t } = useI18n()
    const tier = getAchievementTier(substance)
    const title = t(`game.achievements.${tier}.title`)
    const description = t(`game.achievements.${tier}.description`)
    showToast(description, title, 'success')
  }
  localStorage.setItem('chem_achievements', JSON.stringify(achievements.value))
}

const addExp = (amount: number) => {
  exp.value += amount
  localStorage.setItem('chem_exp', exp.value.toString())
}

// 濡傛灉鏄Н鍒嗚禌锛屽己鍒跺叧闂彁绀哄苟閿佸畾
watch(() => roomInfo.value?.is_points_mode, (val) => {
  if (val) {
    showHints.value = false
  }
})
// --- 绉绘缁撴潫 ---

const startTimer = () => {
  if (timerRaf) cancelAnimationFrame(timerRaf)
  lastTimeUpdate = 0
  let hasTimeoutFired = false
  
  const animate = () => {
    if (!gameState.value || !gameState.value.turn_end_time || gameState.value.status !== 'playing') {
      timeRemaining.value = 0
      timePercent.value = 0
      return
    }
    
    const now = Date.now()
    const diffMs = gameState.value.turn_end_time - now
    
    // 杩涘害鏉″钩婊戞洿鏂帮紙姣忓抚
    timePercent.value = Math.max(0, Math.min(100, (diffMs / 30000) * 100))
    
    // 绉掓暟鏄剧ず姣忕鏇存柊涓€
    if (now - lastTimeUpdate >= 1000) {
      const diff = Math.max(0, Math.floor(diffMs / 1000))
      timeRemaining.value = diff
      lastTimeUpdate = now
    }
    
    if (diffMs > 0) {
      timerRaf = requestAnimationFrame(animate)
    } else {
      timeRemaining.value = 0
      timePercent.value = 0
      
      // 鍊掕鏃剁粨鏉熷悗鑷姩鎽哥墝锛堜粎鍦ㄦ垜鐨勫洖鍚堜笖鏈Е鍙戣繃
      if (isMyTurn.value && !hasTimeoutFired && !tutorialScriptMode.value) {
        hasTimeoutFired = true
        console.log('鍥炲悎鍊掕鏃跺凡鍒版湡锛岃嚜鍔ㄦ懜鐗?)
        handleDrawCard()
      }
    }
  }
  
  timerRaf = requestAnimationFrame(animate)
}

watch(() => gameState.value?.turn_end_time, () => {
  startTimer()
})

// 鍦轰笂鐗╄川鍙樺寲鏃讹紝鍒锋柊鍙嶅簲鎻愮ず
watch(() => gameState.value?.last_card?.substance, () => {
  if (gameState.value?.status === 'playing') {
    fetchReactionHints()
  }
}, { immediate: true })

const fetchTurnSubstances = async () => {
  if (isReplayBridgeMode.value) {
    turnReadySubstances.value = []
    return
  }
  if (!isMyTurn.value) {
    turnReadySubstances.value = []
    return
  }
  try {
    const response = await gameAPI.getAvailableSubstances(id)
    turnReadySubstances.value = response.data || []
  } catch (error) {
    console.error('鑾峰彇鍥炲悎鍙敤鐗╄川澶辫触:', error)
  }
}

watch(() => isMyTurn.value, (val) => {
  if (isReplayBridgeMode.value) {
    turnReadySubstances.value = []
    return
  }
  if (val) {
    fetchTurnSubstances()
    // 鍥炲悎寮€濮嬪弽
    feedback.turnStart()
  } else {
    turnReadySubstances.value = []
  }
}, { immediate: true })

// 鐩戝惉鍖栧鍙嶅簲 - 鎾斁鍙嶅簲闊虫晥
watch(() => gameState.value?.current_reaction, (newReaction, oldReaction) => {
  if (newReaction && newReaction !== oldReaction) {
    feedback.reaction()
  }
})

watch(
  () => `${gameState.value?.last_effect_type || ''}:${gameState.value?.effect_target_uid ?? ''}:${gameState.value?.discard_pile?.length || 0}`,
  () => {
    const effectType = String(gameState.value?.last_effect_type || '')
    const targetUID = gameState.value?.effect_target_uid ?? null
    const myUID = Number(isReplayBridgeMode.value ? replayPerspectiveUID.value : user.value?.uid)

    let nextEffect: 'reverse' | 'ban' | '' = ''
    if (effectType === 'reverse') {
      nextEffect = 'reverse'
    } else if (effectType === 'ban' && targetUID != null && Number(targetUID) === myUID) {
      nextEffect = 'ban'
    }

    centerEffectAnimation.value = ''
    if (centerEffectTimer != null) {
      window.clearTimeout(centerEffectTimer)
    }

    if (!nextEffect) return

    requestAnimationFrame(() => {
      centerEffectAnimation.value = nextEffect
      centerEffectTimer = window.setTimeout(() => {
        centerEffectAnimation.value = ''
        centerEffectTimer = null
      }, 1750)
    })
  }
)

// 鐩戝惉娓告垙缁撴潫 - 鎾斁鑳滃埄/澶辫触闊虫晥骞舵爣璁版暀瀛﹀畬
watch(() => gameState.value?.status, (newStatus) => {
  if (newStatus === 'finished' && gameState.value?.finished_players) {
    // 鏁欏妯″紡锛氭父鎴忕粨鏉熸椂绔嬪嵆鏍囪宸插畬
    if (isTutorialMode.value) {
      localStorage.setItem('chemistry-uno-tutorial-completed', 'true')
    }
    const finishedPlayers = gameState.value.finished_players
    const myUID = user.value.uid
    if (finishedPlayers.length > 0 && finishedPlayers[0] === myUID) {
      // 鎴戞槸绗竴- 鑳滃埄闊虫晥
      feedback.win()
    } else if (finishedPlayers.includes(myUID)) {
      // 鎴戝畬鎴愪簡浣嗕笉鏄涓€- 鎴愬姛闊虫晥
      feedback.success()
    }
  }
})

const handleGameUpdate = (message: any) => {
  // 鍙湁鍦ㄦ墜鍔ㄧ粨绠椾笖娓告垙灏氭湭缁撴潫鏃舵墠璺宠繃鏇存柊
  // 濡傛灉娓告垙宸茬粡缁撴潫锛堟湁points_changes锛夛紝鍗充娇isManualSettlement涔熻鏇存柊浠ユ樉绀烘帓
  if (isManualSettlement.value && !message.data?.points_changes) return

  // 濡傛灉鏀跺埌鐨勬槸瀹屾暣鐨勬父鎴忕姸鎬佸
  if (message.data && typeof message.data === 'object') {
    gameState.value = message.data
    syncTutorialStateFromGameState()
    if (isMyTurn.value) {
      fetchTurnSubstances()
      if (isTutorialMode.value) {
        generateTutorialHint()
      }
    }
  } else {
    // 濡傛灉鏀跺埌鐨勬槸鎴块棿ID瀛楃涓诧紝鍒欓噸鏂版媺鍙栧畬鏁寸姸
    loadGameState(true).then(() => {
      if (isMyTurn.value) {
        fetchTurnSubstances()
      }
    })
  }
}

// 澶勭悊鍗囩骇浜嬩欢
const handleLevelUp = (data: any) => {
  const levelData = data.data || data
  if (levelUpAnimationRef.value) {
    levelUpAnimationRef.value.show(levelData)
  }
}

const handleActionToast = (msg: any) => {
  const content = msg.data || msg.message
  if (content) {
    pushRoomNotice(content, roomInfo.value?.is_pve ? 'AI 鍔ㄤ綔' : '瀹為獙鍔ㄤ綔', 'info')
  }
}

const handleRoomTerminated = async (msg: any) => {
  isRedirecting.value = true
  const reason = msg.message || '鐢变簬杩炴帴涓柇锛屽疄楠屽宸插叧闂?
  await showAlert(reason, '瀹為獙缁撴潫')
  router.push('/')
}

const handlePlayerKicked = async (msg: any) => {
  isRedirecting.value = true
  await showAlert(msg.message || '鐢变簬娑堟瀬娓告垙锛屾偍宸茶韪㈠嚭', '鏉冮檺绉婚櫎')
  router.push('/')
}

const handleChatNotify = () => {
  if (!showChat.value) {
    hasNewMessage.value = true
  }
}

// 涓?WebSocket 浜嬩欢鍒涘缓鍖呰鍑芥暟锛岀‘淇濈被鍨嬪尮閰?
const handlePlayerJoined = () => {
  loadGameState(true)
}

const handlePlayerLeft = () => {
  loadGameState(true)
}

const syncTutorialStateFromGameState = () => {
  if (!gameState.value) return

  if (typeof gameState.value.tutorial_script_mode === 'boolean') {
    tutorialScriptMode.value = gameState.value.tutorial_script_mode
    isTutorialMode.value = gameState.value.tutorial_script_mode
  }

  if (typeof gameState.value.tutorial_current_step === 'number' && gameState.value.tutorial_current_step > 0) {
    tutorialCurrentStep.value = gameState.value.tutorial_current_step
  }
}

// 鏁欏妯″紡鏅鸿兘鎻愮ず
const generateTutorialHint = () => {
  if (!gameState.value || !isMyTurn.value) {
    tutorialHintText.value = ''
    return
  }

  // 鑴氭湰鍖栨暀瀛︽ā寮忥細鏄剧ず鑴氭湰涓殑鎻愮ず
  if (tutorialScriptMode.value) {
    const currentStep = getTutorialStep(tutorialCurrentStep.value)
    if (currentStep && currentStep.player === 'human') {
      tutorialHintText.value = currentStep.hint
    } else {
      tutorialHintText.value = ''
    }
    return
  }

  // 鍘熸湁鐨勯€氱敤鏁欏鎻愮ず閫昏緫
  const myPlayer = gameState.value.players?.[gameState.value.current_player]
  if (!myPlayer) {
    tutorialHintText.value = ''
    return
  }

  const handSize = myPlayer.hand?.length || 0
  const topCard = gameState.value.discard_top

  // 鏍规嵁娓告垙鐘舵€佺敓鎴愭彁
  if (!topCard) {
    tutorialHintText.value = '馃挕 鍥炲悎寮€濮嬶細浣犲彲浠ュ厛鍦ㄣ€屽寲瀛﹀簱銆嶄腑閫夋嫨涓€涓墿璐紝鐒跺悗鐐瑰嚮銆屾墦鍑哄崱鐗屻€嶅紑濮嬫父鎴忥紒'
  } else if (handSize === 0) {
    tutorialHintText.value = '馃挕 鎵嬬墝鐢ㄥ畬浜嗭紒鐐瑰嚮銆屾懜鐗屻€嶆寜閽娊涓€寮犳柊鐗岋紙浣犲皢澶卞幓杩欎釜鍥炲悎锛?
  } else if (doubleMode.value) {
    tutorialHintText.value = '馃挕 鍙屽厓绱犳ā寮忥細閫夋嫨绗簩涓墿璐紝涓や釜鐗╄川灏嗕竴璧锋墦鍑哄埌鎴樺満'
  } else if (selectedSubstance.value) {
    tutorialHintText.value = '馃挕 宸查€夋嫨鐗╄川锛佺偣鍑汇€屾墦鍑哄崱鐗屻€嶆寜閽皢瀹冩斁鍒版垬鍦轰笂锛屾垨鐐瑰嚮銆屽弻鍏冪礌銆嶅悓鏃舵墦鍑轰袱绉嶇墿璐ㄥ弽搴?
  } else {
    tutorialHintText.value = '馃挕 杞埌浣犱簡锛氬湪銆屽寲瀛﹀簱銆嶄腑閫夋嫨涓€涓墿璐紝璁╁畠涓庢垬鍦轰腑澶殑鍗＄墝鍙戠敓鍖栧鍙嶅簲'
  }
}

const parseReplayTimestampMs = (event: any): number | null => {
  const timeStr = event?.at || event?.timestamp
  if (!timeStr) return null
  const normalized = String(timeStr).includes('T') ? String(timeStr) : String(timeStr).replace(' ', 'T')
  const ms = new Date(normalized).getTime()
  return Number.isFinite(ms) ? ms : null
}

const normalizeReplayEvents = (events: any[]) => {
  return events
    .map((event: any, index: number) => ({
      ...event,
      __index: index,
      __type: event?.type || event?.event || '',
      __actorUID: Number(event?.actor_uid ?? event?.uid ?? 0),
      __payload: event?.payload || {},
      __timeMs: parseReplayTimestampMs(event)
    }))
    .sort((a: any, b: any) => {
      if (a.__timeMs == null && b.__timeMs == null) return a.__index - b.__index
      if (a.__timeMs == null) return 1
      if (b.__timeMs == null) return -1
      if (a.__timeMs !== b.__timeMs) return a.__timeMs - b.__timeMs
      return a.__index - b.__index
    })
}

const resolveReplayCardKeyForPlay = (payload: any) => {
  return payload?.card_symbol || payload?.card_type || '鏈煡'
}

const resolveReplayCardKeysForDouble = (payload: any) => {
  if (Array.isArray(payload?.cards) && payload.cards.length) {
    return payload.cards.map((card: any) => card?.card_symbol || card?.card_type || card?.type || '鏈煡')
  }
  const symbol = payload?.card_symbol || payload?.card_type
  if (symbol) return [symbol, symbol]
  return [payload?.sub1 || payload?.substance_1 || '鏈煡', payload?.sub2 || payload?.substance_2 || '鏈煡']
}

const replayEffectCardTypes = new Set(['+2', '+4', 'Au', 'He', 'Ne', 'Ar', 'Kr'])

const makeReplayHandCard = (cardKey: string) => {
  const normalized = String(cardKey || '?')
  return {
    type: normalized,
    count: 1,
    effect: replayEffectCardTypes.has(normalized) ? normalized : ''
  }
}

const cloneReplayHandCards = (cards: any[]) => {
  if (!Array.isArray(cards)) return []
  return cards.map((card: any) => ({ ...card }))
}

const resolveReplayDrawCardKeys = (payload: any, drawCount: number) => {
  if (drawCount <= 0) return []

  if (Array.isArray(payload?.cards) && payload.cards.length) {
    const keys = payload.cards
      .map((card: any) => card?.card_symbol || card?.card_type || card?.type || '?')
      .slice(0, drawCount)
    if (keys.length === drawCount) {
      return keys
    }
    return [...keys, ...Array.from({ length: drawCount - keys.length }, () => '?')]
  }

  const key = payload?.card_symbol || payload?.card_type || '?'
  return Array.from({ length: drawCount }, () => String(key || '?'))
}

const removeReplayHandCard = (player: any, preferredKey: string) => {
  const hand = Array.isArray(player?.hand_cards) ? player.hand_cards : []
  let removeIndex = hand.findIndex((card: any) => String(card?.type || '') === String(preferredKey || ''))

  if (removeIndex < 0) {
    removeIndex = hand.findIndex((card: any) => String(card?.type || '') === '?')
  }
  if (removeIndex < 0 && hand.length > 0) {
    removeIndex = 0
  }

  if (removeIndex >= 0) {
    hand.splice(removeIndex, 1)
  }

  player.hand_cards = hand
  player.card_count = hand.length
}

const addReplayHandCards = (player: any, cardKeys: string[]) => {
  if (!Array.isArray(player?.hand_cards)) {
    player.hand_cards = []
  }
  cardKeys.forEach((key: string) => {
    player.hand_cards.push(makeReplayHandCard(key))
  })
  player.card_count = player.hand_cards.length
}

const buildReplayInitialHands = (players: any[], events: any[]) => {
  const handsByUID: Record<number, string[]> = {}
  const cardBalanceByUID: Record<number, number> = {}

  players.forEach((player: any) => {
    const uid = Number(player.uid)
    handsByUID[uid] = []
    cardBalanceByUID[uid] = 0
  })

  const ensurePlayableCard = (uid: number, cardKey: string) => {
    if (cardBalanceByUID[uid] <= 0) {
      handsByUID[uid].push(cardKey || '?')
      cardBalanceByUID[uid] += 1
    }
    cardBalanceByUID[uid] -= 1
  }

  events.forEach((event: any) => {
    const uid = Number(event.__actorUID || 0)
    if (!(uid in handsByUID)) {
      return
    }

    const eventType = event.__type
    const payload = event.__payload || {}

    if (eventType === 'play_card') {
      ensurePlayableCard(uid, resolveReplayCardKeyForPlay(payload))
      return
    }

    if (eventType === 'double_play') {
      const keys = resolveReplayCardKeysForDouble(payload)
      keys.forEach((key: string) => {
        ensurePlayableCard(uid, key)
      })
      return
    }

    if (eventType === 'draw_card' || eventType === 'timeout_auto_draw') {
      const drawCount = Number(payload.actual_count ?? payload.draw_count ?? payload.requested_count ?? 1)
      if (Number.isFinite(drawCount) && drawCount > 0) {
        cardBalanceByUID[uid] += drawCount
      }
    }
  })

  return handsByUID
}

const buildReplayLastCardFromEvent = (event: any) => {
  const eventType = event?.__type || event?.type || event?.event
  const payload = event?.__payload || event?.payload || {}

  if (eventType === 'double_play') {
    const reactants = [payload.sub1 || payload.substance_1, payload.sub2 || payload.substance_2].filter(Boolean)
    const result = payload.substance || payload.result_substance || reactants.join(' + ')
    return {
      substance: result,
      reactants,
      card: {
        type: payload.card_symbol || payload.card_type || reactants[0] || 'R',
        effect: payload.card_effect || ''
      }
    }
  }

  if (eventType === 'play_card') {
    const substance = payload.substance || payload.result_substance || payload.card_symbol || payload.card_type || 'R'
    return {
      substance,
      card: {
        type: payload.card_symbol || payload.card_type || substance,
        effect: payload.card_effect || ''
      }
    }
  }

  return null
}

const clearReplayTimer = () => {
  if (replayTimer != null) {
    window.clearTimeout(replayTimer)
    replayTimer = null
  }
}

const normalizeReplaySpeedValue = (speed: number) => {
  if (!Number.isFinite(speed) || speed <= 0) {
    return 1
  }
  return speed
}

const replayStatusText = computed(() => {
  if (!isReplayBridgeMode.value) return ''
  if (replayGameOver.value) return '娓告垙缁撴潫'
  return replayIsPlaying.value ? '鎾斁' : '宸叉殏鍋?
})

const replayProgressText = computed(() => {
  const total = replayEvents.value.length
  const current = Math.min(replayPlaybackIndex.value, total)
  return `${current}/${total}`
})

const replaySummary = computed(() => {
  const cardCounts: Record<string, number> = {}
  let roundCount = 0
  let totalPlays = 0

  for (const event of replayEvents.value) {
    const eventType = event.__type
    const payload = event.__payload || {}

    if (replayActionEventTypes.has(eventType)) {
      roundCount += 1
    }

    if (eventType === 'play_card') {
      totalPlays += 1
      const key = resolveReplayCardKeyForPlay(payload)
      cardCounts[key] = (cardCounts[key] || 0) + 1
    }

    if (eventType === 'double_play') {
      totalPlays += 2
      const keys = resolveReplayCardKeysForDouble(payload)
      keys.forEach((key: string) => {
        cardCounts[key] = (cardCounts[key] || 0) + 1
      })
    }
  }

  return {
    roundCount,
    totalPlays,
    cardCounts
  }
})

const replayCardCountEntries = computed(() => {
  return Object.entries(replaySummary.value.cardCounts).sort((a, b) => b[1] - a[1])
})

const handleReplayPerspectiveSwitch = (player: any) => {
  if (!isReplayBridgeMode.value) return
  const uid = Number(player?.uid)
  if (!Number.isFinite(uid)) return
  replayPerspectiveUID.value = uid
}

const resetReplaySimulationBoard = () => {
  if (!gameState.value?.players) return

  gameState.value.status = 'playing'
  gameState.value.current_reaction = ''
  gameState.value.last_card = null
  gameState.value.discard_pile = []
  gameState.value.pending_draw_count = 0
  gameState.value.pending_forced_plays = 0
  gameState.value.finished_players = []

  gameState.value.players = gameState.value.players.map((player: any) => ({
    ...player,
    card_count: Array.isArray(replayInitialHands.value[Number(player.uid)])
      ? replayInitialHands.value[Number(player.uid)].length
      : 0,
    hand_cards: cloneReplayHandCards(replayInitialHands.value[Number(player.uid)] || [])
  }))
}

const applyReplayEventToBoard = (event: any) => {
  if (!gameState.value?.players) return

  const eventType = event.__type
  const payload = event.__payload || {}
  const actorUID = Number(event.__actorUID || 0)
  const actorIndex = gameState.value.players.findIndex((player: any) => Number(player.uid) === actorUID)

  if (actorIndex >= 0) {
    gameState.value.current_player = actorIndex
  }

  if (eventType === 'play_card') {
    gameState.value.last_card = buildReplayLastCardFromEvent(event)
    gameState.value.current_reaction = payload.substance || payload.result_substance || payload.card_symbol || payload.card_type || ''
    gameState.value.discard_pile = [...(gameState.value.discard_pile || []), { replay: true, event: eventType }]
    if (actorIndex >= 0) {
      const actor = gameState.value.players[actorIndex]
      removeReplayHandCard(actor, resolveReplayCardKeyForPlay(payload))
    }
    return
  }

  if (eventType === 'double_play') {
    gameState.value.last_card = buildReplayLastCardFromEvent(event)
    const substance = payload.substance || payload.result_substance || payload.sub1 || payload.substance_1 || ''
    gameState.value.current_reaction = substance
    gameState.value.discard_pile = [...(gameState.value.discard_pile || []), { replay: true, event: eventType }]
    if (actorIndex >= 0) {
      const actor = gameState.value.players[actorIndex]
      const keys = resolveReplayCardKeysForDouble(payload)
      keys.forEach((key: string) => {
        removeReplayHandCard(actor, key)
      })
    }
    return
  }

  if (eventType === 'draw_card' || eventType === 'timeout_auto_draw') {
    const drawCount = Number(payload.actual_count ?? payload.draw_count ?? payload.requested_count ?? 1)
    if (actorIndex >= 0 && drawCount > 0) {
      const actor = gameState.value.players[actorIndex]
      addReplayHandCards(actor, resolveReplayDrawCardKeys(payload, drawCount))
    }
    return
  }

  if (eventType === 'game_finished' || eventType === 'game_terminated_invalid') {
    const winnerUID = Number(payload.winner_uid || payload.uid || payload.winner || 0)
    if (winnerUID) {
      gameState.value.finished_players = [winnerUID]
    }
  }
}

const computeReplayDelayMs = (currentEvent: any, nextEvent: any) => {
  const currentMs = currentEvent?.__timeMs
  const nextMs = nextEvent?.__timeMs
  if (Number.isFinite(currentMs) && Number.isFinite(nextMs)) {
    const delta = Math.max(200, Math.min(5000, Number(nextMs) - Number(currentMs)))
    return Math.max(120, Math.round(delta / replaySpeed.value))
  }
  return Math.max(150, Math.round(850 / replaySpeed.value))
}

const finishReplayPlayback = (endType: string) => {
  replayIsPlaying.value = false
  replayGameOver.value = true
  replayEndType.value = endType
  clearReplayTimer()
}

const scheduleReplayPlaybackStep = () => {
  clearReplayTimer()
  if (!replayIsPlaying.value || !isReplayBridgeMode.value) return

  if (replayPlaybackIndex.value >= replayEvents.value.length) {
    finishReplayPlayback('game_finished')
    return
  }

  const currentEvent = replayEvents.value[replayPlaybackIndex.value]
  applyReplayEventToBoard(currentEvent)
  replayPlaybackIndex.value += 1

  const currentType = currentEvent?.__type || ''
  if (currentType === 'game_finished' || currentType === 'game_terminated_invalid') {
    finishReplayPlayback(currentType)
    return
  }

  if (replayPlaybackIndex.value >= replayEvents.value.length) {
    finishReplayPlayback('game_finished')
    return
  }

  const nextEvent = replayEvents.value[replayPlaybackIndex.value]
  const delay = computeReplayDelayMs(currentEvent, nextEvent)
  replayTimer = window.setTimeout(() => {
    scheduleReplayPlaybackStep()
  }, delay)
}

const startReplayPlayback = (restart = false) => {
  if (!isReplayBridgeMode.value || !gameState.value) return

  if (restart) {
    replayPlaybackIndex.value = 0
    replayGameOver.value = false
    replayEndType.value = ''
    resetReplaySimulationBoard()
  }

  if (!replayEvents.value.length) {
    replayGameOver.value = true
    replayEndType.value = 'game_finished'
    replayIsPlaying.value = false
    return
  }

  replayIsPlaying.value = true
  clearReplayTimer()
  replayTimer = window.setTimeout(() => {
    scheduleReplayPlaybackStep()
  }, Math.max(120, Math.round(240 / normalizeReplaySpeedValue(replaySpeed.value))))
}

const toggleReplayPlayback = () => {
  if (!isReplayBridgeMode.value) return
  if (replayGameOver.value) return

  if (replayIsPlaying.value) {
    replayIsPlaying.value = false
    clearReplayTimer()
    return
  }

  startReplayPlayback(false)
}

const setReplaySpeed = (speed: number) => {
  const normalized = normalizeReplaySpeedValue(Number(speed))
  replaySpeed.value = normalized

  if (replayIsPlaying.value) {
    clearReplayTimer()
    replayTimer = window.setTimeout(() => {
      scheduleReplayPlaybackStep()
    }, Math.max(120, Math.round(220 / normalizeReplaySpeedValue(replaySpeed.value))))
  }
}

const restartReplayPlayback = () => {
  startReplayPlayback(true)
}

const loadReplaySimulationState = async () => {
  loading.value = true
  loadError.value = null
  showChat.value = false
  showHints.value = false
  showPlayers.value = false
  showChemicalKeyboard.value = false
  clearReplayTimer()
  replayEvents.value = []
  replayPlaybackIndex.value = 0
  replayIsPlaying.value = false
  replayGameOver.value = false
  replayEndType.value = ''
  replayPerspectiveUID.value = null
  replayInitialHands.value = {}

  try {
    await loadSubstanceNames()

    if (!replayHistoryQueryID.value) {
      throw new Error('鏃犳晥鐨勫洖鏀剧紪鍙?)
    }

    let response: any
    response = await gameAPI.getMyGameReplay(replayHistoryQueryID.value)

    const replayPayload = response?.data || {}
    const rawReplayEvents = Array.isArray(replayPayload?.replay?.events) ? replayPayload.replay.events : []
    const normalizedReplayEvents = normalizeReplayEvents(rawReplayEvents)

    const profiles = Array.isArray(replayPayload?.player_profiles)
      ? replayPayload.player_profiles
      : (Array.isArray(replayPayload?.players)
        ? replayPayload.players.map((uid: number) => ({ uid, nickname: `UID ${uid}`, username: `UID ${uid}` }))
        : [])

    const players = profiles.map((p: any, index: number) => ({
      uid: Number(p.uid),
      username: p.nickname || p.username || `UID ${p.uid}`,
      nickname: p.nickname || p.username || `UID ${p.uid}`,
      avatar: p.avatar || '馃И',
      card_count: 0,
      hand_cards: [],
      index,
      is_ai: Number(p.uid) < 0,
      is_offline: false,
      points: 0,
      exp: 0
    }))

    const initialHandsByUID = buildReplayInitialHands(players, normalizedReplayEvents)
    players.forEach((player: any) => {
      const initialHand = (initialHandsByUID[Number(player.uid)] || []).map((key: string) => makeReplayHandCard(key))
      player.hand_cards = initialHand
      player.card_count = initialHand.length
    })

    playersInfo.value = profiles.map((p: any) => ({
      uid: Number(p.uid),
      username: p.username || p.nickname || `UID ${p.uid}`,
      nickname: p.nickname || p.username || `UID ${p.uid}`,
      avatar: p.avatar || '馃И',
      is_ai: Number(p.uid) < 0,
      is_offline: false
    }))

    replayInitialHands.value = {}
    players.forEach((player: any) => {
      replayInitialHands.value[Number(player.uid)] = cloneReplayHandCards(player.hand_cards)
    })

    const preferredPerspective =
      players.find((player: any) => Number(player.uid) === Number(user.value?.uid)) ||
      players.find((player: any) => !player.is_ai) ||
      players[0]
    replayPerspectiveUID.value = preferredPerspective ? Number(preferredPerspective.uid) : null

    roomInfo.value = {
      id: `replay-${replayHistoryQueryID.value}`,
      name: `鍥炴斁妯℃嫙 #${String(replayHistoryQueryID.value).padStart(4, '0')}`,
      players: players.map((p: any) => p.uid),
      spectators: [Number(user.value?.uid)],
      ready_uids: [],
      countdown: 0,
      max_players: Math.max(players.length, 2),
      status: 'playing',
      is_points_mode: false,
      deck_config: {
        name: 'Replay Simulation',
        cards: {}
      },
      is_private: false,
      access_key: '',
      is_pve: false
    }

    gameState.value = {
      status: 'playing',
      players,
      current_player: 0,
      direction: 1,
      turn_end_time: 0,
      pending_draw_count: 0,
      pending_forced_plays: 0,
      allowed_any_player: -1,
      current_reaction: '',
      discard_pile: [],
      last_card: null,
      finished_players: [],
      spectators: [Number(user.value?.uid)],
      points_changes: {},
      xp_changes: {}
    }

    replayEvents.value = normalizedReplayEvents
    startReplayPlayback(true)
  } catch (error: any) {
    console.error('[GameRoom] 鍔犺浇鍥炴斁妯℃嫙澶辫触:', error)
    loadError.value = error?.response?.data?.error || error?.message || '鍥炴斁妯℃嫙鍔犺浇澶辫触'
  } finally {
    loading.value = false
  }
}

const loadGameState = async (silent = false) => {
  if (isRedirecting.value) {
    loading.value = false
    return
  }
  try {
    if (!silent && !roomInfo.value) {
      loading.value = true
      // 棣栨鍔犺浇鏃跺姞杞界墿璐ㄥ悕绉版槧
      await loadSubstanceNames()
    }
      // 鍙湪棣栨鍔犺浇鏃跺皾璇曞姞鍏ユ埧闂?
    if (!silent) {
      try {
        // 浠?URL 鏌ヨ鍙傛暟涓幏鍙栬闂瘑閽ュ拰瑙傛垬妯″紡
        const accessKey = route.query.key as string | undefined
        const asSpectator = route.query.spectator === 'true' || route.query.spectator === '1'
        await gameAPI.joinRoom(id, accessKey, asSpectator)
      } catch (joinError: any) {
        // 濡傛灉鍔犲叆澶辫触锛堜緥濡傛埧闂村凡婊°€佽灏佺绛夛級锛屾樉绀洪敊璇苟杩斿洖
        console.error('[GameRoom] Failed to join room:', joinError)
        const errorMsg = joinError.response?.data?.error || '鏃犳硶鍔犲叆璇ユ埧闂?
        loadError.value = errorMsg
        showToast(errorMsg, '鍔犲叆澶辫触', 'error')
        loading.value = false
        router.push('/')
        return
      }
    }

    const response = await gameAPI.getRoomState(id)
    const data = response.data

    roomInfo.value = {
      id: data.id,
      name: data.name,
      players: data.players,
      ready_uids: data.ready_uids || [],
      countdown: data.countdown || 0,
      max_players: data.max_players,
      status: data.status,
      is_points_mode: data.is_points_mode,
      deck_config: data.deck_config,
      is_private: data.is_private,
      access_key: data.access_key,
      is_pve: data.is_pve
    }

    playersInfo.value = data.players_info || []

    if (data.game_state) {
      gameState.value = data.game_state
      syncTutorialStateFromGameState()

      // 鏁欏妯″紡鎻愮ず鐢熸垚
      if (isTutorialMode.value && isMyTurn.value) {
        generateTutorialHint()
      }
    } else {
      // no game_state yet, room is in waiting status
    }
    
    loading.value = false
  } catch (error: any) {
    console.error('鍔犺浇娓告垙鐘舵€佸け', error)
    loading.value = false

    if (error.response?.status === 404) {
      loadError.value = '鎴块棿涓嶅瓨鍦ㄦ垨宸茶鍏抽棴'
      isRedirecting.value = true
      showToast('鎴块棿涓嶅瓨鍦ㄦ垨宸茶鍏抽棴', '鏈煡瀹為獙', 'error')
      router.push('/')
    } else if (error.response?.status === 401) {
      loadError.value = '韬唤楠岃瘉澶辫触锛岃閲嶆柊鐧诲綍'
      isRedirecting.value = true
      showToast('韬唤楠岃瘉澶辫触锛岃閲嶆柊鐧诲綍', '鍑嗗叆澶辫触', 'error')
      router.push('/login')
    } else if (error.response?.status === 403) {
      loadError.value = '鎮ㄤ笉鍦ㄨ鎴块棿'
      isRedirecting.value = true
      showToast('鎮ㄤ笉鍦ㄨ鎴块棿', '鍑嗗叆澶辫触', 'error')
      router.push('/')
    } else {
      loadError.value = '瀹為獙鐜鍔犺浇寮傚父锛岃閲嶈瘯'
      // 闈炶嚧鍛介敊璇笉鑷姩璺宠浆锛屽厑璁哥敤鎴烽噸
      if (!silent) {
        isRedirecting.value = true
        router.push('/')
      }
    }
  }
}

onMounted(() => {
  // 妫€娴嬫暀瀛︽ā
  const tutorialMode = localStorage.getItem('chemistry-uno-tutorial-mode')
  if (tutorialMode === 'true') {
    isTutorialMode.value = true
    tutorialScriptMode.value = true  // 鍚敤鑴氭湰鍖栨暀
  }

  // 璁剧疆娴獥鎻愮ず缁勪欢寮曠敤
  setToastRef(gameToastRef)

  // 閲嶇疆鐘舵€侊紝闃叉涔嬪墠鐨勯敊璇姸鎬佸奖
  isRedirecting.value = false

  if (isReplayBridgeMode.value) {
    loadReplaySimulationState()
    return
  }

  // 璁剧疆涓€涓畨鍏ㄨ秴鏃讹紝濡傛灉15绉掑悗杩樺湪loading鐘舵€侊紝寮哄埗閲嶇疆
  const safetyTimeout = setTimeout(() => {
    if (loading.value) {
      console.error('Loading timeout - forcing reset')
      loading.value = false
      loadError.value = '瀹為獙瀹ゅ垵濮嬪寲瓒呮椂锛岃妫€鏌ョ綉缁滆繛鎺ュ悗閲嶈瘯'
      showToast('瀹為獙瀹ゅ垵濮嬪寲瓒呮椂锛岃妫€鏌ョ綉缁滆繛鎺ュ悗閲嶈瘯', '杩炴帴瓒呮椂', 'error')
      router.push('/')
    }
  }, 15000)

  if (!OFFLINE_MODE) {
    void friendAPI.getFriends()
      .then(res => {
        friendsList.value = res.data || []
      })
      .catch(err => {
        console.error('Failed to load friends list:', err)
        friendsList.value = []
      })
  }

  loadGameState()
    .then(() => {
      clearTimeout(safetyTimeout) // 鎴愬姛鍔犺浇鍚庢竻闄よ秴

      // 娓告垙鐘舵€佸姞杞芥垚鍔熷悗锛岃幏鍙栨彁绀轰俊鎭紙閬垮厤 setup 闃舵API 璋冪敤澶辫触瀵艰嚧鎻愮ず涓虹┖
      if (showHints.value && randomHints.value.length === 0) {
        fetchRandomHints()
      }

      // 纭繚WebSocket宸茶繛
      if (!websocket.isConnected()) {
        websocket.connect()
      }

      websocket.joinRoom(id)
      websocket.on('game_update', handleGameUpdate)
      websocket.on('player_joined', handlePlayerJoined)
      websocket.on('player_left', handlePlayerLeft)
      websocket.on('action_toast', handleActionToast)
      websocket.on('room_terminated', handleRoomTerminated)
      websocket.on('player_kicked', handlePlayerKicked)
      websocket.on('chat', handleChatNotify)
      websocket.on('private_chat', handleChatNotify)
      websocket.on('level_up', handleLevelUp)

      // 鏁欏妯″紡娆㈣繋鎻愮ず
      if (isTutorialMode.value) {
        const tutorialWelcomeShown = localStorage.getItem('chemistry-uno-tutorial-welcome-shown')
        if (!tutorialWelcomeShown) {
          setTimeout(() => {
            if (tutorialScriptMode.value) {
              showToast(
                '馃帗 娆㈣繋鏉ュ埌鑴氭湰鍖栨暀瀛﹀叧鍗★紒浣犲皢璺熼殢绯荤粺鎸囧紩锛屾寜鐓у浐瀹氭楠ゅ涔犳父鎴忔満鍒躲€傝涓ユ牸鎸夌収鎻愮ず鐨勯『搴忓嚭鐗?,
                '馃摉 鏁欏鑴氭湰宸插姞杞?,
                'success',
                9000
              )
            } else {
              showToast(
                '馃挕 娆㈣繋鏉ュ埌鏁欏鍏冲崱锛佽繖鏄竴鍦轰綆闅惧害鐨凙I瀵规垬锛屽湪浣犵殑鍥炲悎鏃朵細鍑虹幇瀹炴椂鎻愮ず甯姪浣犲涔犳父鎴忋€傜浣犵帺寰楀紑蹇冿紒',
                '馃幆 鏁欏妯″紡宸插紑鍚?,
                'success',
                8000
              )
            }
            localStorage.setItem('chemistry-uno-tutorial-welcome-shown', 'true')
          }, 1500)
        }
      }
    })
    .catch(err => {
      clearTimeout(safetyTimeout) // 鎹曡幏閿欒鍚庝篃娓呴櫎瓒呮椂
      // loadGameState 鍐呴儴宸茬粡澶勭悊浜嗛敊璇紝杩欓噷鍙槸纭繚涓嶄細鏈夋湭澶勭悊鐨刾romise rejection
      console.error('Failed to initialize game room:', err)
      loading.value = false
    })
})

onUnmounted(() => {
  clearReplayTimer()
  if (centerEffectTimer != null) {
    window.clearTimeout(centerEffectTimer)
  }

  // 娓呴櫎鏁欏妯″紡鏍囪锛屽苟璁板綍宸插畬
  if (isTutorialMode.value) {
    localStorage.removeItem('chemistry-uno-tutorial-mode')
    localStorage.removeItem('chemistry-uno-tutorial-welcome-shown')
    if (gameState.value?.status === 'finished') {
      localStorage.setItem('chemistry-uno-tutorial-completed', 'true')
    }
  }

  if (timerRaf) cancelAnimationFrame(timerRaf)
  websocket.leaveRoom()
  websocket.off('game_update', handleGameUpdate)
  websocket.off('player_joined', handlePlayerJoined)
  websocket.off('player_left', handlePlayerLeft)
  websocket.off('action_toast', handleActionToast)
  websocket.off('room_terminated', handleRoomTerminated)
  websocket.off('player_kicked', handlePlayerKicked)
  websocket.off('chat', handleChatNotify)
  websocket.off('private_chat', handleChatNotify)
})

const canRunTutorialAction = (action: TutorialStep['action'], substance?: string) => {
  if (!tutorialScriptMode.value) return true

  const check = getTutorialActionCheck(tutorialCurrentStep.value, action, substance)
  if (!check.allowed) {
    const expected = check.expectedSubstance
      ? `${check.expectedAction || 'action'} ${check.expectedSubstance}`
      : (check.expectedAction || 'the scripted action')
    showToast(`Tutorial step is locked. Please perform ${expected}.`, 'Tutorial Mode', 'warning', 2500)
    return false
  }

  return true
}

const showTutorialLockToast = (message = 'Tutorial step is locked. Follow the current tutorial prompt.') => {
  showToast(message, 'Tutorial Mode', 'warning', 2500)
}

const canUseTutorialLockedSurface = () => {
  if (!tutorialLockActive.value) return true
  showTutorialLockToast()
  return false
}

const handleTutorialLockedSurface = (callback: () => void) => {
  if (!canUseTutorialLockedSurface()) return
  callback()
}

watch(tutorialLockActive, (locked) => {
  if (!locked) return
  showChat.value = false
  showHints.value = false
  showPlayers.value = false
  showDeckDetailModal.value = false
  showChemicalKeyboard.value = false
  closeAIAssistant()
})

const handleCardClick = async (card: any) => {
  if (!isMyTurn.value) return
  if (!canRunTutorialAction('play', card.type)) return

  feedback.click()

  // 鍔熻兘鐗岀洿鎺ユ墦
  const specialTypes = ['+2', '+4', 'Au', 'He', 'Ne', 'Ar', 'Kr']
  if (specialTypes.includes(card.type) || card.effect) {
    try {
      await gameAPI.playCard(id, card, card.type)
      feedback.playCard()
      selectedCard.value = null
      selectedSubstance.value = null
      availableSubstances.value = []
      return
    } catch (error: any) {
      showToast(error.response?.data?.error || '鍑虹墝澶辫触', '鍙嶅簲涓柇', 'error')
      feedback.error()
      return
    }
  }

  // 鍏冪礌鐗岋細鐩存帴鍑虹墝璇ュ厓绱犵鍙凤紙鍗曡川
  // 渚嬪锛氱偣H 鎵嬬墝 鍑虹墝鐗╄川H锛堜笉绠″崟璐ㄦ槸 H 杩樻槸 H鈧傦級
  // 鍚庣浼氳繘琛岀墿璐ㄥ悎娉曟€ф娴嬶紙substances琛級鍜屽弽搴旀鏌ワ紙reactions琛級
  try {
    await gameAPI.playCard(id, card, card.type)
    feedback.playCard()
    selectedCard.value = null
    selectedSubstance.value = null
    availableSubstances.value = []
    // 澧炲姞缁忛獙
    addExp(10)
    checkAchievements(card.type)
  } catch (error: any) {
    showToast(error.response?.data?.error || '鍑虹墝澶辫触', '鍙嶅簲涓柇', 'error')
    feedback.error()
  }
}

const handlePlayCard = async () => {
  if (!selectedSubstance.value) {
    showToast('璇烽€夋嫨瑕佸悎鎴愭垨鏀剧疆鐨勫寲瀛︾墿', '鏈€夋嫨鐩爣', 'warning')
    return
  }
  if (!canRunTutorialAction('play', selectedSubstance.value)) return

  // 鑴氭湰鍖栨暀瀛︽ā寮忥細楠岃瘉鏄惁鏄纭殑
  if (tutorialScriptMode.value) {
    const currentStep = getTutorialStep(tutorialCurrentStep.value)
    if (currentStep && currentStep.player === 'human') {
      if (selectedSubstance.value !== currentStep.substance) {
        showToast(
          `璇锋寜鐓ф暀瀛︽彁绀烘墦<strong>${currentStep.substance}</strong>`,
          '鈿狅笍 鏁欏妯″紡',
          'warning',
          3000
        )
        return
      }
    }
  }

  if (doubleMode.value) {
    if (!firstDoubleSubstance.value) {
      firstDoubleSubstance.value = selectedSubstance.value
    } else if (!secondDoubleSubstance.value) {
      secondDoubleSubstance.value = selectedSubstance.value
    }
    selectedCard.value = null
    selectedSubstance.value = null
    availableSubstances.value = []
    return
  }

  try {
    // 濡傛灉娌℃湁閫変腑鐨勫崱鐗囷紝鍒欎紶閫掍竴涓甫绫诲瀷鐨勫崰浣嶇锛屽悗绔細鏍规嵁鐗╄川娑堣€楁墜
    const cardToPlay = selectedCard.value || { type: selectedSubstance.value, count: 1, effect: '' }
    await gameAPI.playCard(id, cardToPlay, selectedSubstance.value)

    // 鎾斁鎵撶墝鍙嶉
    feedback.playCard()

    // 澧炲姞缁忛獙鍊煎苟妫€鏌ユ垚
    addExp(10)
    checkAchievements(selectedSubstance.value)

    selectedCard.value = null
    selectedSubstance.value = null
    availableSubstances.value = []
  } catch (error: any) {
    showToast(error.response?.data?.error || '鍑虹墝澶辫触', '鍙嶅簲涓柇', 'error')
  }
}

const handleDoublePlay = async () => {
  if (!firstDoubleSubstance.value || !secondDoubleSubstance.value) {
    showToast('璇烽€夋嫨鍙備笌鍙岃仈鍙嶅簲鐨勪袱绉嶇墿', '鏈氨缁?, 'warning')
    feedback.error()
    return
  }
  if (!canRunTutorialAction('double', `${firstDoubleSubstance.value}+${secondDoubleSubstance.value}`)) return

  try {
    await gameAPI.playDouble(id, firstDoubleSubstance.value, secondDoubleSubstance.value)

    feedback.playCard()

    // 澧炲姞缁忛獙
    addExp(25)
    checkAchievements(firstDoubleSubstance.value)
    checkAchievements(secondDoubleSubstance.value)

    firstDoubleSubstance.value = null
    secondDoubleSubstance.value = null
    doubleMode.value = false
    selectedCard.value = null
    selectedSubstance.value = null
    availableSubstances.value = []
  } catch (error: any) {
    showToast(error.response?.data?.error || '鍙岃仈琛屽姩澶辫触', '鍙嶅簲涓柇', 'error')
    feedback.error()
  }
}

const toggleDoubleMode = () => {
  if (!canRunTutorialAction('double')) return
  if (!myData.value?.double_action_available) {
    showToast('鍙岃仈鍙嶅簲灏氭湭灏辩华锛岃鍏堣繘琛屾櫘閫氬疄楠岋紙琛屽姩锛?, '鏃犳硶鍙戝姩', 'warning')
    feedback.error()
    return
  }
  doubleMode.value = !doubleMode.value
  feedback.doubleMode()
  firstDoubleSubstance.value = null
  secondDoubleSubstance.value = null
  selectedSubstance.value = null
}

const removeSubstance = (pos: number) => {
  feedback.click()
  if (pos === 1) {
    firstDoubleSubstance.value = secondDoubleSubstance.value
    secondDoubleSubstance.value = null
  } else {
    secondDoubleSubstance.value = null
  }
}

const handleInputPlay = async () => {
  if (!substanceInput.value) return
  if (!canRunTutorialAction('play', substanceInput.value)) return

  if (doubleMode.value) {
    const sub = substanceInput.value
    if (!firstDoubleSubstance.value) {
      firstDoubleSubstance.value = sub
    } else if (!secondDoubleSubstance.value) {
      secondDoubleSubstance.value = sub
    }
    substanceInput.value = ''
    return
  }

  try {
    // 涓哄吋瀹瑰師API锛屼紶涓€涓┖Card瀵硅薄
    await gameAPI.playCard(id, { type: '', count: 0, effect: '' }, substanceInput.value)

    feedback.playCard()

    // 澧炲姞缁忛獙鍊煎苟妫€鏌ユ垚
    addExp(10)
    checkAchievements(substanceInput.value)

    substanceInput.value = ''
    selectedCard.value = null
    selectedSubstance.value = null
    availableSubstances.value = []
  } catch (error: any) {
    showToast(error.response?.data?.error || '鍑虹墝澶辫触', '鍙嶅簲涓柇', 'error')
    feedback.error()
  }
}

const handleDrawCard = async () => {
  if (!canRunTutorialAction('draw')) return
  try {
    await gameAPI.drawCard(id)
    feedback.drawCard()
  } catch (error: any) {
    showToast(error.response?.data?.error || '鎽哥墝澶辫触', '绯荤粺寮傚父', 'error')
    feedback.error()
  }
}

// 鍖栧閿洏纭澶勭悊
const handleKeyboardConfirm = async (formula: string) => {
  if (tutorialLockActive.value) {
    showTutorialLockToast()
    showChemicalKeyboard.value = false
    return
  }

  substanceInput.value = formula
  showChemicalKeyboard.value = false
  await handleInputPlay()
}

const handleLeaveRoom = async () => {
  if (tutorialLockActive.value) {
    showTutorialLockToast()
    return
  }

  if (isReplayBridgeMode.value) {
    const scopeQuery = ''
    router.push(`/replay/${replayHistoryQueryID.value}${scopeQuery}`)
    return
  }

  // 浜烘満瀵规垬妯″紡涓嬶紝濡傛灉鐜╁宸茬粡瀹屾垚锛堣繘鍏ヨ鎴樼姸鎬侊級锛岀偣鍑婚€€鍑烘敼涓衡€滅粨绠?
  if (roomInfo.value?.is_pve && isSpectator.value) {
    try {
      // 璋冪敤API閫氱煡鏈嶅姟鍣ㄧ帺瀹剁寮€鎴块棿
      await gameAPI.leaveRoom(id)
    } catch (error) {
      console.error('绂诲紑鎴块棿API璋冪敤澶辫触:', error)
    }
    // 鏂紑鎴块棿杩炴帴骞跺仠姝㈢洃鍚紙鐩存帴鈥滃叧闂€濇埧闂撮€昏緫
    websocket.leaveRoom()
    websocket.off('game_update', handleGameUpdate)
    websocket.off('player_joined', handlePlayerJoined)
    websocket.off('player_left', handlePlayerLeft)
    websocket.off('action_toast', handleActionToast)
    websocket.off('room_terminated', handleRoomTerminated)
    websocket.off('player_kicked', handlePlayerKicked)
    websocket.off('chat', handleChatNotify)
    websocket.off('private_chat', handleChatNotify)

    if (gameState.value) {
      isManualSettlement.value = true
      gameState.value.status = 'finished'
      // 鏋勯€犱复鏃剁Н鍒嗘暟鎹敤浜庡睍绀猴紙濡傛灉灏氭湭缁撶畻
      if (!gameState.value.points_changes) {
        const changes: Record<string, number> = {}
        const finishers = gameState.value.finished_players || []
        
        // 纭繚鎵€鏈夌帺瀹堕兘鍦ㄥ垪琛ㄤ腑锛屽嵆渚挎湁浜涜繕娌℃墦
        const allUIDs = gameState.value.players.map((p: any) => p.uid)
        const remainingUIDs = allUIDs.filter((id: number) => !finishers.includes(id))
        const fullFinishers = [...finishers, ...remainingUIDs]
        
        const quittedCount = gameState.value.quitted_count || 0
        const originalCount = gameState.value.original_player_count || gameState.value.players.length
        const multiplier = originalCount > 0 ? (1.0 - (quittedCount / originalCount)) : 1.0
        const difficulty = roomInfo.value?.pve_difficulty || 100

        fullFinishers.forEach((uid: number, index: number) => {
          const rank = index + 1
          let points = 0
          
          // 鍚庣缁撶畻閫昏緫
          // 濡傛灉鏄渶鍚庝竴鍚嶄笖鎬讳汉鏁板ぇ锛岀粰浜堝浐瀹氬弬涓庡垎 5
          if (index === fullFinishers.length - 1 && fullFinishers.length > 1) {
            points = 5
          } else {
            points = Math.floor(100 / rank)
          }

          // 搴旂敤鍊嶇巼 (鍙椾腑閫旈€€鍑轰汉鏁板奖
          points = Math.floor(points * multiplier)

          // PvE 妯″紡绉垎淇
          if (roomInfo.value?.is_pve) {
            // 闅惧害 < 50锛屾棤娉曡幏寰楃Н
            if (difficulty < 50) {
              points = 0
            } else {
              // 绉垎 = 鍘熷绉垎 * (闅惧害 / 100)
              points = Math.floor(points * (difficulty / 100.0))
            }
          }

          if (points < 1 && (!roomInfo.value?.is_pve || difficulty >= 50)) {
            points = 1
          }

          changes[String(uid)] = points
        })
        gameState.value.points_changes = changes
      }
    }
    router.push('/')
    return
  }

  try {
    let message = '鏆傛椂绂诲紑瀹為獙瀹わ紵浣犲彲浠ュ湪琚涪鍑哄墠闅忔椂杩斿洖缁х画瀹為獙'
    let title = '鏆傜瀹為獙'

    // 濡傛灉鐜╁宸插畬鎴愬疄楠屼笖鏄Н鍒嗘ā寮忥紝鎻愮ず宸茶幏寰楀垎鍊煎苟鍙洿鎺ュ畨鍏ㄧ寮€
    if (isSpectator.value) {
      const rank = (gameState.value?.finished_players || []).indexOf(user.value?.uid) + 1
      const points = rank === 1 ? 100 : (rank === 2 ? 50 : (rank === 3 ? 33 : 25))
      message = `瀹為獙宸插畬鎴愶紒浣犺幏寰椾簡${rank} 鍚嶏紝绯荤粺宸蹭负浣犲彂鏀剧害 ${points} 鐕冪礌銆傜‘瀹氱幇鍦ㄧ粨鏉熻繖娆″疄楠屽悧锛焋
      title = '瀹為獙缁撶畻'
    }

    const confirmed = await showConfirm(message, title)
    if (confirmed) {
      feedback.click()
      // 璋冪敤API閫氱煡鏈嶅姟鍣ㄧ帺瀹跺交搴曠寮€鎴块棿
      // 娉ㄦ剰锛氬嵆渚挎槸姝ｅ湪娓告垙涓紝鐢ㄦ埛鐐瑰嚮鈥滈€€鍑衡€濅篃搴旇鎵ц leaveRoom 閫昏緫
      // 浠ラ噴鏀捐鐢ㄦ埛鐨勨€滃悓鏃跺彧鑳借繘琛屼竴娆℃父鎴忊€濋攣
      try {
        await gameAPI.leaveRoom(id)
      } catch (error) {
        console.error('绂诲紑鎴块棿API璋冪敤澶辫触:', error)
      }
      
      // 鏂紑鎴块棿杩炴帴骞跺仠姝㈢洃
      websocket.leaveRoom()
      router.push('/')
    }
  } catch (error) {
    console.error('绂诲紑鎴块棿澶辫触:', error)
    router.push('/')
  }
}

const getDynamicCardClass = (card: any, formula?: string) => {
  if (!card) {
    if (formula) {
      const elements = formula.match(/[A-Z][a-z]?/g) || []
      if (elements.length > 1) return 'card-reaction'
      if (elements.length === 1 && ELEMENTS_DATA[elements[0]]) return ELEMENTS_DATA[elements[0]].class
    }
    return ''
  }

  // 鐗规畩鎬ц川鍗＄墝浼樺厛
  const nobleGases = ['He', 'Ne', 'Ar', 'Kr']
  if (nobleGases.includes(card.type)) return 'card-noble'
  if (card.effect || card.type === 'Au') return 'card-func'

  // 濡傛灉鎻愪緵浜嗗垎瀛愬紡锛堥€氬父鏄弽搴旂粨鏋滐級
  if (formula) {
    const elements = formula.match(/[A-Z][a-z]?/g) || []
    // 鍒よ鏄惁涓哄寲鍚堢墿锛堝寘鍚绉嶅厓绱狅級
    if (elements.length > 1) return 'card-reaction'
    // 鍗曡川鍒欎娇鐢ㄨ鍏冪礌鐨勯
    if (elements.length === 1 && ELEMENTS_DATA[elements[0]]) return ELEMENTS_DATA[elements[0]].class
  }

  // 鍩虹鍏冪礌棰滆壊
  if (ELEMENTS_DATA[card.type]) return ELEMENTS_DATA[card.type].class
  
  return ''
}

const setupDraggable = (el: HTMLElement | null) => {
  if (!el) return
  let isDown = false
  let startX: number
  let scrollLeft: number

  const onMouseDown = (e: MouseEvent) => {
    isDown = true
    el.style.cursor = 'grabbing'
    startX = e.pageX - el.offsetLeft
    scrollLeft = el.scrollLeft
  }

  const onMouseLeave = () => {
    isDown = false
    el.style.cursor = 'grab'
  }

  const onMouseUp = () => {
    isDown = false
    el.style.cursor = 'grab'
  }

  const onMouseMove = (e: MouseEvent) => {
    if (!isDown) return
    e.preventDefault()
    const x = e.pageX - el.offsetLeft
    const walk = (x - startX) * 2
    el.scrollLeft = scrollLeft - walk
  }

  el.addEventListener('mousedown', onMouseDown)
  el.addEventListener('mouseleave', onMouseLeave)
  el.addEventListener('mouseup', onMouseUp)
  el.addEventListener('mousemove', onMouseMove)

  return () => {
    el.removeEventListener('mousedown', onMouseDown)
    el.removeEventListener('mouseleave', onMouseLeave)
    el.removeEventListener('mouseup', onMouseUp)
    el.removeEventListener('mousemove', onMouseMove)
  }
}

onMounted(() => {
  isMobile.value = window.innerWidth < 640

  // 绉诲姩绔嚜鍔ㄥ叧闂彁绀洪潰
  if (isMobile.value) {
    showHints.value = false
  }

  const handleResize = () => {
    isMobile.value = window.innerWidth < 640
  }
  window.addEventListener('resize', handleResize)

  // 绉诲姩绔嚜鍔ㄥ叏
  if (isMobile.value) {
    // 鐢ㄦ埛棣栨浜や簰鍚庤姹傚叏
    const onFirstInteraction = () => {
      requestFullscreen()
      document.removeEventListener('touchstart', onFirstInteraction)
      document.removeEventListener('click', onFirstInteraction)
    }
    document.addEventListener('touchstart', onFirstInteraction, { once: true })
    document.addEventListener('click', onFirstInteraction, { once: true })
  }

  // 鍒濆鍖栨嫋鎷芥粦
  let cleanupHand: (() => void) | undefined
  let cleanupSubstances: (() => void) | undefined
  setTimeout(() => {
    cleanupHand = setupDraggable(handContainer.value)
    cleanupSubstances = setupDraggable(substancesContainer.value)
  }, 500)

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    cleanupHand?.()
    cleanupSubstances?.()
  })
})

// 鐩戝惉褰撳墠鐜╁鍙樺寲锛岃嚜鍔ㄦ粴鍔ㄥ埌琛屽姩鐜╁
watch(() => gameState.value?.current_player, () => {
  nextTick(() => scrollToActivePlayer())
})

watch([roomInfo, gameState, playersInfo, user], syncAIAssistantContext, { deep: true, immediate: true })
</script>

<template>
  <div data-testid="game-room-page" class="console-app-shell h-[var(--app-height)] max-h-[var(--app-height)] w-full text-slate-900 dark:text-white overflow-hidden flex flex-col font-sans selection:bg-blue-500/30 game-console-shell">
    <div class="console-grid-overlay"></div>
    <!-- Loading State -->
    <div v-if="loading" class="h-[var(--app-height)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <!-- Background Elements -->
      <div class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 dark:bg-blue-500/30 rounded-full blur-[120px] animate-pulse"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 dark:bg-purple-500/30 rounded-full blur-[120px]"></div>
      <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>

      <div class="relative z-10 flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-700">
        <div class="relative group">
          <div class="w-24 h-24 bg-sky-700/15 dark:bg-sky-500/20 border border-sky-700/30 dark:border-sky-400/30 rounded-[28px] flex items-center justify-center transition-all duration-500 shadow-lg shadow-sky-900/10">
            <FlaskConical class="w-12 h-12 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform drop-shadow-lg" />
          </div>
          <div class="absolute -top-2 -right-2 w-8 h-8 bg-sky-700 dark:bg-sky-500 rounded-xl flex items-center justify-center animate-bounce shadow-[0_0_20px_rgba(3,105,161,0.35)]">
             <Zap class="w-4 h-4 text-white fill-current" />
          </div>
        </div>
        <div class="text-center space-y-3">
          <h2 class="text-2xl font-black text-slate-800 dark:text-white tracking-widest uppercase drop-shadow-lg">Initializing Lab / 鍒濆鍖栧疄楠屽</h2>
          <p class="text-sm text-slate-600 dark:text-slate-300 font-medium">姝ｅ湪杩炴帴瀹為獙.. / Connecting to the lab...</p>
          <div class="flex items-center gap-1 justify-center">
             <span class="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s] shadow-lg shadow-blue-500/50"></span>
             <span class="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s] shadow-lg shadow-blue-500/50"></span>
             <span class="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce shadow-lg shadow-blue-500/50"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Error / No Data State - 闃叉榛戝睆 -->
    <div v-else-if="!roomInfo" class="h-[var(--app-height)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-600/10 dark:bg-red-500/20 rounded-full blur-[120px]"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 dark:bg-purple-500/20 rounded-full blur-[120px]"></div>

      <div class="relative z-10 flex flex-col items-center gap-6">
        <div class="w-24 h-24 bg-red-500/10 dark:bg-red-500/20 border-2 border-red-500/30 rounded-[32px] flex items-center justify-center shadow-lg">
          <Activity class="w-12 h-12 text-red-500 dark:text-red-400" />
        </div>
        <div class="text-center space-y-3">
          <h2 class="text-2xl font-black text-slate-800 dark:text-white tracking-widest uppercase">Connection Lost / 杩炴帴涓柇</h2>
          <p class="text-sm text-slate-600 dark:text-slate-300 font-medium">{{ loadError || '瀹為獙瀹よ繛鎺ュ紓/ Lab connection interrupted' }}</p>
        </div>
        <div class="flex items-center gap-3 mt-4">
          <button
            @click="loadError = null; loading = true; isReplayBridgeMode ? loadReplaySimulationState() : loadGameState()"
            :class="cn(consoleButton({ tone: 'primary', size: 'md' }), 'text-xs')"
          >
            <RefreshCw class="w-4 h-4" />
            閲嶆柊杩炴帴 / Reconnect
          </button>
          <button
            @click="router.push('/')"
            :class="cn(consoleButton({ tone: 'secondary', size: 'md' }), 'text-xs')"
          >
            <ArrowLeft class="w-4 h-4" />
            杩斿洖澶у巺 / Back to Lobby
          </button>
        </div>
      </div>
    </div>

    <template v-else>
      <!-- Dynamic Background -->
      <div class="fixed inset-0 pointer-events-none">
        <div class="absolute top-1/4 left-1/4 w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[150px] animate-pulse"></div>
        <div class="absolute bottom-1/4 right-1/4 w-[50%] h-[50%] bg-purple-600/5 rounded-full blur-[150px] animate-pulse delay-1000"></div>
        <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
        <!-- Scanning Line -->
        <div class="absolute top-0 left-0 w-full h-px bg-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-scan"></div>
      </div>

      <!-- Compressed Header - 绉诲姩绔紭鍖?-->
      <header class="h-11 sm:h-16 bg-white/72 dark:bg-[#071019]/84 backdrop-blur-2xl border-b border-slate-300/60 dark:border-white/8 px-2 sm:px-5 flex items-center gap-2 sm:gap-3 z-50 sticky top-0 overflow-x-auto custom-scrollbar-hidden">
        <div class="flex items-center gap-2 sm:gap-4 shrink-0">
          <button
            @click="handleLeaveRoom"
            class="btn-touch flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl text-slate-500 hover:text-blue-500 transition-all touch-feedback border border-transparent hover:border-blue-500/20"
          >
            <ArrowLeft v-if="!(roomInfo?.is_pve && isSpectator)" class="icon-touch" />
            <Trophy v-else class="w-4 h-4 text-amber-500" />
            <span class="text-[10px] font-black uppercase tracking-widest">
              <BilingualText :zh="isReplayBridgeMode ? '返回时间轴' : ((roomInfo?.is_pve && isSpectator) ? '结算实验' : '')" :en="isReplayBridgeMode ? 'Return Timeline' : ((roomInfo?.is_pve && isSpectator) ? 'Settlement' : '')" />
            </span>
          </button>
          <div class="hidden xs:block">
            <h2 class="text-[10px] sm:text-xs font-black tracking-[0.22em] uppercase font-mono text-slate-400">Node: {{ roomInfo?.name || id.substring(0, 6) }}</h2>
            <div class="flex items-center gap-1.5">
            </div>
          </div>
        </div>

        <!-- Center Area: Reaction Display & Turn Indicator -->
        <div class="flex-1 flex justify-center items-center gap-1.5 sm:gap-4 overflow-hidden">
            <!-- Reaction Widget - 鍙嶅簲璁板綍鐩戞帶 -->
            <transition name="reaction-slide">
              <div v-if="gameState?.current_reaction" class="flex items-center gap-1.5 sm:gap-3 px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 dark:border-emerald-400/20 shadow-sm backdrop-blur-md shrink-0 max-w-[150px] xs:max-w-[220px] sm:max-w-none group hover:border-emerald-500/40 transition-colors">
                  <div class="flex flex-col items-start leading-none gap-0.5 min-w-0">
                    <span class="text-[5px] sm:text-[7px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 opacity-80 flex items-center gap-1">
                      <Binary class="w-1.5 h-1.5 sm:w-2 sm:h-2" />
                      <BilingualText zh="鍙嶅簲鍚屾" en="Reaction Sync" />
                    </span>
                    <span class="text-[8px] sm:text-[11px] font-mono font-black text-slate-700 dark:text-emerald-300 drop-shadow-sm truncate">
                      {{ gameState.current_reaction }}
                    </span>
                  </div>
                  <div class="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              </div>
            </transition>

            <div v-if="gameState?.status === 'playing'" class="animate-in fade-in zoom-in duration-500 max-w-[240px] sm:max-w-[320px]">
              <div :class="cn('room-status-banner room-status-banner--inline', `room-status-banner--${roomStatusTone}`)">
                <div class="room-status-banner__eyebrow">
                  <Radar class="w-3.5 h-3.5" />
                  <BilingualText zh="房间状态" en="Room Status" />
                </div>
                <div class="room-status-banner__body">
                  <div class="room-status-banner__copy">
                    <p class="room-status-banner__title truncate">{{ roomStatusLabel }}</p>
                    <p class="room-status-banner__text truncate">{{ roomStatusMessage }}</p>
                  </div>
                  <div class="room-status-banner__meta">
                    <span v-if="hasTurnLimit">{{ timeRemaining }}S</span>
                    <span v-else>{{ gameState?.direction === 1 ? 'CW' : 'CCW' }}</span>
                  </div>
                </div>
              </div>
            </div>
        </div>

        <!-- Global Status -->
        <div class="flex items-center gap-2 sm:gap-1.5 pl-3 border-l border-slate-200 dark:border-white/10 shrink-0">
          <button data-testid="game-ai-assistant-toggle" @click="feedback.click(); handleTutorialLockedSurface(openAIAssistant)" class="btn-touch flex items-center justify-center bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 hover:text-cyan-500 touch-feedback">
            <Bot class="icon-touch" />
          </button>

          <button data-testid="game-players-toggle" @click="feedback.click(); handleTutorialLockedSurface(() => { showPlayers = !showPlayers })" class="btn-touch relative flex items-center justify-center gap-1 bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 hover:text-blue-500 touch-feedback">
             <Users class="icon-touch" :class="showPlayers && 'fill-current text-blue-500'" />
             <span class="text-[10px] sm:text-xs-mobile font-black text-slate-400">{{ allPlayers.length }}</span>
          </button>

           <button v-if="!roomInfo?.is_points_mode && !isReplayBridgeMode" data-testid="game-hints-toggle" @click="feedback.click(); handleTutorialLockedSurface(() => { showHints = !showHints })" class="btn-touch flex items-center justify-center bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 hover:text-blue-500 touch-feedback">
             <Sparkles class="icon-touch" :class="showHints && 'fill-current text-blue-500'" />
          </button>

           <button v-if="!isReplayBridgeMode" data-testid="game-chat-toggle" @click="feedback.click(); handleTutorialLockedSurface(() => { showChat = !showChat; hasNewMessage = false })" class="btn-touch relative flex items-center justify-center bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 hover:text-blue-500 touch-feedback">
             <MessageCircle class="icon-touch" :class="showChat && 'fill-current text-blue-500'" />
             <div v-if="hasNewMessage" class="absolute -top-1 -right-1 w-3 h-3 sm:w-2.5 sm:h-2.5 bg-rose-500 border-2 border-white dark:border-[#0d0d10] rounded-full animate-pulse"></div>
          </button>
        </div>
      </header>

      <div v-if="isReplayBridgeMode" class="relative z-[80] px-3 py-2 bg-amber-500/10 border-b border-amber-500/20 pointer-events-auto">
          <div class="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
            <BilingualText zh="鍥炴斁妯℃嫙" en="Replay Simulation" />
            <span class="px-2 py-0.5 rounded-md bg-amber-500/20">{{ replayStatusText }}</span>
            <span class="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-700 dark:text-cyan-300"><BilingualText zh="瑙嗚" en="Perspective" /> {{ replayPerspectiveName }}</span>
            <span class="text-amber-600/90 dark:text-amber-200"><BilingualText zh="输入选项已禁用" en="Input options disabled" /></span>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300"><BilingualText zh="鍊嶉€? en="Speed" /></span>
            <div class="inline-flex items-center gap-1 p-1 rounded-lg border border-amber-500/20 bg-white/60 dark:bg-white/5">
              <button
                v-for="speed in replaySpeedOptions"
                :key="`speed-${speed}`"
                type="button"
                @click.stop.prevent="setReplaySpeed(Number(speed))"
                :class="cn('px-2 py-1 rounded text-[10px] font-black', replaySpeed === speed ? 'bg-amber-500 text-white' : 'text-amber-700 dark:text-amber-300 hover:bg-amber-500/15')"
              >
                {{ speed }}x
              </button>
            </div>

            <button
              type="button"
              @click.stop.prevent="toggleReplayPlayback"
              :disabled="replayGameOver"
              :class="cn('px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border', replayGameOver ? 'border-slate-300 text-slate-400 cursor-not-allowed' : 'border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15')"
            >
              <BilingualText :zh="replayIsPlaying ? '鏆傚仠' : '缁х画'" :en="replayIsPlaying ? 'Pause' : 'Play'" />
            </button>

            <button
              type="button"
              @click.stop.prevent="restartReplayPlayback"
              class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15"
            >
              <BilingualText zh="閲嶆柊鎾斁" en="Restart" />
            </button>

            <span class="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300"><BilingualText zh="杩涘害" en="Progress" /> {{ replayProgressText }}</span>
          </div>
        </div>
      </div>

      <!-- Input box and Timer - 椤舵爮涓嬫柟7px -->
      <div v-if="isMyTurn" class="relative w-full flex justify-center px-4 z-[60] mt-2">
        <div class="flex flex-col items-center gap-2 animate-in slide-in-from-top-2">
          <div class="flex items-center bg-white/88 dark:bg-black/72 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-xl p-1 shadow-lg">
            <input
              v-model="substanceInput"
              data-testid="game-substance-input"
              @keyup.enter="handleInputPlay"
              @focus="handleInputFocus"
              @blur="handleInputBlur"
              :readonly="tutorialLockActive"
              :placeholder="td('reactions.searchPlaceholder')"
              :inputmode="isMobile || user.enable_element_input ? 'none' : 'text'"
              autocomplete="off"
              class="bg-transparent border-none outline-none text-sm sm:text-xs-mobile px-3 sm:px-2 py-1.5 sm:py-1 w-32 sm:w-40 font-black tracking-widest placeholder:text-slate-400 text-slate-900 dark:text-white"
            />

            <div class="flex items-center gap-1">
               <button
                  data-testid="game-play-button"
                  @click="handleInputPlay"
                  class="btn-touch bg-blue-600 hover:bg-blue-500 rounded-lg sm:rounded-md flex items-center justify-center transition-all touch-feedback shadow-md group"
                  :title="td('reactions.registryTitle')"
               >
                  <ChevronRight class="w-4 h-4 sm:w-3.5 sm:h-3.5 text-white group-hover:translate-x-0.5 transition-transform" />
               </button>

               <div class="w-px h-5 sm:h-4 bg-slate-200 dark:bg-white/10 mx-1 sm:mx-0.5"></div>

               <button
                  v-if="!tutorialScriptMode"
                  data-testid="game-draw-button"
                  @click="handleDrawCard"
                  :disabled="!isMyTurn"
                  :class="cn(
                    'px-3 sm:px-2 btn-touch rounded-lg sm:rounded-md flex items-center justify-center gap-1.5 sm:gap-1 transition-all touch-feedback shadow-md group relative overflow-hidden',
                    isMyTurn ? (gameState?.pending_draw_count > 0 ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-slate-800 dark:bg-white/10 hover:bg-slate-700 dark:hover:bg-white/20 text-white') : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed grayscale'
                  )"
               >
                  <Plus v-if="!(gameState?.pending_draw_count > 0)" class="w-3 h-3 sm:w-2.5 sm:h-2.5" />
                  <RefreshCw v-else class="w-3 h-3 sm:w-2.5 sm:h-2.5 animate-spin-slow" />
                  <span class="text-xs-mobile font-black uppercase tracking-widest whitespace-nowrap">
                    鎽哥墝{{ gameState?.pending_draw_count > 0 ? gameState.pending_draw_count : '2' }}?
                  </span>
               </button>
            </div>
          </div>

          <div class="flex items-center gap-2 sm:gap-1.5">
            <div class="bg-blue-600/90 backdrop-blur-md px-4 sm:px-3 py-2 sm:py-1 rounded-full border border-white/20 shadow-md flex items-center gap-2.5 sm:gap-2">
              <Zap class="w-3 h-3 sm:w-2.5 sm:h-2.5 fill-current animate-pulse text-white" />
              <span class="text-xs-mobile font-black uppercase tracking-widest text-white">
                鎿嶄綔 ({{ hasTurnLimit ? (timeRemaining + 's') : '鏃犳椂' }})
              </span>

              <!-- 鍙岃仈琛屽姩鎸夐挳 -->
              <button
                v-if="myData?.double_action_available"
                @click.stop="toggleDoubleMode"
                :class="cn(
                  'px-3 sm:px-2.5 py-1.5 sm:py-1 rounded-2xl border border-white/20 transition-all flex items-center gap-2 relative overflow-hidden touch-feedback',
                  doubleMode 
                    ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.4)]' 
                    : 'bg-white/10 text-white/70 hover:text-white hover:bg-white/20'
                )"
              >
                 <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-shimmer"></div>
                 <Activity :class="cn('w-4 h-4 sm:w-3.5 sm:h-3.5', doubleMode && 'animate-spin')" />
                 <span class="text-[10px] font-black uppercase tracking-widest">{{ doubleMode ? '瑙ｉ櫎瓒呴檺鎿嶄綔' : '鍙戝姩瓒呴檺鍙岃仈' }}</span>
              </button>

              <!-- 寮哄埗鍑虹墝鎻愮ず -->
              <div
                v-if="isMyTurn && gameState?.pending_forced_plays > 0"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-blue-500/80 border border-blue-400/50 shadow-[0_0_12px_rgba(59,130,246,0.3)] animate-pulse pointer-events-none"
              >
                <Zap class="w-3.5 h-3.5 fill-current text-white" />
                <span class="text-[10px] font-black uppercase tracking-widest text-white whitespace-nowrap">寮哄埗鍑虹墝 脳{{ gameState.pending_forced_plays }}</span>
              </div>
            </div>
          </div>

          <!-- 鍙岃仈妯″紡鎻愮ず鐘?->
          <div v-if="doubleMode" class="mt-1 flex flex-wrap items-center justify-center gap-3 animate-in slide-in-from-top-4 duration-500">
            <div class="flex items-center gap-2">
              <div
                @click="firstDoubleSubstance && removeSubstance(1)"
                :class="cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center border-2 transition-all duration-300 relative group/sub',
                  firstDoubleSubstance ? 'bg-blue-500/20 border-blue-500 shadow-md cursor-pointer hover:border-red-500/50' : 'bg-slate-800/50 border-white/10 opacity-50'
                )"
              >
                <span v-if="firstDoubleSubstance" class="text-[9px] font-black transition-opacity" v-html="formatFormula(firstDoubleSubstance)"></span>
                <X v-if="firstDoubleSubstance" class="w-2.5 h-2.5 text-red-500 absolute top-0.5 right-0.5 transition-opacity" />
                <FlaskConical v-else class="w-3 h-3 text-slate-500" />
              </div>
              <div class="w-3 h-0.5 bg-blue-500/30"></div>
              <div
                @click="secondDoubleSubstance && removeSubstance(2)"
                :class="cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center border-2 transition-all duration-300 relative group/sub',
                  secondDoubleSubstance ? 'bg-blue-500/20 border-blue-500 shadow-md cursor-pointer hover:border-red-500/50' : 'bg-slate-800/50 border-white/10 opacity-50'
                )"
              >
                <span v-if="secondDoubleSubstance" class="text-[9px] font-black transition-opacity" v-html="formatFormula(secondDoubleSubstance)"></span>
                <X v-if="secondDoubleSubstance" class="w-2.5 h-2.5 text-red-500 absolute top-0.5 right-0.5 transition-opacity" />
                <FlaskConical v-else class="w-3 h-3 text-slate-500" />
              </div>
            </div>

            <div class="flex items-center gap-1.5">
              <button
                v-if="firstDoubleSubstance && secondDoubleSubstance"
                @click="handleDoublePlay"
                class="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md animate-in zoom-in duration-300 group"
              >
                <span class="text-[9px] font-black uppercase tracking-widest">鍚姩鍙嶅簲</span>
                <Play class="w-3 h-3 fill-current group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                @click="toggleDoubleMode"
                class="bg-slate-800/80 hover:bg-slate-700 text-white/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-white/10 shadow-md transition-all"
              >
                <span class="text-[9px] font-black uppercase tracking-widest">鍙栨秷</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Action Focus Area -->
      <div class="absolute left-0 right-0 flex flex-col items-center overflow-hidden px-2 sm:px-4 pointer-events-none"
           :style="{
             top: isMobile ? '44px' : '64px',
             bottom: showChemicalKeyboard ? '144px' : '0',
             paddingBottom: showChemicalKeyboard ? '0' : (isMobile ? '4rem' : '5rem'),
             justifyContent: 'center',
             transform: 'translateY(-100px)'
           }">
          <!-- Left Sidebar: Hint & Status -->
          <Teleport to="body" :disabled="!!roomInfo?.is_points_mode">
             <div v-if="!roomInfo?.is_points_mode && showHints" class="fixed inset-0 bg-white/10 dark:bg-black/20 backdrop-blur-[2px] z-[95] lg:hidden clickable" @click="handleTutorialLockedSurface(() => { showHints = false })"></div>
             <div data-testid="game-hints-panel" :class="cn(
               'fixed left-0 top-0 bottom-0 w-full lg:w-80 z-[100] bg-white/95 dark:bg-slate-900/60 backdrop-blur-3xl border-r lg:border border-slate-200 dark:border-white/10 lg:rounded-[40px] lg:top-6 lg:bottom-52 lg:left-6 shadow-3xl transition-all duration-500 flex flex-col overflow-hidden',
               showHints ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'
             )" class="pointer-events-auto">
             <div class="p-4 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
                <div class="flex items-center gap-2">
                   <div class="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Trophy class="w-3.5 h-3.5 text-blue-500" />
                   </div>
                   <div>
                      <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-white">瀹為獙杈呭姪鎯呮姤</h3>
                      <p class="text-[8px] font-mono text-slate-400 uppercase tracking-tighter">Intelligence_Protocol</p>
                   </div>
                </div>
                <button @click="feedback.click(); handleTutorialLockedSurface(() => { showHints = false })" class="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-white">
                   <ArrowLeft class="w-4 h-4" />
                </button>
             </div>
             
             <div class="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-4">
                <!-- Status Banners -->
                <div class="space-y-2">
                   <div v-if="allowedAny" class="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl animate-pulse">
                      <div class="flex items-center gap-1.5 text-amber-500 mb-0.5">
                         <Zap class="w-3 h-3 fill-current" />
                         <span class="text-[9px] font-black uppercase tracking-wider">AU 鐗规潈婵€</span>
                      </div>
                      <p class="text-[8px] font-bold text-slate-500">宸茶烦杩囨墍鏈夊弽搴旇鍒欓檺</p>
                   </div>

                   <div v-if="gameState?.pending_draw_count > 0" class="bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl animate-bounce">
                      <div class="flex items-center gap-1.5 text-red-500 mb-0.5">
                         <RefreshCw class="w-3 h-3 animate-spin-slow" />
                         <span class="text-[9px] font-black uppercase tracking-wider">姝ｅ湪鍔犵墝</span>
                      </div>
                      <p class="text-[8px] font-bold text-slate-500">闇€缁撶畻鎴栧彔鍔犵疮 {{ gameState.pending_draw_count }}</p>
                   </div>
                </div>

                <div v-if="roomInfo?.status === 'waiting'" class="space-y-3">
                   <!-- 鐕冪礌妯″紡鎻愮ず -->
                   <div v-if="roomInfo?.is_points_mode" class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2">
                      <PhlogistonIcon :size="16" color="#f59e0b" class="shrink-0" />
                      <div class="text-left">
                         <p class="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-500">Competitive Mode</p>
                         <p class="text-[8px] font-bold text-slate-500 mt-0.5">鐕冪礌绔炴妧妯″紡锛氳儨鑰呰幏寰楃噧绱狅紝璐ヨ€呮墸闄ょ噧绱?/p>
                      </div>
                   </div>

                   <div class="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl flex flex-col items-center text-center">
                      <Users class="w-5 h-5 text-blue-500 mb-1.5" />
                      <span class="text-[9px] font-black uppercase tracking-widest text-blue-500">鍑嗗灏辩华</span>
                      <p class="text-[8px] font-bold text-slate-500 mt-0.5">褰撳墠杩炴帴{{ allPlayers.length }}/{{ roomInfo?.max_players }}锛岀瓑寰呭氨缁悗鑷姩寮€鍚?/p>
                   </div>
                   <div class="p-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
                      <div class="flex items-center gap-1.5 mb-1.5">
                         <QrCode class="w-3 h-3 text-blue-500" />
                         <span class="text-[9px] font-black uppercase tracking-widest text-slate-500">蹇€熼個</span>
                      </div>
                      <p class="text-[7px] font-bold text-slate-400 leading-relaxed uppercase">
                         鐐瑰嚮涓棿鍖哄煙鎷涘嫙浼欎即"鎸夐挳鍙揩閫熷鍒堕摼鎺ワ紝鎴栫偣鍑讳簩缁寸爜鍥炬爣璁╁ソ鍙嬫壂鐮佸姞鍏ュ弽搴斿
                      </p>
                   </div>
                </div>
                
                <div v-else class="py-8 flex flex-col items-center justify-center opacity-20 text-center">
                   <Timer class="w-6 h-6 mb-2" />
                   <p class="text-[9px] font-black uppercase tracking-widest">绛夊緟鍏朵粬鐮旂┒鍛樿</p>
                </div>

                <!-- Reaction-based Hints (鍦轰笂鐗╄川鍙嶅簲鎻愮ず) -->
                <div v-if="filteredReactionHints.length > 0 && gameState?.status === 'playing' && isMyTurn" class="pt-3 border-t border-slate-200 dark:border-white/10">
                   <div class="flex items-center justify-between mb-3">
                      <div class="flex items-center gap-1.5">
                         <Activity class="w-3 h-3 text-emerald-500" />
                         <span class="text-[9px] font-black uppercase tracking-widest text-slate-500">鍙帴缁弽搴旂墿</span>
                      </div>
                      <button @click="feedback.click(); fetchReactionHints()" class="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-emerald-500">
                         <RefreshCw class="w-2.5 h-2.5" />
                      </button>
                   </div>
                   <div class="space-y-1.5">
                      <button
                         v-for="(hint, idx) in filteredReactionHints"
                         :key="idx"
                         :data-testid="`reaction-hint-${idx}`"
                         @click="selectedSubstance = hint.substance; handlePlayCard()"
                         class="w-full text-left px-3 py-2 bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl hover:border-emerald-500 hover:bg-emerald-500/5 transition-all group cursor-pointer"
                      >
                         <div class="flex items-center justify-between">
                            <span class="text-[10px] font-black dark:text-white" v-html="formatFormula(hint.substance)"></span>
                            <div class="flex items-center gap-1.5">
                              <span class="text-[8px] font-bold text-slate-400 tracking-tighter">{{ getSubstanceName(hint.substance) }}</span>
                              <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:scale-125 transition-transform shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            </div>
                         </div>
                      </button>
                   </div>
                </div>

                <!-- Database Trivia Hints -->
                <div v-if="randomHints.length > 0" class="pt-3 border-t border-slate-200 dark:border-white/10">
                   <div class="flex items-center justify-between mb-3">
                      <div class="flex items-center gap-1.5">
                         <Sparkles class="w-3 h-3 text-blue-500" />
                         <span class="text-[9px] font-black uppercase tracking-widest text-slate-500">瀹為獙灏忚创</span>
                      </div>
                      <button @click="feedback.click(); fetchRandomHints()" class="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-blue-500">
                         <RefreshCw class="w-2.5 h-2.5" />
                      </button>
                   </div>
                   <div class="space-y-3">
                      <div v-for="hint in randomHints" :key="hint.id" class="relative pl-3">
                         <div class="absolute left-0 top-1 bottom-1 w-0.5 bg-blue-500/30 rounded-full"></div>
                         <h4 v-if="hint.title" class="text-[9px] font-black text-slate-600 dark:text-slate-300 mb-0.5">{{ hint.title }}</h4>
                         <p class="text-[8px] font-bold text-slate-400 leading-relaxed">{{ hint.content }}</p>
                      </div>
                   </div>
                </div>
             </div>
           </div>
          </Teleport>

          <!-- Latest Card Display -->
          <div v-if="centerCard && !shouldHideCenterCardForEffect"
               :key="centerCardSubstance + (gameState?.discard_pile?.length || 0)"
               class="relative group scale-75 sm:scale-85 flex flex-col items-center justify-center animate-stamp">
             <div class="absolute -inset-16 bg-blue-600/10 rounded-full blur-[100px] opacity-50 group-hover:opacity-80 transition-opacity animate-pulse"></div>
             <div :class="cn(
                'uno-card h-44 sm:h-52 rounded-[32px] flex flex-col items-center justify-center gap-4 sm:gap-6 hover:scale-105 transition-all duration-500',
                getDynamicWidthClass(centerCardSubstance, 'single'),
                getDynamicCardClass(centerCard?.card, centerCardSubstance)
              )">
                <div class="absolute top-4 left-4 opacity-20 text-[8px] uppercase font-black tracking-widest leading-none">Current</div>
                <span :class="cn('font-black font-mono italic drop-shadow-lg leading-none', getFormulaFontSize(centerCardSubstance, 'single'))" v-html="formatFormula(centerCardSubstance)"></span>
                <div class="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 max-w-[85%]">
                   <span class="text-[9px] sm:text-[10px] font-black tracking-widest text-center block leading-tight">{{ getSubstanceName(centerCardSubstance) }}</span>
                </div>
                <div class="absolute bottom-4 right-4 opacity-30">
                   <FlaskConical class="w-4 h-4 fill-current" />
                </div>
                <Transition name="reaction-slide">
                  <div v-if="centerEffectAnimation" :class="['reverse-effect-overlay', centerEffectAnimation === 'ban' && 'reverse-effect-overlay--ban']">
                    <div :class="['reverse-effect-overlay__glyph', centerEffectAnimation === 'ban' && 'reverse-effect-overlay__glyph--ban']">
                      <Orbit v-if="centerEffectAnimation === 'reverse'" class="w-20 h-20 sm:w-24 sm:h-24" />
                      <Ban v-else class="w-20 h-20 sm:w-24 sm:h-24" />
                    </div>
                  </div>
                </Transition>
             </div>
          </div>

          <!-- Waiting for play state -->
          <div v-else-if="gameState?.status === 'playing' && (!centerCard || isAnyPlayWindow || shouldHideCenterCardForEffect)" class="flex flex-col items-center gap-4 sm:gap-6 animate-in fade-in zoom-in duration-700">
             <div class="relative group">
                <div class="absolute -inset-8 bg-emerald-500/10 rounded-full blur-[60px] group-hover:bg-emerald-500/20 transition-all animate-pulse"></div>
                <div class="w-24 h-24 sm:w-32 sm:h-32 rounded-[32px] sm:rounded-[40px] border-2 border-emerald-500/30 flex items-center justify-center relative z-10 backdrop-blur-md bg-emerald-500/5">
                   <Zap class="w-10 h-10 sm:w-14 sm:h-14 text-emerald-500/40" />
                </div>
                <Transition name="reaction-slide">
                  <div v-if="centerEffectAnimation" :class="['reverse-effect-overlay', centerEffectAnimation === 'ban' && 'reverse-effect-overlay--ban']">
                    <div :class="['reverse-effect-overlay__glyph', centerEffectAnimation === 'ban' && 'reverse-effect-overlay__glyph--ban']">
                      <Orbit v-if="centerEffectAnimation === 'reverse'" class="w-20 h-20 sm:w-24 sm:h-24" />
                      <Ban v-else class="w-20 h-20 sm:w-24 sm:h-24" />
                    </div>
                  </div>
                </Transition>
             </div>
             <div class="text-center relative z-10">
                <h3 class="text-lg sm:text-xl font-black uppercase tracking-[0.2em]" :class="shouldShowInBlue(allPlayers[gameState?.current_player]) ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-white'">
                   绛夊緟 <span>{{ getPlayerDisplayName(allPlayers[gameState?.current_player]) }}</span> 鍑虹墝
                </h3>
                <p class="text-[8px] font-bold text-slate-500 mt-1 uppercase italic tracking-tighter">
                   {{ isAnyPlayWindow ? 'Field Cleared _ Free Deployment Window Open' : 'Reaction Reactor Reseted _ New Deployment Window Open' }}
                </p>
             </div>
          </div>
          
          <div v-else-if="roomInfo?.status === 'waiting'" class="flex flex-col items-center gap-3 sm:gap-5 animate-in fade-in zoom-in duration-1000">
             <div class="relative">
                <div class="absolute inset-0 bg-blue-500/10 rounded-full blur-[40px] animate-pulse"></div>
                <!-- Spectator Banner -->
                <div v-if="isSpectator && gameState?.status === 'playing'" class="absolute -top-32 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top-4 pointer-events-none whitespace-nowrap">
                  <div class="bg-indigo-600/90 backdrop-blur-md text-white px-4 py-1.5 rounded-full shadow-lg border border-white/20 flex items-center gap-2">
                      <Trophy class="w-3.5 h-3.5 text-yellow-300" />
                      <span class="text-[10px] font-bold uppercase tracking-widest">宸插畬鎴愭瘮- 瑙傛垬妯″紡</span>
                  </div>
                </div>
                <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-[24px] sm:rounded-[32px] border-2 border-dashed border-blue-500/30 flex items-center justify-center rotate-45 group hover:rotate-0 transition-all duration-700 backdrop-blur-md bg-blue-500/5">
                   <FlaskConical class="w-8 h-8 sm:w-10 sm:h-10 text-blue-500/40 -rotate-45 group-hover:rotate-0 transition-all" />
                </div>
                <div v-if="roomInfo?.countdown > 0" class="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                   <div class="scale-[2.5] sm:scale-[4] opacity-20 font-black italic select-none animate-ping text-blue-500">
                      {{ roomInfo.countdown }}
                   </div>
                </div>

                <div v-if="roomInfo?.countdown > 0" class="absolute -top-2 -right-2 bg-red-500 text-white px-3 py-1 rounded-lg text-base font-black shadow-lg animate-bounce z-10">
                   {{ roomInfo.countdown }}
                </div>
                <div v-else class="absolute -top-2 -right-2 bg-amber-500 text-white px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest shadow-lg animate-pulse">
                   Ready Check
                </div>
             </div>

             <div class="flex flex-col items-center gap-3">
                <div class="flex flex-col items-center gap-2">
                  <h3 class="text-base sm:text-lg font-black text-slate-800 dark:text-white uppercase tracking-[0.1em] text-center">{{ roomInfo?.name || '瀹為獙瀹ゅ噯澶囦腑' }}</h3>

                  <!-- Compact Ready Button -->
                  <button
                    data-testid="game-ready-button"
                    @click="handleToggleReady"
                    :class="cn(
                      'px-6 sm:px-8 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-[0.2em] transition-all duration-500 shadow-lg relative overflow-hidden active:scale-95 text-white',
                      isReady ? 'bg-emerald-500 shadow-emerald-500/40' : 'bg-blue-600 shadow-blue-500/40'
                    )"
                  >
                    <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                    <div class="flex items-center gap-2">
                      <Zap :class="cn('w-3.5 h-3.5 sm:w-4 sm:h-4', isReady ? 'fill-current' : 'animate-pulse')" />
                      <span>{{ isReady ? '宸插氨 : '鎵嬪姩鍑嗗' }}</span>
                    </div>
                  </button>

                  <!-- Countdown Tip -->
                  <div v-if="roomInfo?.countdown > 0" class="flex flex-col items-center gap-0.5 mt-1">
                    <p class="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500 animate-pulse">
                      瀹為獙鍗冲皢寮€ <span class="text-base">{{ roomInfo.countdown }}</span>S
                    </p>
                    <p class="text-[6px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-tighter italic">
                      瀹為獙瀹ゅ帇鍔涘厖鐩堜腑锛屽嵆灏嗗紑鍚爺绌跺惊..
                    </p>
                  </div>
                </div>

                <div class="flex flex-col items-center gap-2 bg-white/50 dark:bg-white/5 backdrop-blur-xl p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm w-full max-w-sm">
                  <div class="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                    <div class="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
                      <Users class="w-2.5 h-2.5 text-blue-500" />
                      <span class="text-[7px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                        鐮旂┒ {{ allPlayers.length }} / {{ roomInfo?.max_players }}
                      </span>
                    </div>
                    <div
                      @click="viewCurrentDeckConfig"
                      class="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 cursor-pointer hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                      title="鐐瑰嚮鏌ョ湅鐗岀粍璇︽儏"
                    >
                      <FlaskConical class="w-2.5 h-2.5 text-emerald-500" />
                      <span class="text-[7px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                        鏂规: {{ roomInfo?.deck_config?.name || '鍩虹鍗忚' }}
                      </span>
                    </div>
                  </div>


                </div>
             </div>
          </div>
        <!-- Table Console Background Removed or Simplified -->
          <div class="absolute inset-0 pointer-events-none overflow-hidden">
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[65%] h-[70%] bg-slate-300/[0.14] dark:bg-slate-500/[0.08] rounded-full blur-[100px]"></div>
          </div>
      </div>

      <!-- Hand / Deck Area -->
      <div class="fixed bottom-0 left-0 right-0 z-[70] bg-white/70 dark:bg-black/60 backdrop-blur-2xl border-t border-slate-200 dark:border-white/5 flex flex-col items-center">
        <div v-if="isTutorialMode && tutorialHintText && isMyTurn" class="absolute bottom-full mb-4 left-0 right-0 flex justify-center px-4 z-50 pointer-events-none animate-in slide-in-from-bottom-2">
          <div class="room-assistive-card max-w-md w-full">
            <div class="room-assistive-card__header">
              <div class="room-assistive-card__badge">
                <Orbit class="w-3.5 h-3.5" />
                {{ tutorialAssistiveTitle }}
              </div>
              <span v-if="tutorialScriptMode" class="room-assistive-card__progress">{{ tutorialProgressPercent }}%</span>
            </div>
            <div v-if="tutorialScriptMode" class="room-assistive-card__track">
              <div class="room-assistive-card__bar" :style="{ width: `${tutorialProgressPercent}%` }"></div>
            </div>
            <p class="room-assistive-card__text" v-html="tutorialHintText"></p>
          </div>
        </div>

        <div class="w-full max-w-7xl mx-auto flex justify-center items-end py-2 sm:py-1">
           <div ref="handContainer" class="hand-container-mobile w-full custom-scrollbar-hidden">
            <div v-if="isReplayBridgeMode && replayPerspectivePlayer" class="mb-1 flex items-center justify-center">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-[10px] font-black uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
                <span>褰撳墠瑙嗚 / Perspective</span>
                <span>{{ replayPerspectiveName }}</span>
              </div>
            </div>
            <div v-if="roomInfo?.status === 'waiting'" class="flex flex-col items-center justify-center opacity-30 pb-1 min-w-full">
              <Loader2 class="w-8 h-8 sm:w-6 sm:h-6 mb-1 animate-spin text-blue-500" />
              <p class="font-black uppercase tracking-widest text-xs-mobile text-slate-500 text-center">姝ｅ湪鍚屾閲忓瓙鐘舵€佸苟绛夊緟寮€鍦哄氨.. / Syncing quantum state and waiting for the round to begin...</p>
            </div>
            <template v-else-if="myData?.hand_cards?.length > 0">
              <div
                v-for="(card, index) in myData.hand_cards"
                :key="index"
                @click="isMyTurn && handleCardClick(card)"
                :class="cn(
                  'uno-card card-mobile flex flex-col items-center justify-center cursor-pointer shrink-0 touch-feedback',
                  getDynamicCardClass(card),
                  selectedCard === card && 'ring-2 ring-blue-500 scale-105 z-10',
                  !isMyTurn && 'opacity-60 grayscale cursor-not-allowed'
                )"
                :style="{
                  transform: selectedCard === card ? (isMobile ? 'translateY(-10px)' : 'translateY(-12px)') : 'none'
                }"
              >
                <div class="absolute top-1 left-1 text-xs-mobile sm:text-[6px] font-black opacity-30 uppercase tracking-tighter">{{ ELEMENTS_DATA[card.type] ? 'Elem / 鍏冪礌' : 'Spec / 鐗规畩' }}</div>
                <div class="flex flex-col items-center justify-center">
                  <div class="text-base sm:text-base font-black font-mono italic tracking-tighter leading-none">{{ card.type }}</div>
                  <div v-if="card.effect || ['He','Ne','Ar','Kr'].includes(card.type)" class="mt-1 px-1.5 sm:px-1 py-0.5 bg-black/10 rounded-md text-xs-mobile sm:text-[8px] font-black uppercase tracking-tighter">
                    {{ ['He','Ne','Ar','Kr'].includes(card.type) ? '杞悜 / Reverse' : card.effect === 'Au' ? '璺宠繃 / Skip' : card.effect === '+2' ? '+2 / Draw 2' : card.effect === '+4' ? '+4 / Draw 4' : card.effect }}
                  </div>
                  <div v-else-if="ELEMENTS_DATA[card.type]" class="text-xs-mobile sm:text-[8px] font-bold opacity-80 mt-0.5 uppercase tracking-tighter font-serif italic text-black/40">
                    {{ getSubstanceName(card.type) }}
                  </div>
                </div>
                <div class="absolute bottom-1 right-1 text-xs-mobile sm:text-[6px] font-mono opacity-40 uppercase tracking-tighter">
                  {{ card.effect ? 'Func / 浣滅敤' : 'Pass / 鏅?}}
                </div>
              </div>
            </template>
            <div v-else class="flex flex-col items-center justify-center opacity-10 pb-3 sm:pb-4">
              <FlaskConical class="w-10 h-10 sm:w-12 sm:h-12 mb-1" />
              <p class="font-black uppercase tracking-widest text-xs-mobile">Inventory_Empty</p>
            </div>
           </div>
        </div>
      </div>

      <!-- Experimental Victory / Failure Protocol -->
      <div v-if="gameState?.status === 'finished' && !isReplayBridgeMode" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xl transition-all duration-500 mobile-modal-overlay">
        <!-- Cool Background Effects (Minimized for focus) -->
        <div class="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
           <div v-for="i in 8" :key="i" 
                class="absolute w-px h-[200%] bg-gradient-to-t from-transparent via-blue-500/20 to-transparent animate-beam"
                :style="{ left: (i * 12) + '%', animationDelay: (i * 0.3) + 's', animationDuration: (3 + Math.random() * 2) + 's' }">
           </div>
        </div>

        <div class="relative w-full max-w-sm sm:max-w-md bg-white/95 dark:bg-[#0d0d10]/95 border border-slate-200 dark:border-white/10 rounded-[32px] shadow-3xl flex flex-col items-center text-center overflow-hidden animate-zoom-in p-6 sm:p-8 backdrop-blur-md max-h-[85vh] mobile-modal-shell">
           <div class="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600 animate-shimmer"></div>

           <div class="relative mb-4 group shrink-0">
              <div class="absolute -inset-8 bg-blue-500/10 rounded-full blur-[40px] animate-pulse"></div>
              
              <div class="relative w-16 h-16 sm:w-20 h-20 bg-gradient-to-br from-slate-800 to-black dark:from-blue-600 dark:to-blue-900 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-xl border border-white/20 transform hover:rotate-0 transition-transform duration-500">
                 <Trophy class="w-8 h-8 sm:w-10 h-10 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
              </div>
           </div>

           <div class="flex-1 w-full overflow-y-auto custom-scrollbar px-1 mb-4">
             <div class="space-y-3 mb-4 w-full">
                <div class="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                   <span class="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest font-mono">Mission_Complete</span>
                </div>

                <div class="px-2">
                  <template v-if="winner?.uid === user.uid">
                    <h2 class="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-slate-900 to-slate-600 dark:from-white dark:to-blue-200 tracking-tighter leading-tight mb-1">
                      瀹為獙澶ф垚
                    </h2>
                    <p class="text-[11px] text-slate-500 dark:text-blue-400/60 font-medium">
                      鎭枩棣栧腑鐮旂┒鍛橈紒閲忓瓙鍙嶅簲鏍稿績宸茬ǔ瀹?
                    </p>
                  </template>
                  <template v-else>
                    <h2 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight mb-1">
                      鍙嶅簲宸茬粓
                    </h2>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      鏈瀹為獙<span class="font-black text-blue-600 dark:text-blue-400">{{ getPlayerDisplayName(winner) }}</span> 鎴愬姛鏀跺畼
                    </p>
                  </template>
                </div>

                <div class="w-full mt-2 bg-slate-50/50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-2xl p-3 shadow-inner relative overflow-hidden group/board">
                   <div class="flex items-center justify-between mb-2 px-1 relative z-10">
                      <span class="text-[9px] font-black uppercase tracking-widest text-slate-500">瀹為獙鏁版嵁鎽樿</span>
                      <div class="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 rounded-md border border-blue-500/10">
                         <span class="text-[7px] font-black text-blue-500 font-mono">SYNC_OK</span>
                      </div>
                   </div>

                   <div class="space-y-1 relative z-10">
                      <div 
                        v-for="(item, index) in sortedPointsChanges" 
                        :key="item.uid"
                        class="flex items-center justify-between group/row p-2 rounded-xl transition-all hover:bg-white dark:hover:bg-white/5 animate-slide-in-bottom"
                        :style="{ animationDelay: (index * 0.05) + 's' }"
                        :class="item.uid === user.uid ? 'bg-blue-600/5 ring-1 ring-blue-500/10' : ''"
                      >
                         <div class="flex items-center gap-3">
                            <div class="relative">
                              <div class="w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px]" :class="[
                                index === 0 ? 'bg-yellow-400 text-yellow-900 shadow-lg' :
                                'bg-slate-100 dark:bg-black/40 text-slate-500'
                              ]">
                                {{ index + 1 }}
                              </div>
                            </div>
                            
                            <div class="flex flex-col items-start leading-tight">
                              <span class="text-xs font-black flex items-center gap-1.5" :class="shouldShowInBlue(item.player) ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-100'">
                                <span class="truncate max-w-[100px]">{{ getPlayerDisplayName(item.player) }}</span>
                                <span v-if="item.uid === user.uid" class="px-1 py-0.5 bg-blue-500 text-[6px] text-white rounded-md uppercase font-mono shrink-0">ME</span>
                              </span>
                            </div>
                         </div>
                         
                         <div class="flex items-center gap-1.5">
                            <div :class="cn(
                               'px-2 py-0.5 rounded-lg font-black font-mono text-[10px]',
                               item.points >= 0 ? 'text-emerald-500' : 'text-rose-500'
                            )">
                              {{ item.points >= 0 ? '+' : '' }}{{ item.points }}
                            </div>
                            <div v-if="item.xp > 0" class="px-2 py-0.5 rounded-lg font-black font-mono text-[10px] text-blue-500">
                              +{{ item.xp }}XP
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
           </div>

           <div class="w-full shrink-0 flex gap-3">
              <button
                @click="feedback.click(); router.push('/')"
                class="flex-1 h-12 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 group"
              >
                 <span class="uppercase tracking-widest text-xs">鍥炲埌涓婚〉</span>
                 <ChevronRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
           </div>
        </div>
      </div>

      <div v-if="isReplayBridgeMode && replayGameOver" class="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xl mobile-modal-overlay">
        <div class="w-full max-w-xl bg-white dark:bg-[#121216] border border-slate-200 dark:border-white/10 rounded-[28px] shadow-2xl overflow-hidden mobile-modal-shell">
          <div class="px-6 py-5 border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03]">
            <p class="text-[10px] font-black uppercase tracking-widest text-blue-500">Replay Result</p>
            <h3 class="text-2xl font-black text-slate-900 dark:text-white mt-1">娓告垙缁撴潫</h3>
            <p class="text-xs text-slate-500 mt-1">{{ replayEndType === 'game_terminated_invalid' ? '鏈瀵瑰眬鍒ゅ畾涓烘棤鏁堢粨 : '鏈瀵瑰眬宸插畬鎴愬洖 }}</p>
          </div>

          <div class="p-6 space-y-4">
            <div class="grid grid-cols-3 gap-2">
              <div class="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-3 text-center">
                <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">鍥炲悎</p>
                <p class="text-lg font-black text-slate-900 dark:text-white">{{ replaySummary.roundCount }}</p>
              </div>
              <div class="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-3 text-center">
                <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">鍑虹墝鎬诲拰</p>
                <p class="text-lg font-black text-slate-900 dark:text-white">{{ replaySummary.totalPlays }}</p>
              </div>
              <div class="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-3 text-center">
                <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">浜嬩欢鎬绘暟</p>
                <p class="text-lg font-black text-slate-900 dark:text-white">{{ replayEvents.length }}</p>
              </div>
            </div>

            <div class="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3">
              <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">鍚勫崱鐗屾暟</p>
              <div v-if="replayCardCountEntries.length > 0" class="max-h-40 overflow-y-auto space-y-1 pr-1">
                <div
                  v-for="entry in replayCardCountEntries"
                  :key="`replay-card-stat-${entry[0]}`"
                  class="flex items-center justify-between rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2"
                >
                  <span class="text-xs font-semibold text-slate-700 dark:text-slate-200">{{ entry[0] }}</span>
                  <span class="text-xs font-black text-blue-600 dark:text-blue-300">{{ entry[1] }}</span>
                </div>
              </div>
              <div v-else class="text-xs text-slate-400">鏃犲彲缁熻鐨勫嚭鐗岃</div>
            </div>

            <div class="flex items-center gap-3 pt-1">
              <button
                @click="restartReplayPlayback"
                class="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs transition-all"
              >
                閲嶆柊鎾斁
              </button>
              <button
                @click="router.push(`/replay/${replayHistoryQueryID}`)"
                class="flex-1 h-11 rounded-xl border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-200 font-black uppercase tracking-widest text-xs hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
              >
                杩斿洖鏃堕棿
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>



    <!-- Invite Friends Modal -->
    <div v-if="showInviteFriendsModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 mobile-modal-overlay">
      <div class="absolute inset-0 bg-black/80 backdrop-blur-md clickable" @click="handleTutorialLockedSurface(() => { showInviteFriendsModal = false })"></div>
      <div class="relative w-full max-w-lg bg-white dark:bg-[#121216] border border-slate-200 dark:border-white/10 rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in duration-300 mobile-modal-shell">
        <div class="p-8 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-2xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-3">
                <UserPlus class="w-6 h-6 text-blue-500" />
                閭€璇峰ソ鍙嬪姞
              </h3>
              <p class="text-[10px] text-slate-500 font-mono uppercase tracking-[0.2em] mt-2">閫夋嫨涓€浣嶅ソ鍙嬪彂閫佹父鎴忛個</p>
            </div>
            <button @click="handleTutorialLockedSurface(() => { showInviteFriendsModal = false })" class="p-2 hover:bg-slate-200 dark:hover:bg-white/5 rounded-full transition-colors">
              <X class="w-6 h-6 text-slate-400" />
            </button>
          </div>
        </div>

        <div class="p-8 max-h-[500px] overflow-y-auto custom-scrollbar">
          <div v-if="friendsList.length === 0" class="flex flex-col items-center justify-center py-16 opacity-20 grayscale">
            <Users class="w-16 h-16 mb-4" />
            <p class="text-sm font-black uppercase tracking-[0.2em]">鏆傛棤濂藉弸</p>
            <p class="text-[10px] mt-2 italic font-medium uppercase">璇峰厛娣诲姞濂藉弸鍚庡啀閭€</p>
          </div>
          <div v-else class="space-y-3">
            <button
              v-for="friend in friendsList"
              :key="friend.uid"
              @click="sendGameInvite(friend)"
              class="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[24px] flex items-center justify-between hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group"
            >
              <div class="flex items-center gap-4">
                <div class="relative">
                  <div class="w-12 h-12 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center text-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
                    <UserAvatar :avatar="friend.avatar" />
                  </div>
                  <div v-if="friend.is_online" class="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-3 border-white dark:border-[#121216] rounded-full shadow-lg shadow-emerald-500/20"></div>
                </div>
                <div class="text-left">
                  <div class="text-base font-bold flex items-center gap-2" :class="friend.remark ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-white'">
                    {{ friend.remark || friend.nickname || friend.username }}
                    <span v-if="friend.is_online" class="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[8px] font-black rounded uppercase tracking-widest">Online</span>
                  </div>
                  <div class="text-[9px] text-slate-400 font-mono mt-1">UID: {{ friend.uid }}</div>
                </div>
              </div>
              <div class="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500 transition-all">
                <Send class="w-4 h-4 text-blue-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Players Floating Panel -->
      <div
        data-testid="game-players-panel"
        v-if="showPlayers"
        class="fixed right-0 top-0 bottom-0 w-[85%] sm:w-80 z-[110] bg-white/95 dark:bg-[#09131d]/96 border-l lg:border border-slate-300/60 dark:border-white/10 lg:rounded-[28px] lg:top-6 lg:bottom-52 lg:right-6 shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl"
      >
      <div class="px-5 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between sticky top-0 z-20 bg-inherit pb-6 lg:pb-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <Users class="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 class="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white leading-none">鐮旂┒鍛樺垪</h3>
            <div class="flex items-center gap-2 mt-2">
               <span class="text-[9px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
                  POS: {{ allPlayers.length }}/{{ roomInfo?.max_players }}
               </span>
               <div class="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
          </div>
        </div>
        <button
          @click="handleTutorialLockedSurface(() => { showPlayers = false })"
          class="p-2.5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-2xl transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white active:scale-90"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div ref="playersContainer" class="flex-1 overflow-y-auto p-4 sm:p-3 custom-scrollbar space-y-2.5 sm:space-y-2 pb-24 lg:pb-4">
        <template v-if="allPlayers.length > 0">
          <div
            v-for="(player, index) in allPlayers"
            :key="player.uid || index"
            data-player-card
            @click="isReplayBridgeMode && handleReplayPerspectiveSwitch(player)"
            :class="cn(
              'flex items-center gap-2.5 sm:gap-2 p-2.5 sm:p-2 rounded-2xl border transition-all duration-300 relative overflow-hidden',
              gameState?.current_player === index
                ? 'bg-blue-600 border-blue-400 shadow-xl shadow-blue-500/20 active-player-card'
                : (gameState ? 'bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/5' : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10'),
              isReplayBridgeMode && 'cursor-pointer hover:border-cyan-400/50',
              isReplayBridgeMode && replayPerspectiveUID === Number(player.uid) && 'ring-2 ring-cyan-400/70 border-cyan-400/70 bg-cyan-500/10 dark:bg-cyan-500/15',
              drawAnimatingUIDs.has(player.uid) && 'ring-2 ring-rose-500 animate-pulse',
              gameState?.finished_players?.includes(player.uid) && 'opacity-60 grayscale-[0.8] bg-slate-200/50 dark:bg-black/40 border-slate-300/30'
            )"
          >
            <!-- Background Decoration for active player -->
            <div v-if="gameState?.current_player === index" class="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>

            <!-- Finished Badge -->
            <div v-if="gameState?.finished_players?.includes(player.uid)" class="absolute top-0 right-0 z-20">
               <div class="bg-emerald-500 text-white text-[6px] font-black px-1.5 py-0.5 rounded-bl-lg shadow-sm animate-in fade-in zoom-in duration-500 uppercase tracking-tighter">
                  Finished
               </div>
            </div>

            <div class="relative w-9 h-9 sm:w-8 sm:h-8 shrink-0">
               <div :class="cn(
                 'w-full h-full rounded-xl flex items-center justify-center border transition-all duration-300 shadow-sm overflow-hidden relative',
                 gameState?.current_player === index ? 'bg-white border-white scale-105 shadow-blue-500/20 shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-white/10'
               )">
                 <div class="w-full h-full flex items-center justify-center pointer-events-none">
                    <UserAvatar :avatar="player.avatar" />
                 </div>

                 <!-- Offline Overlay -->
                 <div v-if="player.is_offline" class="absolute inset-0 bg-rose-500/60 flex items-center justify-center backdrop-blur-sm z-10">
                   <Activity class="w-4 h-4 text-white animate-pulse" />
                 </div>
               </div>
               
               <!-- Action Progress -->
               <div v-if="gameState" class="absolute -bottom-1 -right-1 flex gap-0.5 z-20">
                 <div 
                   v-for="i in 2" 
                   :key="i" 
                   :class="cn(
                     'w-1.5 h-1.5 rounded-full border border-black/10 shadow-sm transition-all duration-300', 
                     i <= (player.action_progress || 0) 
                       ? (gameState?.current_player === index ? 'bg-blue-400' : 'bg-blue-500') 
                       : 'bg-slate-200 dark:bg-slate-700'
                   )"
                 ></div>
               </div>
            </div>

            <div class="flex-1 min-w-0 flex flex-col justify-center">
               <div class="flex items-center justify-between h-4">
                  <span class="text-xs sm:text-[11px] font-black truncate tracking-tight uppercase" :class="[
                     gameState?.current_player === index ? 'text-white' : (shouldShowInBlue(player) ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200')
                  ]">{{ getPlayerDisplayName(player) }}</span>
                  <div class="flex items-center gap-1">
                     <Zap v-if="player.double_action_available" :class="cn('w-3 h-3 fill-current', gameState?.current_player === index ? 'text-amber-300' : 'text-amber-500')" />
                     <template v-if="gameState">
                        <div class="flex items-center gap-1 px-1 py-0.5 rounded-lg" :class="gameState?.current_player === index ? 'bg-white/20 text-white' : 'bg-slate-900/5 dark:bg-white/5 text-slate-500'">
                           <span class="text-[9px] font-black font-mono leading-none">{{ player.card_count || 0 }}</span>
                        </div>
                     </template>
                  </div>
               </div>
               <div class="flex items-center justify-between mt-0.5 h-3.5">
                  <div class="flex items-center gap-1">
                     <span class="text-[7px] font-mono opacity-40 shrink-0 uppercase tracking-tighter" :class="gameState?.current_player === index ? 'text-white/80' : 'text-slate-500'">UID: {{ player.uid }}</span>
                    <span v-if="isReplayBridgeMode && replayPerspectiveUID === Number(player.uid)" class="text-[6px] font-black uppercase text-cyan-700 dark:text-cyan-300 px-1 py-0.5 bg-cyan-500/20 rounded-md border border-cyan-500/30 leading-none">POV</span>
                     <span v-if="player.is_offline" class="text-[6px] font-black uppercase text-rose-100 px-1 py-0.5 bg-rose-500/80 rounded-md border border-rose-500/20 leading-none">OFF</span>
                     <template v-if="!gameState">
                        <div :class="cn('px-1 py-0.5 rounded-md border text-[6px] font-black uppercase tracking-widest transition-all leading-none', 
                           player.is_ready 
                           ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' 
                           : 'text-slate-400 bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10')">
                           {{ player.is_ready ? 'RDY' : 'WT' }}
                        </div>
                     </template>
                  </div>
                  
                  <div class="flex items-center gap-0.5">
                     <button v-if="Number(player.uid) !== Number(user.uid) && !isFriend(player.uid) && !isReplayBridgeMode"
                             @click.stop="handleAddFriend(player)"
                             :class="cn('p-0.5 rounded-md transition-all active:scale-90', gameState?.current_player === index ? 'bg-white/20 text-white' : 'bg-slate-200/50 dark:bg-white/5 text-slate-500')"
                     >
                       <UserPlus class="w-2.5 h-2.5" />
                     </button>

                  </div>
               </div>
            </div>
          </div>

          <!-- Empty Slots -->
          <div
            v-for="i in (roomInfo?.max_players || 0) - allPlayers.length"
            :key="'empty-slot-' + i"
            class="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-slate-200 dark:border-white/5 opacity-30"
          >
            <div class="w-8 h-8 rounded-lg border border-dashed border-slate-300 dark:border-white/10 flex items-center justify-center">
              <Plus class="w-3.5 h-3.5 text-slate-400" />
            </div>
            <span class="text-[10px] font-black uppercase tracking-tighter text-slate-400">EMPTY_SLOT</span>
          </div>
        </template>
        <div v-else class="flex flex-col items-center justify-center py-8 opacity-30">
          <Loader2 class="w-5 h-5 animate-spin mb-2" />
          <span class="text-[10px] font-black uppercase tracking-widest italic">Awaiting Peers...</span>
        </div>
      </div>
    </div>

    <!-- Mobile Overlay for Players Panel -->
    <div
      v-if="showPlayers"
      class="fixed inset-0 bg-white/10 dark:bg-black/20 backdrop-blur-[2px] z-[95] lg:hidden clickable"
      @click="handleTutorialLockedSurface(() => { showPlayers = false })"
    ></div>

    <!-- Chat Floating Sidebar -->
    <div
      data-testid="game-chat-panel"
      v-if="showChat && !isReplayBridgeMode"
      class="fixed right-0 top-0 bottom-0 w-full lg:w-80 z-[100] lg:top-6 lg:bottom-52 lg:right-6 flex flex-col"
    >
      <ChatBox
        :roomId="id"
        title="瀹為獙鍐呴€氫俊绾跨▼"
        maxHeight="100%"
        class="h-full !bg-white/95 dark:!bg-[#09131d]/96 backdrop-blur-2xl shadow-3xl lg:rounded-[28px] border-l lg:border border-slate-300/60 dark:border-white/10"
        @close="handleTutorialLockedSurface(() => { showChat = false })"
        @input-focus="handleInputFocus"
        @input-blur="handleInputBlur"
      />
    </div>

    <!-- Mobile Overlay for Chat -->
    <div
      v-if="showChat && !isReplayBridgeMode"
      class="fixed inset-0 bg-white/10 dark:bg-black/20 backdrop-blur-[2px] z-[95] lg:hidden clickable"
      @click="handleTutorialLockedSurface(() => { showChat = false })"
    ></div>

    <!-- 鍖栧閿洏 -->
    <ChemicalKeyboard
      data-testid="game-chemical-keyboard"
      v-if="showChemicalKeyboard && !isReplayBridgeMode"
      v-model="substanceInput"
      :deckCards="roomInfo?.deck_config?.cards || {}"
      :myHand="myData?.hand_cards || []"
      @confirm="handleKeyboardConfirm"
      @close="handleTutorialLockedSurface(() => { showChemicalKeyboard = false })"
    />

    <!-- 鐗岀粍璇︽儏鏌ョ湅妯℃€佹 -->
    <div v-if="showDeckDetailModal && roomInfo?.deck_config" class="fixed inset-0 z-[200] flex items-center justify-center p-4 mobile-modal-overlay">
      <div class="absolute inset-0 bg-slate-900/40 dark:bg-black/80 backdrop-blur-md clickable" @click="handleTutorialLockedSurface(() => { showDeckDetailModal = false })" />
      <div class="relative w-full max-w-2xl bg-white/95 dark:bg-[#09131d]/96 border border-slate-300/60 dark:border-white/10 rounded-[28px] shadow-2xl overflow-hidden backdrop-blur-xl mobile-modal-shell">
         <div class="px-5 py-4 border-b border-slate-200/70 dark:border-white/8 flex items-center justify-between bg-sky-700/[0.04]">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500">
                <FlaskConical class="w-4 h-4" />
              </div>
              <div>
                <h2 class="text-base font-black text-slate-800 dark:text-white tracking-tight leading-none">{{ roomInfo.deck_config.name }}</h2>
                <p class="text-[8px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-widest mt-1">Deck_Configuration</p>
              </div>
            </div>
            <button @click="handleTutorialLockedSurface(() => { showDeckDetailModal = false })" class="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-slate-900 dark:hover:text-white">
              <X class="w-4 h-4" />
            </button>
         </div>
         <div class="p-5 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-4">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div class="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                <p class="text-[8px] text-slate-400 mb-1 uppercase tracking-wider">鐗岀粍鍚嶇О</p>
                <p class="text-[11px] font-black text-slate-900 dark:text-white">{{ roomInfo.deck_config.name }}</p>
              </div>
              <div class="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                <p class="text-[8px] text-slate-400 mb-1 uppercase tracking-wider">鍏冪礌绉嶇被</p>
                <p class="text-[11px] font-black text-blue-600 dark:text-blue-400">{{ Object.keys(roomInfo.deck_config.cards || {}).length }} </p>
              </div>
              <div class="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                <p class="text-[8px] text-slate-400 mb-1 uppercase tracking-wider">鎬诲崱鐗屾暟</p>
                <p class="text-[11px] font-black text-slate-900 dark:text-white">{{ (Object.values(roomInfo.deck_config.cards || {}) as number[]).reduce((a, b) => a + b, 0) }} </p>
              </div>
              <div class="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                <p class="text-[8px] text-slate-400 mb-1 uppercase tracking-wider">璧峰鎵嬬墝</p>
                <p class="text-[11px] font-black text-slate-900 dark:text-white">{{ roomInfo.deck_config.initial_cards || 10 }} </p>
              </div>
            </div>
            <div class="p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
              <div class="flex items-center justify-between mb-3">
                <span class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">鍗＄墝閰嶇疆</span>
                <span class="text-[8px] text-blue-500/40 font-mono">CARD_LIST</span>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                <div
                  v-for="(count, formula) in roomInfo.deck_config.cards"
                  :key="formula"
                  class="p-2.5 bg-white dark:bg-black/20 rounded-lg border border-slate-200 dark:border-white/10"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-black text-slate-900 dark:text-white font-mono" v-html="String(formula).replace(/(\d+)/g, '<sub>$1</sub>')"></span>
                    <span class="text-[9px] font-black text-blue-600 dark:text-blue-400">脳{{ count }}</span>
                  </div>
                </div>
              </div>
            </div>
         </div>
         <div class="px-5 py-3 border-t border-slate-100 dark:border-white/5 flex justify-end">
            <button @click="handleTutorialLockedSurface(() => { showDeckDetailModal = false })" class="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all uppercase tracking-widest text-[10px] border border-slate-200 dark:border-white/5">
              鍏抽棴
            </button>
         </div>
      </div>
    </div>
  </div>

  <!-- Level Up Animation -->
  <LevelUpAnimation ref="levelUpAnimationRef" />

  <!-- Game Toast -->
  <GameToast ref="gameToastRef" />

  <!-- Feedback Settings - 浠呭湪鍑嗗闃舵鏄剧ず -->
  <FeedbackSettings v-if="roomInfo?.status === 'waiting'" />
</template>

<style scoped src="./GameRoom.css"></style>

