<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { FlaskConical, MessageSquare, Send, Trophy, User, Users, X } from 'lucide-vue-next'
import websocket from '../utils/websocket'
import UserAvatar from './UserAvatar.vue'
import { authAPI, gameAPI } from '../utils/api'
import { cn } from '../utils/cn'

const router = useRouter()

const props = defineProps<{
  roomId?: string
  title?: string
  placeholder?: string
  maxHeight?: string
  hideHeader?: boolean
}>()

const emit = defineEmits(['close', 'input-focus', 'input-blur'])

const messages = ref<any[]>([])
const newMessage = ref('')
const currentUID = ref(JSON.parse(localStorage.getItem('user') || '{}').uid)
const scrollContainer = ref<HTMLElement | null>(null)
const isComposing = ref(false)
const chatMode = ref<'normal' | 'private'>('normal')
const privateTarget = ref<{uid: number, username: string, nickname?: string} | null>(null)
const roomStatusCache = ref<Record<string, { status: string, checkedAt: number }>>({})

const scrollToBottom = () => {
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
  }
}

const checkRoomStatus = async (roomId: string) => {
  const cached = roomStatusCache.value[roomId]
  if (cached && Date.now() - cached.checkedAt < 5000) {
    return cached.status
  }

  try {
    const res = await gameAPI.checkRoomStatus(roomId)
    const status = res.data.exists ? res.data.status : 'closed'
    roomStatusCache.value[roomId] = {
      status,
      checkedAt: Date.now()
    }
    return status
  } catch {
    return 'closed'
  }
}

const loadHistory = async () => {
  try {
    const chatRes = await authAPI.getGlobalChatHistory(50)
    const chatMessages = (chatRes.data || []).map((m: any) => ({
      uid: m.user_uid,
      username: m.nickname || m.username,
      avatar: m.avatar,
      text: m.message,
      time: new Date(m.created_at),
      type: 'normal'
    }))

    messages.value = chatMessages
    nextTick(scrollToBottom)
  } catch (err) {
    console.error('加载聊天历史失败', err)
  }
}

onMounted(() => {
  if (!props.roomId) {
    void loadHistory()
    websocket.joinRoom('lobby')
  }

  const handleChatMessage = (msg: any) => {
    const isDuplicate = messages.value.some((m) =>
      m.uid === msg.uid &&
      m.text === msg.message &&
      Math.abs(new Date(m.time).getTime() - new Date().getTime()) < 2000
    )
    if (isDuplicate) return

    messages.value.push({
      uid: msg.uid,
      username: msg.data?.nickname || '研究员',
      avatar: msg.data?.avatar,
      text: msg.message,
      time: new Date(),
      type: msg.data?.is_system === 'true' ? 'system' : 'normal'
    })
    nextTick(scrollToBottom)
  }

  const handlePrivateMessage = async (msg: any) => {
    let isGameInvite = false
    let gameInviteData = null

    try {
      const parsed = JSON.parse(msg.message)
      if (parsed.type === 'game_invite') {
        isGameInvite = true
        gameInviteData = parsed

        if (gameInviteData.room_id) {
          gameInviteData.room_status = await checkRoomStatus(gameInviteData.room_id)
        }
      }
    } catch {}

    messages.value.push({
      uid: msg.uid,
      target_uid: msg.target_uid,
      username: msg.data?.nickname || '研究员',
      avatar: msg.data?.avatar,
      text: isGameInvite ? '' : msg.message,
      time: new Date(),
      type: isGameInvite ? 'game_invite' : 'private',
      gameInviteData
    })
    nextTick(scrollToBottom)
  }

  websocket.on('chat', handleChatMessage)
  websocket.on('private_chat', handlePrivateMessage)

  const handleStartPrivateChat = (e: CustomEvent) => {
    privateTarget.value = e.detail as { uid: number, username: string, nickname?: string }
    chatMode.value = 'private'
  }

  window.addEventListener('start-private-chat', handleStartPrivateChat as any)

  onUnmounted(() => {
    if (!props.roomId) {
      websocket.leaveRoom()
    }
    websocket.off('chat', handleChatMessage)
    websocket.off('private_chat', handlePrivateMessage)
    window.removeEventListener('start-private-chat', handleStartPrivateChat as any)
  })
})

const handleSend = () => {
  if (isComposing.value) return
  if (!newMessage.value.trim()) return

  if (chatMode.value === 'private' && privateTarget.value) {
    if (props.roomId) {
      chatMode.value = 'normal'
      privateTarget.value = null
      return
    }
    websocket.send({
      type: 'private_chat',
      target_uid: privateTarget.value.uid,
      message: newMessage.value
    })
  } else {
    websocket.send({
      type: 'chat',
      message: newMessage.value
    })
  }

  newMessage.value = ''
}

const handleJoinGame = (roomId: string) => {
  router.push(`/room/${roomId}`)
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !isComposing.value) {
    handleSend()
  }
}

