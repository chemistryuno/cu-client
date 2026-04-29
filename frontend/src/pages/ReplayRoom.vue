<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { gameAPI } from '../utils/api'
import { ArrowLeft, Eye } from 'lucide-vue-next'
import { cn } from '../utils/cn'

const route = useRoute()
const router = useRouter()

const replayData = ref<any>(null)
const loading = ref(true)
const loadError = ref('')
const selectedPerspectiveUID = ref<number | null>(null)
const focusPerspectiveOnly = ref(false)
const replayViewMode = ref<'game' | 'timeline'>('timeline')

const OPERATION_FAST_THRESHOLD_MS = 3000
const operationEventTypes = new Set(['play_card', 'double_play', 'draw_card'])

const currentUser = ref<any>({})
try {
  const raw = JSON.parse(localStorage.getItem('user') || '{}')
  if (raw.id && !raw.uid) {
    raw.uid = raw.id
  }
  currentUser.value = raw
} catch {
  currentUser.value = {}
}

const useAdminScope = computed(() => false)
const replayReturnPath = computed(() => {
  const raw = String(route.query.from || '').trim()
  if (/^\/admin(?:\/[a-zA-Z0-9_-]+)?$/.test(raw)) {
    return raw
  }
  if (/^\/profile(?:\/[a-zA-Z0-9_-]+)?$/.test(raw)) {
    return raw
  }
  return useAdminScope.value ? '/admin/users' : '/profile/history'
})

let pageScrollLockSnapshot: {
  htmlOverflow: string
  bodyOverflow: string
  bodyWidth: string
  appOverflow: string
} | null = null

const lockPageScroll = () => {
  if (pageScrollLockSnapshot) return

  const appRoot = document.getElementById('app')
  pageScrollLockSnapshot = {
    htmlOverflow: document.documentElement.style.overflow,
    bodyOverflow: document.body.style.overflow,
    bodyWidth: document.body.style.width,
    appOverflow: appRoot?.style.overflow || ''
  }

  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
  document.body.style.width = '100%'
  if (appRoot) {
    appRoot.style.overflow = 'hidden'
  }
}

const unlockPageScroll = () => {
  if (!pageScrollLockSnapshot) return

  const appRoot = document.getElementById('app')
  document.documentElement.style.overflow = pageScrollLockSnapshot.htmlOverflow
  document.body.style.overflow = pageScrollLockSnapshot.bodyOverflow
  document.body.style.width = pageScrollLockSnapshot.bodyWidth
  if (appRoot) {
    appRoot.style.overflow = pageScrollLockSnapshot.appOverflow
  }

  pageScrollLockSnapshot = null
}

const buildReplayTimelineURL = (targetHistoryID: number) => {
  const query = new URLSearchParams()
  if (useAdminScope.value) {
    query.set('scope', 'admin')
  }
  query.set('from', replayReturnPath.value)
  const queryStr = query.toString()
  return queryStr ? `/replay/${targetHistoryID}?${queryStr}` : `/replay/${targetHistoryID}`
}

const goBackToEntryPage = () => {
  router.push(replayReturnPath.value)
}

const isGameRoomReplayRoute = computed(() => {
  const queryId = Number(route.query.replay_history_id)
  return Number.isFinite(queryId) && queryId > 0 && typeof route.params.id === 'string'
})

const syncReplayViewModeByRoute = () => {
  if (isGameRoomReplayRoute.value) {
    replayViewMode.value = 'game'
    return
  }

  if (route.query.mode === 'game' || route.query.mode === 'timeline') {
    replayViewMode.value = route.query.mode
    return
  }

  replayViewMode.value = 'timeline'
}

syncReplayViewModeByRoute()
watch(() => route.fullPath, () => syncReplayViewModeByRoute())

const historyId = computed(() => {
  const fromParam = Number(route.params.historyId)
  if (Number.isFinite(fromParam) && fromParam > 0) {
    return fromParam
  }

  const fromQuery = Number(route.query.replay_history_id)
  if (Number.isFinite(fromQuery) && fromQuery > 0) {
    return fromQuery
  }

  return 0
})

const switchToGameView = (startIndex?: number | null) => {
  if (!historyId.value) return
  if (isGameRoomReplayRoute.value && (startIndex == null || !Number.isFinite(startIndex))) {
    replayViewMode.value = 'game'
    return
  }

  const query = new URLSearchParams()
  query.set('replay_history_id', String(historyId.value))
  if (startIndex != null && Number.isFinite(startIndex) && startIndex >= 0) {
    query.set('replay_start_index', String(Math.floor(startIndex)))
  }
  if (useAdminScope.value) {
    query.set('scope', 'admin')
  }
  query.set('from', replayReturnPath.value)
  router.push(`/room/replay?${query.toString()}`)
}

