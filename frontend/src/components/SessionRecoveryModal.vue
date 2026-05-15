<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-gray-900">{{ td('sessionRecovery.savedGames') }}</h2>
          <button
            @click="closeModal"
            class="p-1 text-gray-500 hover:text-gray-700"
            :aria-label="td('sessionRecovery.close')"
          >
            <X size="20" />
          </button>
        </div>

        <div class="space-y-3 mb-6">
          <div v-if="sessions.length === 0" class="text-center py-4 text-gray-500">
            {{ td('sessionRecovery.noSavedGames') }}
          </div>

          <div
            v-for="session in sessions"
            :key="session.id"
            class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
          >
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1">
                <p class="font-medium text-gray-900">{{ formatGameMode(session.gameMode) }}</p>
                <p class="text-sm text-gray-500">{{ formatTimestamp(session.timestamp) }}</p>
              </div>
              <select
                :value="selectedSessionId === session.id ? 'selected' : 'default'"
                @change="(e) => handleSessionSelect(session.id, e.target.value)"
                class="text-sm px-2 py-1 rounded border border-gray-300 cursor-pointer"
              >
                <option value="default" disabled>{{ td('sessionRecovery.actions') }}</option>
                <option value="resume">{{ td('sessionRecovery.resumeGame') }}</option>
                <option value="abandon">{{ td('sessionRecovery.abandonGame') }}</option>
              </select>
            </div>
          </div>
        </div>

        <div class="flex gap-3 mb-4">
          <button
            v-if="sessions.length > 0"
            @click="abandonAll"
            class="flex-1 px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
          >
            {{ td('sessionRecovery.abandonAll') }}
          </button>
          <button
            @click="startNewGame"
            class="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            {{ td('sessionRecovery.newGame') }}
          </button>
        </div>

        <button
          @click="closeModal"
          class="w-full px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          {{ td('sessionRecovery.close') }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { useI18n } from '../utils/i18n'
import { useDialog } from '../utils/dialog'
import type { GameSessionMetadata } from '../types/gameSaveState'

interface Props {
  open: boolean
  sessions: GameSessionMetadata[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  resume: [sessionId: string]
  abandon: [sessionId: string]
  abandonAll: []
  startNew: []
}>()

const { td } = useI18n()
const { showConfirm } = useDialog()
const selectedSessionId = ref<string | null>(null)
const isOpen = ref(false)
const { locale } = useI18n()

watch(
  () => props.open,
  (newVal) => {
    isOpen.value = newVal
    if (newVal) {
      selectedSessionId.value = null
    }
  },
  { immediate: true }
)

const closeModal = () => {
  isOpen.value = false
  emit('close')
}

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return td('sessionRecovery.justNow')
  if (diffMins < 60) return `${diffMins}m ${locale.value === 'zh-CN' ? '前' : 'ago'}`
  if (diffHours < 24) return `${diffHours}h ${locale.value === 'zh-CN' ? '前' : 'ago'}`
  if (diffDays < 7) return `${diffDays}d ${locale.value === 'zh-CN' ? '前' : 'ago'}`
  return date.toLocaleDateString()
}

const formatGameMode = (mode: string): string => {
  return mode === 'single_player' ? td('sessionRecovery.singlePlayerGame') : td('sessionRecovery.multiplayerGame')
}

const handleSessionSelect = async (sessionId: string, action: string) => {
  selectedSessionId.value = sessionId
  if (action === 'resume') {
    emit('resume', sessionId)
    closeModal()
  } else if (action === 'abandon') {
    const confirmed = await showConfirm(
      td('sessionRecovery.confirmAbandon'),
      td('sessionRecovery.abandonGame')
    )
    if (confirmed) {
      emit('abandon', sessionId)
    }
    selectedSessionId.value = null
  }
}

const abandonAll = async () => {
  const confirmed = await showConfirm(
    `${td('sessionRecovery.confirmAbandonAll')} ${props.sessions.length} ${td('sessionRecovery.games')}`,
    td('sessionRecovery.abandonAll')
  )
  if (confirmed) {
    emit('abandonAll')
  }
}

const startNewGame = () => {
  emit('startNew')
  closeModal()
}
</script>

<style scoped>
/* Mobile-first responsive design */
@media (max-width: 640px) {
  :deep(.bg-white) {
    max-width: calc(100vw - 1.5rem);
  }
}

button {
  transition: all 0.2s ease;
}

button:active {
  transform: scale(0.98);
}
</style>

