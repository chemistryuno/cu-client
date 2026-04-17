<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authAPI, gameAPI } from '../utils/api'
import { useDialog } from '../utils/dialog'
import UserAvatar from '../components/UserAvatar.vue'
import TutorialGuide from '../components/TutorialGuide.vue'
import { Beaker, BookOpen, Bot, Loader2, LogOut, Play, Settings, Swords, X, FileText } from 'lucide-vue-next'
import { cn } from '../utils/cn'
import '../styles/lobby.css'

const router = useRouter()
const { showAlert, showConfirm } = useDialog()

const user = ref<any>({})
const rooms = ref<any[]>([])
const decks = ref<any[]>([])
const loading = ref(false)
const appVersion = ref('V1.2.1 Mendeleef')
const showAIArenaModal = ref(false)
const showDeckDetailModal = ref(false)
const selectedDeckConfig = ref<any>(null)
const roomName = ref('')
const deckID = ref(0)
const isPointsMode = ref(false)
const pveDifficulty = ref(50)
const aiCount = ref(1)
const showLegalModal = ref(false)
const legalModalTitle = ref('')
const legalModalContent = ref('')
const showTutorial = ref(false)

const LOBBY_TUTORIAL_COMPLETED_KEY = 'chemistry-uno-lobby-tutorial-completed'
const LOBBY_TUTORIAL_SKIPPED_KEY = 'chemistry-uno-lobby-tutorial-skipped'
const navigationSelector = '[data-tutorial="desktop-nav"]'

const lobbyTutorialSteps = computed(() => [
  { id: 'welcome-lobby', titlePlaceholder: '欢迎来到单机模式', contentPlaceholder: '这里是本地单机版的化学 UNO。你可以直接挑战 AI，或先进入教学关卡熟悉出牌和反应规则。', position: 'center' as const },
  { id: 'navigation', titlePlaceholder: '玩家资料', contentPlaceholder: '通过这里可以进入个人资料页，修改昵称、头像和查看本机战绩。', targetSelector: navigationSelector, position: 'bottom' as const },
  { id: 'user-profile', titlePlaceholder: '当前玩家', contentPlaceholder: '这里显示当前使用的昵称和头像。单机模式下，数据只保存在当前设备。', targetSelector: '[data-tutorial="user-chip"]', position: 'bottom' as const },
  { id: 'ai-arena', titlePlaceholder: 'AI竞技场', contentPlaceholder: '从这里开始一局玩家 VS AI 对战。你可以调整 AI 难度和数量，随时开始挑战。', targetSelector: '[data-tutorial="ai-arena"]', position: 'bottom' as const },
  { id: 'complete-lobby', titlePlaceholder: '开始本地对战', contentPlaceholder: '你已经了解单机版大厅的主要功能。现在就开始一局 AI 对战，或进入教学关卡熟悉规则。', position: 'center' as const },
])

const activeRoom = computed(() => {
  return rooms.value.find((room) =>
    (room.status === 'playing' || room.status === 'waiting') &&
    Array.isArray(room.players) &&
    room.players.includes(Number(user.value.uid))
  )
})

const pveUsingCustomDeck = computed(() => {
  const selected = decks.value.find((deck: any) => deck.id === deckID.value)
  return selected ? !selected.is_global : false
})

const loadUserInfo = async () => {
  try {
    const res = await authAPI.getUserInfo()
    user.value = res.data
    localStorage.setItem('user', JSON.stringify(res.data))
  } catch (error) {
    console.error('Failed to load user info:', error)
  }
}

const loadRooms = async () => {
  try {
    const response = await gameAPI.getRooms()
    rooms.value = (response.data || []).filter((room: any) => room.is_pve)
  } catch (error) {
    console.error('加载本地房间失败:', error)
  }
}