const switchToTimelineView = () => {
  if (!historyId.value) return
  if (!isGameRoomReplayRoute.value) {
    replayViewMode.value = 'timeline'
    return
  }

  router.push(buildReplayTimelineURL(historyId.value))
}

const participants = computed(() => {
  if (!Array.isArray(replayData.value?.player_profiles)) {
    return []
  }
  return replayData.value.player_profiles
})

const aiParticipantUIDSet = computed(() => {
  const set = new Set<number>()
  participants.value.forEach((profile: any) => {
    const uid = Number(profile?.uid)
    if (!Number.isFinite(uid)) return
    if (profile?.is_ai || uid < 0) {
      set.add(uid)
    }
  })
  return set
})

const currentPerspectiveName = computed(() => {
  const profile = participants.value.find((p: any) => Number(p.uid) === selectedPerspectiveUID.value)
  return profile?.nickname || profile?.username || '系统观察者'
})

const parseReplayTimeMs = (timeLike: any) => {
  if (!timeLike) return null
  const normalized = String(timeLike).includes('T') ? String(timeLike) : String(timeLike).replace(' ', 'T')
  const ms = new Date(normalized).getTime()
  return Number.isFinite(ms) ? ms : null
}

const events = computed(() => {
  const rawEvents = replayData.value?.replay?.events
  if (!Array.isArray(rawEvents)) {
    return []
  }

  const normalizedEvents = rawEvents.map((evt: any, index: number) => {
    const at = evt?.at || evt?.timestamp || ''
    return {
      ...evt,
      __index: index,
      eventType: evt?.type || evt?.event || '',
      actorUID: Number(evt?.actor_uid ?? evt?.uid ?? 0),
      at,
      atMs: parseReplayTimeMs(at),
      payload: evt?.payload || {}
    }
  })

  const sortedEvents = [...normalizedEvents].sort((a: any, b: any) => {
    if (a.atMs == null && b.atMs == null) return a.__index - b.__index
    if (a.atMs == null) return 1
    if (b.atMs == null) return -1
    if (a.atMs !== b.atMs) return a.atMs - b.atMs
    return a.__index - b.__index
  })

  const previousTimedByUID = new Map<number, number>()

  return sortedEvents.map((evt: any, sortedIndex: number) => {
    const isAIActor = aiParticipantUIDSet.value.has(Number(evt.actorUID || 0))
    let operationMs: number | null = null

    if (!isAIActor) {
      const payloadFastMs = Number(evt.payload?.fast_reaction_ms)
      if (Number.isFinite(payloadFastMs) && payloadFastMs > 0) {
        operationMs = payloadFastMs
      } else if (operationEventTypes.has(evt.eventType) && evt.atMs != null) {
        const previousMs = previousTimedByUID.get(Number(evt.actorUID || 0))
        if (previousMs != null) {
          const delta = evt.atMs - previousMs
          if (delta >= 0 && delta <= 10 * 60 * 1000) {
            operationMs = delta
          }
        }
      }
    }

    if (!isAIActor && evt.atMs != null && operationEventTypes.has(evt.eventType)) {
      previousTimedByUID.set(Number(evt.actorUID || 0), evt.atMs)
    }

    return {
      ...evt,
      __sortedIndex: sortedIndex,
      operationMs,
      isFastOperation: operationMs != null && operationMs < OPERATION_FAST_THRESHOLD_MS
    }
  })
})

const startReplayFromEvent = (evt: any) => {
  const startIndex = Number(evt?.__sortedIndex)
  switchToGameView(Number.isFinite(startIndex) && startIndex >= 0 ? startIndex : 0)
}

const visibleEvents = computed(() => {
  if (!focusPerspectiveOnly.value || selectedPerspectiveUID.value == null) {
    return events.value
  }

  return events.value.filter((evt: any) => {
    if (evt.actorUID === selectedPerspectiveUID.value) {
      return true
    }
    return evt.eventType === 'game_start' || evt.eventType === 'game_finished' || evt.eventType === 'game_terminated_invalid'
  })
})