const handleCompositionStart = () => {
  isComposing.value = true
}

const handleCompositionEnd = () => {
  isComposing.value = false
}

const formatTime = (date: Date) => {
  return date.getHours().toString().padStart(2, '0') + ':' +
         date.getMinutes().toString().padStart(2, '0')
}
</script>

<template>
  <div
    :class="cn('console-card flex flex-col overflow-hidden backdrop-blur', $attrs.class as string)"
    :style="maxHeight ? { height: maxHeight } : {}"
  >
    <div v-if="!hideHeader" class="flex shrink-0 items-center justify-between border-b border-slate-200/70 bg-slate-50/60 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
      <div class="flex items-center gap-2">
        <div class="flex h-8 w-8 items-center justify-center rounded-xl border border-sky-500/15 bg-sky-500/10">
          <MessageSquare class="h-4 w-4 text-sky-500" />
        </div>
        <div>
          <h3 class="text-xs-mobile font-black uppercase tracking-widest text-slate-800 dark:text-white">{{ title || '实验通信频道' }}</h3>
          <p class="text-[9px] font-mono uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Messaging Protocol</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div class="console-notice-chip">
          <span class="h-1 w-1 rounded-full bg-sky-500"></span>
          Live
        </div>
        <button
          v-if="roomId"
          @click="emit('close')"
          class="console-button console-button-ghost p-2 touch-feedback"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
    </div>

    <div
      ref="scrollContainer"
      class="custom-scrollbar flex-1 space-y-2 overflow-y-auto bg-transparent p-3"
    >
      <div v-if="messages.length === 0" class="flex h-full flex-col items-center justify-center py-10 opacity-20">
        <div class="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 dark:bg-white/10">
          <MessageSquare class="h-7 w-7" />
        </div>
        <p class="text-xs-mobile font-black uppercase tracking-widest text-slate-500">连接已建立 | 等待数据包...</p>
      </div>

      <div
        v-for="(msg, idx) in messages"
        :key="idx"
        :class="cn(
          'w-full flex',
          msg.type === 'system' ? 'justify-center my-3' : (msg.uid === currentUID ? 'justify-end' : 'justify-start')
        )"
      >
        <div v-if="msg.type === 'system'" class="flex max-w-[85%] flex-col items-center gap-1.5">
          <div class="flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-slate-100/60 px-3 py-1 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
             <div class="h-1 w-1 rounded-full bg-sky-500"></div>
             <span class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">日志</span>
             <span class="text-[10px] font-bold tracking-tight text-slate-500 dark:text-slate-400">{{ msg.text }}</span>
          </div>
        </div>

        <div v-else :class="cn(
          'flex max-w-[95%] gap-2.5 sm:gap-2',
          msg.uid === currentUID ? 'flex-row-reverse' : 'flex-row'
        )">
          <div class="mt-1 shrink-0">
            <div
              @click="router.push(`/user/${msg.uid}`)"
              class="flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 shadow-inner transition-all hover:ring-2 hover:ring-sky-500/40 dark:border-white/10 dark:bg-white/[0.04]"
            >
              <UserAvatar :avatar="msg.avatar" />
            </div>
          </div>

          <div :class="cn(
            'flex flex-col gap-0.5',
            msg.uid === currentUID ? 'items-end' : 'items-start'
          )">
            <div class="flex items-center gap-1 px-0.5">
              <span v-if="msg.uid !== currentUID" class="text-[9px] sm:text-[8px] font-black uppercase tracking-tighter text-slate-400">
                {{ msg.nickname || msg.username }}
                <span v-if="msg.type === 'private'" class="ml-1 text-rose-500">(私语)</span>
                <span v-if="msg.type === 'game_invite'" class="ml-1 text-sky-500">(游戏邀请)</span>
              </span>
              <span v-else-if="msg.type === 'private'" class="text-[9px] sm:text-[8px] font-black uppercase tracking-tighter text-rose-500">
                对 {{ msg.target_uid === currentUID ? '自己' : '研究员' }} 说道
              </span>
              <span v-else-if="msg.type === 'game_invite'" class="text-[9px] sm:text-[8px] font-black uppercase tracking-tighter text-sky-500">
                发送了游戏邀请
              </span>
              <span class="text-[8px] sm:text-[7px] font-mono text-slate-300 dark:text-slate-600">{{ formatTime(msg.time) }}</span>
            </div>

            <div v-if="msg.type === 'game_invite' && msg.gameInviteData"
              :class="cn(
                'w-full max-w-xs rounded-2xl border p-3.5 shadow-lg backdrop-blur-sm transition-all',
                msg.gameInviteData.room_status === 'finished' || msg.gameInviteData.room_status === 'closed'
                  ? 'border-slate-300/70 bg-slate-200/40 grayscale opacity-60 dark:border-white/10 dark:bg-white/[0.03]'
                  : 'border-sky-500/20 bg-sky-500/10'
              )"
            >
              <div class="mb-2 flex items-center gap-2">
                <div :class="cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg',
                  msg.gameInviteData.room_status === 'finished' || msg.gameInviteData.room_status === 'closed'
                    ? 'bg-slate-500/20'
                    : 'bg-sky-500/20'
                )">
                  <FlaskConical :class="cn(
                    'h-5 w-5',
                    msg.gameInviteData.room_status === 'finished' || msg.gameInviteData.room_status === 'closed'
                      ? 'text-slate-500'
                      : 'text-sky-500'
                  )" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="truncate text-xs-mobile font-black text-slate-800 dark:text-white">
                    {{ msg.gameInviteData.room_name }}
                  </div>
                  <div class="text-[9px] font-mono uppercase text-slate-500">
                    {{ msg.gameInviteData.room_status === 'finished' || msg.gameInviteData.room_status === 'closed' ? '房间已关闭' : '实验室邀请' }}
                  </div>
                </div>
              </div>

              <div v-if="msg.gameInviteData.room_status !== 'finished' && msg.gameInviteData.room_status !== 'closed'" class="mb-3 flex items-center gap-3 text-xs-mobile">
                <div class="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                  <Users class="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                  <span class="font-bold">{{ msg.gameInviteData.player_count }}/{{ msg.gameInviteData.max_players }}</span>
                </div>
                <div v-if="msg.gameInviteData.is_points_mode" class="flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-0.5 text-amber-600 dark:text-amber-400">
                  <Trophy class="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                  <span class="text-[9px] font-black uppercase tracking-widest sm:text-[8px]">积分模式</span>
                </div>
              </div>

              <button
                @click="msg.gameInviteData.room_status !== 'finished' && msg.gameInviteData.room_status !== 'closed' && handleJoinGame(msg.gameInviteData.room_id)"
                :disabled="msg.gameInviteData.room_status === 'finished' || msg.gameInviteData.room_status === 'closed'"
                :class="cn(
                  'flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs-mobile font-black uppercase tracking-widest shadow-md transition-all touch-feedback',
                  msg.gameInviteData.room_status === 'finished' || msg.gameInviteData.room_status === 'closed'
                    ? 'cursor-not-allowed bg-slate-400 text-slate-600'
                    : 'bg-sky-600 text-white hover:bg-sky-500'
                )"
              >
                <FlaskConical class="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                {{ msg.gameInviteData.room_status === 'finished' || msg.gameInviteData.room_status === 'closed' ? '房间已关闭' : '立即加入实验室' }}
              </button>
            </div>

            <div v-else :class="cn(
              'break-words rounded-2xl px-3 py-2 text-xs-mobile font-medium leading-relaxed shadow-sm',
              msg.type === 'private' ? 'border-2 border-rose-500/10' : '',
              msg.uid === currentUID
                ? 'rounded-tr-md bg-sky-600 text-white'
                : 'rounded-tl-md border border-slate-200/70 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200'
            )">
              {{ msg.text }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="shrink-0 space-y-2 border-t border-slate-200/70 bg-white/88 p-3 pb-4 dark:border-white/10 dark:bg-[#0e1722]/85">
      <div v-if="chatMode === 'private'" class="animate-in slide-in-from-bottom-1 flex items-center gap-2">
        <div class="flex items-center gap-2 rounded-xl bg-rose-500 px-3 py-1.5 text-xs-mobile font-black uppercase tracking-widest text-white shadow-lg shadow-rose-500/20">
          <User class="h-3 w-3 sm:h-2.5 sm:w-2.5" />
          {{ `私密传输: ${privateTarget?.nickname || privateTarget?.username}` }}
        </div>
        <button @click="chatMode = 'normal'; privateTarget = null" class="console-button touch-feedback px-2.5 py-1.5 text-[9px]">
          取消
        </button>
      </div>

      <div class="flex gap-2">
        <div class="group relative flex-1">
          <div class="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-sky-500/25 to-cyan-500/25 blur opacity-0 transition duration-300 group-focus-within:opacity-100"></div>
          <input
            v-model="newMessage"
            type="text"
            :placeholder="placeholder || '输入实验指令或群聊讯息...'"
            class="relative h-11 w-full rounded-2xl border border-slate-200/80 bg-white px-3 text-sm font-medium text-slate-800 transition-all focus:border-sky-500/40 focus:outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500"
            @keydown="handleKeyDown"
            @compositionstart="handleCompositionStart"
            @compositionend="handleCompositionEnd"
            @focus="emit('input-focus')"
            @blur="emit('input-blur')"
          />
        </div>
        <button
          @click="handleSend"
          :disabled="!newMessage.trim()"
          class="btn-touch touch-feedback group/send flex shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-900/15 transition-all hover:bg-sky-500 disabled:opacity-50 disabled:grayscale"
        >
          <Send class="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:h-3.5 sm:w-3.5" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