const loadDecks = async () => {
  try {
    const res = await gameAPI.getMyDecks()
    const allDecks = res.data || []
    allDecks.sort((a: any, b: any) => {
      if (a.is_global && !b.is_global) return -1
      if (!a.is_global && b.is_global) return 1
      return 0
    })
    decks.value = allDecks
    if (decks.value.length > 0) {
      const globalDeck = decks.value.find((deck: any) => deck.is_global)
      deckID.value = globalDeck ? globalDeck.id : decks.value[0].id
    }
  } catch (error) {
    console.error('加载牌组失败:', error)
  }
}

const loadVersion = async () => {
  try {
    const res = await authAPI.getVersion()
    if (res.data?.fullVersion) {
      appVersion.value = res.data.fullVersion
    }
  } catch (error) {
    console.error('获取版本信息失败:', error)
  }
}

const checkFirstTimeLobby = () => {
  const hasSeenLobbyTutorial = localStorage.getItem(LOBBY_TUTORIAL_COMPLETED_KEY) === 'true'
  const hasSkippedLobbyTutorial = localStorage.getItem(LOBBY_TUTORIAL_SKIPPED_KEY) === 'true'
  if (!hasSeenLobbyTutorial && !hasSkippedLobbyTutorial) {
    setTimeout(() => {
      showTutorial.value = true
    }, 1000)
  }
}

const handleTutorialComplete = async () => {
  localStorage.setItem(LOBBY_TUTORIAL_COMPLETED_KEY, 'true')
  localStorage.removeItem(LOBBY_TUTORIAL_SKIPPED_KEY)
  showTutorial.value = false
  await createTutorialMatch()
}

const handleTutorialClose = () => {
  localStorage.setItem(LOBBY_TUTORIAL_COMPLETED_KEY, 'true')
  localStorage.setItem(LOBBY_TUTORIAL_SKIPPED_KEY, 'true')
  showTutorial.value = false
}

const createTutorialMatch = async () => {
  loading.value = true
  try {
    const response = await gameAPI.createRoom(
      '教学: 首战AI',
      2,
      deckID.value,
      false,
      true,
      undefined,
      true,
      20,
      1,
      false,
      0,
      false,
      0,
      true,
    )
    localStorage.setItem('chemistry-uno-tutorial-mode', 'true')
    await gameAPI.startGame(response.data.id)
    router.push(`/room/${response.data.id}`)
  } catch (error: any) {
    showAlert(error.response?.data?.error || '创建教学关卡失败', '系统异常')
  } finally {
    loading.value = false
  }
}

const handleCreateAIRoom = async () => {
  loading.value = true
  try {
    const response = await gameAPI.createRoom(
      roomName.value || `AI挑战 · ${pveDifficulty.value}`,
      1 + aiCount.value,
      deckID.value,
      isPointsMode.value,
      true,
      undefined,
      true,
      pveDifficulty.value,
      aiCount.value,
      false,
      0,
      false,
      0,
      false,
    )
    await gameAPI.startGame(response.data.id)
    showAIArenaModal.value = false
    router.push(`/room/${response.data.id}`)
  } catch (error: any) {
    showAlert(error.response?.data?.error || '创建AI对战失败', '系统异常')
  } finally {
    loading.value = false
  }
}

const handleResumeActiveRoom = () => {
  if (activeRoom.value?.id) {
    router.push(`/room/${activeRoom.value.id}`)
  }
}

const handleLeaveRoom = async (roomId: string) => {
  const ok = await showConfirm('确定要结束当前这局本地对战吗？')
  if (!ok) return

  try {
    await gameAPI.leaveRoom(roomId)
    await loadRooms()
    showAlert('本地对局已结束。', '已退出')
  } catch (error: any) {
    showAlert(error.response?.data?.error || '退出对局失败', '错误')
  }
}

const handleOpenDeckDetail = () => {
  const selected = decks.value.find((deck: any) => deck.id === deckID.value)
  if (!selected) return
  selectedDeckConfig.value = selected
  showDeckDetailModal.value = true
}