const operationStats = computed(() => {
  return participants.value
    .filter((profile: any) => {
      const uid = Number(profile.uid)
      return Number.isFinite(uid) && !aiParticipantUIDSet.value.has(uid)
    })
    .map((profile: any) => {
      const uid = Number(profile.uid)
      const samples = events.value.filter((evt: any) => evt.actorUID === uid && evt.operationMs != null)
      const opValues = samples.map((evt: any) => Number(evt.operationMs))
      const fastCount = samples.filter((evt: any) => evt.isFastOperation).length

      if (opValues.length === 0) {
        return {
          uid,
          nickname: profile.nickname || profile.username || `UID ${uid}`,
          avgMs: null,
          minMs: null,
          fastCount,
          totalCount: 0
        }
      }

      const sum = opValues.reduce((acc: number, cur: number) => acc + cur, 0)
      const min = Math.min(...opValues)

      return {
        uid,
        nickname: profile.nickname || profile.username || `UID ${uid}`,
        avgMs: Math.round(sum / opValues.length),
        minMs: Math.round(min),
        fastCount,
        totalCount: opValues.length
      }
    })
    .sort((a: { fastCount: number }, b: { fastCount: number }) => b.fastCount - a.fastCount)
})

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  try {
    return new Date(String(dateStr).replace(' ', 'T')).toLocaleString()
  } catch {
    return String(dateStr)
  }
}

const formatEventType = (type: string) => {
  const labels: Record<string, string> = {
    game_start: '对局开始',
    play_card: '出牌',
    double_play: '双联',
    draw_card: '摸牌',
    timeout_auto_draw: '超时自动摸牌',
    game_finished: '对局结束',
    game_terminated_invalid: '无效结算',
    fast_reaction: '快速反应'
  }
  return labels[type] || type
}