const handleResetLocalPlayer = async () => {
  const ok = await showConfirm('确定要重设当前本地玩家资料吗？这会返回资料设置页。')
  if (!ok) return

  try {
    await authAPI.logout()
  } catch (error) {
    console.error('Failed to clear offline session:', error)
  } finally {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    router.replace('/login')
  }
}

const openUserAgreement = async () => {
  try {
    const res = await fetch('/USER_AGREEMENT.md')
    legalModalContent.value = await res.text()
  } catch {
    legalModalContent.value = '无法加载协议内容。'
  }
  legalModalTitle.value = '用户协议 / User Agreement'
  showLegalModal.value = true
}

const openPrivacyPolicy = async () => {
  try {
    const res = await fetch('/PRIVACY_POLICY.md')
    legalModalContent.value = await res.text()
  } catch {
    legalModalContent.value = '无法加载政策内容。'
  }
  legalModalTitle.value = '隐私政策 / Privacy Policy'
  showLegalModal.value = true
}

onMounted(() => {
  try {
    const raw = JSON.parse(localStorage.getItem('user') || '{}')
    if (raw?.id && !raw?.uid) raw.uid = raw.id
    user.value = raw
  } catch {
    user.value = {}
  }

  void loadUserInfo()
  void loadRooms()
  void loadDecks()
  void loadVersion()
  checkFirstTimeLobby()
})
</script>