const formatOperationDuration = (ms: number | null) => {
  if (ms == null) return '-'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

const resolveActorName = (uid: number) => {
  if (!uid) return '系统'
  if (selectedPerspectiveUID.value != null && uid === selectedPerspectiveUID.value) {
    return '你'
  }

  const profile = participants.value.find((p: any) => Number(p.uid) === Number(uid))
  if (profile) {
    return profile.nickname || profile.username || `UID ${uid}`
  }
  return `UID ${uid}`
}

const describeEvent = (evt: any) => {
  const actor = resolveActorName(Number(evt.actorUID || 0))
  const payload = evt.payload || {}
  const operationHint = evt.operationMs != null
    ? `（操作耗时 ${formatOperationDuration(evt.operationMs)}${evt.isFastOperation ? '，疑似过快' : ''}）`
    : ''

  if (evt.eventType === 'play_card') {
    const symbol = payload.card_symbol || payload.card_type || '未知卡牌'
    const substance = payload.substance || '未知物质'
    return `${actor} 使用 ${symbol} -> ${substance}${operationHint}`
  }

  if (evt.eventType === 'double_play') {
    const sub1 = payload.sub1 || payload.substance_1 || '?'
    const sub2 = payload.sub2 || payload.substance_2 || '?'
    return `${actor} 触发双联 ${sub1} + ${sub2}${operationHint}`
  }

  if (evt.eventType === 'draw_card') {
    return `${actor} 摸牌 ${payload.actual_count || payload.draw_count || 1} 张${operationHint}`
  }

  if (evt.eventType === 'timeout_auto_draw') {
    return `${actor} 超时自动摸牌 ${payload.draw_count || 1} 张`
  }

  if (evt.eventType === 'fast_reaction') {
    return `${actor} 触发快速反应 (${payload.interval_ms || '?'}ms)`
  }

  return `${actor} ${formatEventType(evt.eventType)}`
}

const chooseDefaultPerspective = () => {
  if (!participants.value.length) {
    selectedPerspectiveUID.value = null
    return
  }

  const preferred = participants.value.find((p: any) => Number(p.uid) === Number(currentUser.value?.uid))
  if (preferred) {
    selectedPerspectiveUID.value = Number(preferred.uid)
    return
  }

  const firstHuman = participants.value.find((p: any) => Number(p.uid) > 0)
  if (firstHuman) {
    selectedPerspectiveUID.value = Number(firstHuman.uid)
    return
  }

  selectedPerspectiveUID.value = Number(participants.value[0].uid)
}

const loadReplay = async () => {
  loading.value = true
  loadError.value = ''

  if (!historyId.value) {
    loadError.value = '无效的回放编号'
    loading.value = false
    return
  }

  try {
    const response = await gameAPI.getMyGameReplay(historyId.value)
    replayData.value = response.data
    chooseDefaultPerspective()
  } catch (error: any) {
    loadError.value = error?.response?.data?.error || '回放加载失败'
  } finally {
    loading.value = false
  }
}

const enterLiveRoomAsSpectator = () => {
  const roomID = replayData.value?.room_id
  if (!roomID) return
  router.push(`/room/${roomID}?spectator=true`)
}

onMounted(() => {
  lockPageScroll()
  void loadReplay()
})

onUnmounted(() => {
  unlockPageScroll()
})
</script>

<template>
  <div class="console-page-shell mobile-fullpage-shell h-[var(--app-height)] overflow-y-auto sm:overflow-hidden" data-testid="replay-page">
    <div class="console-grid-overlay" />

    <div class="relative z-10 flex h-full flex-col">
      <header class="border-b border-slate-200/70 bg-white/75 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-[#08111a]/82">
        <div class="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <button @click="goBackToEntryPage" class="console-button group">
              <ArrowLeft class="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              返回
            </button>
            <div>
              <p class="console-eyebrow">Replay Room</p>
              <h1 class="text-base font-black tracking-tight text-slate-900 dark:text-white">对局回放 #{{ String(historyId).padStart(4, '0') }}</h1>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <div class="console-tab-strip">
              <button
                @click="switchToGameView()"
                :class="['console-tab-button', replayViewMode === 'game' && 'console-tab-button--active']"
              >
                游戏视角
              </button>
              <button
                @click="switchToTimelineView"
                :class="['console-tab-button', replayViewMode === 'timeline' && 'console-tab-button--active']"
              >
                时间线
              </button>
            </div>

            <button
              v-if="replayData?.room_id"
              @click="enterLiveRoomAsSpectator"
              class="console-button text-cyan-700 dark:text-cyan-300"
            >
              <Eye class="h-4 w-4" />
              旁观当前房间
            </button>
          </div>
        </div>
      </header>

      <div class="mx-auto grid h-full w-full max-w-[1600px] min-h-0 grid-cols-1 gap-0 lg:grid-cols-[300px_1fr]">
        <aside class="overflow-y-auto border-b border-slate-200/70 bg-white/70 p-4 backdrop-blur lg:border-b-0 lg:border-r dark:border-white/10 dark:bg-[#09131d]/78">
          <div class="space-y-4">
            <section class="console-subcard p-3">
              <p class="console-eyebrow">Replay Status</p>
              <div class="mt-2 flex flex-wrap gap-2">
                <span v-if="replayData?.cheat_detected" class="console-notice-chip border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300">CHEAT</span>
                <span v-if="replayData?.replay_permanent" class="console-notice-chip border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300">PERMANENT</span>
                <span v-else-if="replayData?.replay_expires_at" class="console-notice-chip">
                  {{ formatDate(replayData.replay_expires_at) }} 到期
                </span>
              </div>
            </section>

            <section class="console-subcard p-3">
              <div class="mb-3 flex items-center justify-between gap-2">
                <p class="console-eyebrow">Perspective</p>
                <button
                  @click="focusPerspectiveOnly = !focusPerspectiveOnly"
                  :class="['console-filter-pill', focusPerspectiveOnly && 'console-filter-pill--active']"
                >
                  {{ focusPerspectiveOnly ? '仅本视角' : '全局事件' }}
                </button>
              </div>

              <div class="space-y-2">
                <button
                  v-for="profile in participants"
                  :key="profile.uid"
                  @click="selectedPerspectiveUID = Number(profile.uid)"
                  :class="cn(
                    'w-full rounded-2xl border px-3 py-2 text-left transition-all',
                    selectedPerspectiveUID === Number(profile.uid)
                      ? 'border-sky-500/30 bg-sky-500/10'
                      : 'border-slate-200/80 bg-white/80 hover:border-sky-500/20 dark:border-white/10 dark:bg-white/[0.03]'
                  )"
                >
                  <p class="text-sm font-bold text-slate-900 dark:text-white">{{ profile.nickname || profile.username || `UID ${profile.uid}` }}</p>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400">UID {{ profile.uid }}</p>
                </button>
              </div>
            </section>

            <section class="console-subcard p-3">
              <div class="mb-3 flex items-center justify-between gap-2">
                <p class="console-eyebrow">Operation Scan</p>
                <span class="console-notice-chip border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300">阈值 &lt; 3.00s</span>
              </div>

              <div class="space-y-2">
                <div
                  v-for="stat in operationStats"
                  :key="`op-stat-${stat.uid}`"
                  class="rounded-2xl border border-slate-200/80 bg-white/78 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div class="flex items-center justify-between gap-2">
                    <p class="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{{ stat.nickname }}</p>
                    <span :class="['console-notice-chip', stat.fastCount > 0 ? 'border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300']">
                      FAST {{ stat.fastCount }}
                    </span>
                  </div>
                  <p class="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    平均 {{ formatOperationDuration(stat.avgMs) }} / 最快 {{ formatOperationDuration(stat.minMs) }} / 样本 {{ stat.totalCount }}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </aside>

        <main class="min-h-0 overflow-y-auto p-4 md:p-5">
          <div v-if="loading" class="flex h-full items-center justify-center">
            <div class="h-9 w-9 rounded-full border-4 border-sky-500/20 border-t-sky-500 animate-spin" />
          </div>

          <div v-else-if="loadError" class="console-empty-state border-rose-300/70 text-rose-600 dark:border-rose-500/20 dark:text-rose-300">
            {{ loadError }}
          </div>

          <div v-else class="space-y-3">
            <section class="console-panel">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p class="console-eyebrow">Current Perspective</p>
                  <p class="text-base font-black text-slate-900 dark:text-white">{{ currentPerspectiveName }}</p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <span class="console-metric-chip">事件 {{ visibleEvents.length }}</span>
                  <span class="console-metric-chip">参与者 {{ participants.length }}</span>
                </div>
              </div>
            </section>

            <template v-if="replayViewMode === 'game'">
              <section class="console-panel">
                <div class="mb-4 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                  <div
                    v-for="profile in participants"
                    :key="`player-overview-${profile.uid}`"
                    :class="cn(
                      'rounded-2xl border px-3 py-2',
                      Number(profile.uid) === selectedPerspectiveUID
                        ? 'border-sky-500/30 bg-sky-500/10'
                        : 'border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-white/[0.03]'
                    )"
                  >
                    <p class="text-sm font-bold text-slate-900 dark:text-white">{{ profile.nickname || profile.username || `UID ${profile.uid}` }}</p>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400">UID {{ profile.uid }}</p>
                    <p class="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      快速操作 {{ operationStats.find((s: any) => s.uid === Number(profile.uid))?.fastCount || 0 }} 次
                    </p>
                  </div>
                </div>

                <div class="space-y-2">
                  <div
                    v-for="(evt, idx) in visibleEvents"
                    :key="`game-mode-${evt.at || idx}-${idx}`"
                    :class="cn(
                      'rounded-2xl border px-3 py-3',
                      evt.isFastOperation
                        ? 'border-rose-500/20 bg-rose-500/10'
                        : 'border-slate-200/80 bg-white/78 dark:border-white/10 dark:bg-white/[0.03]'
                    )"
                  >
                    <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <span class="console-notice-chip">{{ formatEventType(evt.eventType) }}</span>
                      <div class="flex flex-wrap items-center gap-2">
                        <button @click="startReplayFromEvent(evt)" class="console-button text-cyan-700 dark:text-cyan-300">从此处开始</button>
                        <span v-if="evt.operationMs != null" :class="['console-notice-chip', evt.isFastOperation ? 'border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300']">
                          {{ formatOperationDuration(evt.operationMs) }}
                        </span>
                        <span class="text-[11px] text-slate-500 dark:text-slate-400">{{ formatDate(evt.at) }}</span>
                      </div>
                    </div>
                    <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ idx + 1 }}. {{ describeEvent(evt) }}</p>
                  </div>
                </div>
              </section>
            </template>

            <template v-else>
              <section
                v-for="(evt, idx) in visibleEvents"
                :key="`${evt.at || idx}-${idx}`"
                class="console-panel"
              >
                <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span class="console-notice-chip">{{ formatEventType(evt.eventType) }}</span>
                  <div class="flex flex-wrap items-center gap-2">
                    <button @click="startReplayFromEvent(evt)" class="console-button text-cyan-700 dark:text-cyan-300">从此处开始</button>
                    <span v-if="evt.operationMs != null" :class="['console-notice-chip', evt.isFastOperation ? 'border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300']">
                      {{ formatOperationDuration(evt.operationMs) }}
                    </span>
                    <span class="text-[11px] text-slate-500 dark:text-slate-400">{{ formatDate(evt.at) }}</span>
                  </div>
                </div>
                <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ idx + 1 }}. {{ describeEvent(evt) }}</p>
              </section>
            </template>

            <div v-if="visibleEvents.length === 0" class="console-empty-state">
              <p class="text-sm font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">No Events In Current Perspective</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>