<template>
  <div class="lobby-page">
    <div class="lobby-bg-decor">
      <div class="lobby-bg-decor-blob-1"></div>
      <div class="lobby-bg-decor-blob-2"></div>
      <div class="lobby-bg-decor-pattern"></div>
    </div>

    <div class="relative z-10 flex flex-col min-h-screen">
      <header class="lobby-header">
        <div class="lobby-header-container">
          <div class="flex items-center gap-4">
            <div class="lobby-logo-bundle">
              <Beaker class="w-6 h-6 text-blue-500" />
              <div>
                <h1 class="lobby-logo-title">CHEMISTRY <span class="text-blue-500">UNO</span></h1>
                <p class="lobby-logo-subtitle">{{ appVersion }}</p>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <div data-tutorial="user-chip" @click="router.push('/profile')" class="user-identity-chip cursor-pointer">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-base shadow-inner overflow-hidden border border-slate-200 dark:border-white/5">
                <UserAvatar :avatar="user.avatar" />
              </div>
              <div class="hidden sm:flex flex-col">
                <span class="text-xs-mobile font-black text-slate-900 dark:text-white">{{ user.nickname || '本地玩家' }}</span>
                <span class="text-[9px] text-slate-500 font-mono uppercase">本地资料</span>
              </div>
            </div>

            <div data-tutorial="desktop-nav" class="hidden md:flex items-center gap-2">
              <button @click="router.push('/profile')" class="lobby-nav-link" title="玩家资料">
                <Settings class="w-4 h-4" />
              </button>
              <button @click="handleResetLocalPlayer" class="lobby-nav-link lobby-nav-link-red" title="重设本地资料">
                <LogOut class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main class="flex-1 max-w-[1200px] mx-auto w-full px-4 sm:px-5 py-6 flex flex-col gap-6">
        <div class="hub-header-section">
          <div class="hub-title-group">
            <div class="hub-status-badge">
              <span class="w-1 h-1 bg-blue-500 rounded-full animate-ping"></span>
              <span class="text-[8px] font-black text-blue-500 uppercase tracking-widest">单机模式</span>
            </div>
            <h2 class="hub-title">本地 AI 对战大厅</h2>
            <p class="text-[11px] text-slate-500 font-medium max-w-xl leading-relaxed">
              当前版本仅保留玩家 VS AI 模式。昵称、头像、战绩和设置都会保存在当前设备中。
            </p>
          </div>
        </div>

        <div v-if="activeRoom" class="rejoin-banner">
          <div class="flex items-center gap-5">
            <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center animate-[pulse_2s_infinite]">
              <Swords class="w-6 h-6 text-white" />
            </div>
            <div class="flex flex-col">
              <span class="text-[9px] font-black uppercase text-blue-200 tracking-widest leading-none mb-1">继续本地对战</span>
              <h3 class="text-lg font-black text-white uppercase tracking-wider">{{ activeRoom.name }}</h3>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <button @click="handleLeaveRoom(activeRoom.id)" class="px-5 py-3 bg-red-500 text-white rounded-xl text-[11px] font-black uppercase tracking-widest border border-red-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
              <X class="w-4 h-4" />
              结束
            </button>
            <button @click="handleResumeActiveRoom" class="px-8 py-3 bg-white text-blue-600 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
              <Play class="w-4 h-4" />
              继续
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <section class="lg:col-span-2 bg-white/70 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-sm">
            <div class="flex items-start justify-between gap-4 mb-6">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-purple-500 mb-2">Single Player</p>
                <h3 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">AI 竞技场</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-lg">
                  调整 AI 难度和数量，立即开始本地玩家 VS AI 对战。
                </p>
              </div>
              <div class="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20 shrink-0">
                <Bot class="w-7 h-7" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div class="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-4">
                <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">当前玩家</p>
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 flex items-center justify-center overflow-hidden text-lg">
                    <UserAvatar :avatar="user.avatar" />
                  </div>
                  <div>
                    <p class="text-base font-black text-slate-900 dark:text-white">{{ user.nickname || '本地玩家' }}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">本机存档</p>
                  </div>
                </div>
              </div>

              <div class="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-4">
                <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">牌组</p>
                <button @click="handleOpenDeckDetail" class="w-full text-left rounded-xl bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 px-4 py-3 hover:border-blue-400 transition-colors">
                  <p class="text-sm font-black text-slate-900 dark:text-white">{{ decks.find((deck: any) => deck.id === deckID)?.name || '默认牌组' }}</p>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">查看当前 AI 对战使用的牌组配置</p>
                </button>
              </div>
            </div>

            <div class="flex flex-wrap gap-3">
              <button @click="showAIArenaModal = true" data-tutorial="ai-arena" class="btn-action-secondary">
                <Bot class="w-4 h-4" />
                <span class="uppercase tracking-widest text-[10px]">开始 AI 对战</span>
              </button>
              <button @click="createTutorialMatch" class="btn-action-primary">
                <BookOpen class="w-4 h-4" />
                <span class="uppercase tracking-widest text-[10px]">教学关卡</span>
              </button>
            </div>
          </section>

          <section class="bg-white/70 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm">
            <p class="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-2">Quick Info</p>
            <h3 class="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-4">本地说明</h3>
            <ul class="space-y-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              <li>• 不需要账号系统或联网匹配。</li>
              <li>• 所有资料和战绩只保存在当前设备。</li>
              <li>• 你可以随时修改昵称、头像与外观设置。</li>
              <li>• 教学关卡会自动创建 1v1 的入门 AI 对局。</li>
            </ul>
          </section>
        </div>
      </main>

      <footer class="lobby-footer bg-black/40 backdrop-blur-md p-4 shrink-0">
        <div class="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center text-[10px] font-mono text-slate-500 uppercase tracking-[0.15em] gap-4">
          <div class="flex items-center gap-4 order-2 md:order-1">
            <button @click="openUserAgreement" class="hover:text-blue-400 transition-colors uppercase cursor-pointer">服务协议</button>
            <span class="h-3 w-px bg-white/10"></span>
            <button @click="openPrivacyPolicy" class="hover:text-blue-400 transition-colors uppercase cursor-pointer">隐私政策</button>
            <span class="h-3 w-px bg-white/10"></span>
            <span class="text-blue-500/50">v{{ appVersion }}</span>
          </div>
          <div class="text-center md:text-right order-1 md:order-2 opacity-40 hover:opacity-100 transition-opacity">
            &copy; 2026 MENDELEEF PROTOCOL. LOCAL EDITION.
          </div>
        </div>
      </footer>
    </div>

    <div v-if="showAIArenaModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in" @click="showAIArenaModal = false" />
      <div class="relative w-full max-w-lg bg-white dark:bg-[#121216] border border-purple-500/30 rounded-[40px] shadow-2xl shadow-purple-500/10 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in slide-in-from-bottom-10 duration-500">
        <div class="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-purple-500/5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Bot class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-lg font-black text-slate-800 dark:text-white tracking-tight leading-none">AI 竞技场</h2>
              <p class="text-[9px] text-purple-500/60 font-mono uppercase tracking-widest mt-1">LOCAL_PVE_MODE</p>
            </div>
          </div>
          <button @click="showAIArenaModal = false" class="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="handleCreateAIRoom" class="flex flex-col min-h-0">
          <div class="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
            <div class="space-y-3">
              <label class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">对局名称</label>
              <input
                v-model="roomName"
                type="text"
                placeholder="留空则自动生成名称"
                class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            <div class="space-y-4">
              <div class="flex justify-between items-end px-1">
                <div>
                  <label class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">AI 智能等级</label>
                  <h3 class="text-2xl font-black text-slate-800 dark:text-white">{{ pveDifficulty }}<span class="text-sm text-slate-400 ml-1">%</span></h3>
                </div>
                <span class="text-[8px] text-purple-500/40 font-mono">DIFFICULTY</span>
              </div>
              <input v-model.number="pveDifficulty" type="range" min="1" max="100" class="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-600" />
            </div>

            <div class="space-y-3">
              <div class="flex justify-between items-center px-1">
                <label class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">AI 数量</label>
                <span class="text-[8px] text-purple-500/40 font-mono">OPPONENTS</span>
              </div>
              <div class="grid grid-cols-4 gap-3">
                <button
                  v-for="num in [1, 2, 3, 7]"
                  :key="num"
                  type="button"
                  @click="aiCount = num"
                  :class="cn(
                    'h-12 rounded-xl text-sm font-black border transition-all flex items-center justify-center',
                    aiCount === num
                      ? 'bg-purple-500/10 border-purple-500/50 text-purple-600 dark:text-purple-400'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400'
                  )"
                >
                  {{ num }} AI
                </button>
              </div>
            </div>

            <div class="space-y-3">
              <div class="flex justify-between items-center px-1">
                <label class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">牌组</label>
                <span class="text-[8px] text-purple-500/40 font-mono">DECK</span>
              </div>
              <div class="space-y-2">
                <button
                  v-for="deck in decks"
                  :key="deck.id"
                  type="button"
                  @click="deckID = deck.id; if (!deck.is_global) isPointsMode = false"
                  :class="cn(
                    'w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left',
                    deckID === deck.id
                      ? 'bg-purple-600/5 dark:bg-purple-600/10 border-purple-500/50'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'
                  )"
                >
                  <div :class="cn('w-9 h-9 rounded-lg flex items-center justify-center', deckID === deck.id ? 'bg-purple-500 text-white' : 'bg-slate-200 dark:bg-white/5 text-slate-400')">
                    <Beaker class="w-4 h-4" />
                  </div>
                  <div class="flex-1">
                    <p :class="cn('text-[11px] font-black uppercase tracking-wider', deckID === deck.id ? 'text-purple-600 dark:text-purple-400' : 'text-slate-700 dark:text-white')">{{ deck.name }}</p>
                    <p class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono uppercase tracking-tighter">{{ Object.keys(deck.cards || {}).length }} Elements</p>
                  </div>
                </button>
              </div>
            </div>

            <div class="flex items-center gap-3 p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl transition-all" :class="pveUsingCustomDeck ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'" @click="!pveUsingCustomDeck && (isPointsMode = !isPointsMode)">
              <div :class="cn('w-10 h-6 rounded-full relative transition-colors duration-300', isPointsMode ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700')">
                <div :class="cn('absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300', isPointsMode ? 'translate-x-4' : 'translate-x-0')"></div>
              </div>
              <div class="flex flex-col">
                <span :class="cn('text-[10px] font-black uppercase tracking-wider', isPointsMode ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400 dark:text-slate-400')">燃素结算</span>
                <span v-if="pveUsingCustomDeck" class="text-[9px] text-amber-500/80 mt-0.5 leading-tight">自定义牌组不支持燃素模式</span>
                <span v-else class="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">难度 >= 50% 时可获得本地燃素奖励</span>
              </div>
            </div>
          </div>

          <div class="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex gap-3 shrink-0">
            <button type="button" @click="showAIArenaModal = false" class="flex-1 px-4 py-3 border border-slate-200 dark:border-white/10 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-slate-500">取消</button>
            <button type="submit" :disabled="loading" class="flex-[2] px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
              <span>开始挑战</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showDeckDetailModal && selectedDeckConfig" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/40 dark:bg-black/80 backdrop-blur-md animate-in fade-in" @click="showDeckDetailModal = false" />
      <div class="relative w-full max-w-2xl bg-white dark:bg-[#121216] border border-slate-200 dark:border-white/10 rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in slide-in-from-bottom-10 duration-500">
        <div class="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-500 dark:text-blue-400">
              <Beaker class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-lg font-black text-slate-800 dark:text-white tracking-tight leading-none">{{ selectedDeckConfig.name }}</h2>
              <p class="text-[9px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-widest mt-1">Deck Configuration</p>
            </div>
          </div>
          <button @click="showDeckDetailModal = false" class="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div class="space-y-4">
            <div class="p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
              <div class="grid grid-cols-2 gap-3">
                <div class="p-3 bg-white dark:bg-black/20 rounded-lg">
                  <p class="text-[8px] text-slate-400 mb-1 uppercase tracking-wider">牌组名称</p>
                  <p class="text-[11px] font-black text-slate-900 dark:text-white">{{ selectedDeckConfig.name }}</p>
                </div>
                <div class="p-3 bg-white dark:bg-black/20 rounded-lg">
                  <p class="text-[8px] text-slate-400 mb-1 uppercase tracking-wider">元素种类</p>
                  <p class="text-[11px] font-black text-blue-600 dark:text-blue-400">{{ Object.keys(selectedDeckConfig.cards || {}).length }} 种</p>
                </div>
              </div>
            </div>

            <div class="p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                <div v-for="(count, formula) in selectedDeckConfig.cards" :key="formula" class="p-2.5 bg-white dark:bg-black/20 rounded-lg border border-slate-200 dark:border-white/10">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-black text-slate-900 dark:text-white font-mono" v-html="String(formula).replace(/(\d+)/g, '<sub>$1</sub>')"></span>
                    <span class="text-[9px] font-black text-blue-600 dark:text-blue-400">×{{ count }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <TutorialGuide :show="showTutorial" :steps="lobbyTutorialSteps" @close="handleTutorialClose" @complete="handleTutorialComplete" />

    <div v-if="showLegalModal" class="fixed inset-0 bg-slate-900/90 dark:bg-black/95 backdrop-blur-2xl z-[200] flex items-center justify-center p-5 overflow-y-auto">
      <div class="relative w-full max-w-2xl bg-white dark:bg-[#0c0c0e] border border-slate-200 dark:border-white/10 rounded-[2.5rem] shadow-4xl flex flex-col max-h-[85vh] animate-in zoom-in duration-300">
        <div class="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between sticky top-0 bg-inherit z-10">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-500">
              <FileText class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">{{ legalModalTitle }}</h3>
            </div>
          </div>
          <button @click="showLegalModal = false" class="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400">
            <X class="w-6 h-6" />
          </button>
        </div>

        <div class="p-8 overflow-y-auto custom-scrollbar flex-1 whitespace-pre-wrap">
          <div class="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
            {{ legalModalContent }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
