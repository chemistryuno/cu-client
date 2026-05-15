<script setup lang="ts">
import { ref, watch } from 'vue'
import { BookOpen, MessageCircle } from 'lucide-vue-next'
import { cn } from '../utils/cn'
import GameLogsTab from './GameLogsTab.vue'
import AIDialogTab from './AIDialogTab.vue'
import type { GameLogEntry } from '../types/gameLog'

const props = defineProps<{
  gameLogs?: GameLogEntry[]
  maxHeight?: string
}>()

const emit = defineEmits<{
  (e: 'log-entry-clicked', entry: GameLogEntry): void
}>()

const activeTab = ref<'logs' | 'ai'>('logs')

const handleLogEntryClick = (entry: GameLogEntry) => {
  emit('log-entry-clicked', entry)
  activeTab.value = 'ai'
}
</script>

<template>
  <div
    :class="cn('console-card flex flex-col overflow-hidden backdrop-blur', $attrs.class as string)"
    :style="maxHeight ? { height: maxHeight } : {}"
  >
    <!-- Tab Header -->
    <div class="flex shrink-0 border-b border-slate-200/70 bg-slate-50/60 dark:border-white/10 dark:bg-white/[0.03]">
      <button
        @click="activeTab = 'logs'"
        :class="cn(
          'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs-mobile font-black uppercase tracking-widest transition-all border-b-2',
          activeTab === 'logs'
            ? 'bg-sky-500/10 border-sky-500 text-sky-600 dark:text-sky-400'
            : 'border-transparent text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300'
        )"
      >
        <BookOpen class="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        <span>Game Logs / 游戏日志</span>
      </button>

      <button
        @click="activeTab = 'ai'"
        :class="cn(
          'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs-mobile font-black uppercase tracking-widest transition-all border-b-2',
          activeTab === 'ai'
            ? 'bg-sky-500/10 border-sky-500 text-sky-600 dark:text-sky-400'
            : 'border-transparent text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300'
        )"
      >
        <MessageCircle class="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        <span>AI Assistant / AI助手</span>
      </button>
    </div>

    <!-- Tab Content -->
    <div class="flex-1 overflow-hidden">
      <div v-if="activeTab === 'logs'" class="h-full w-full">
        <GameLogsTab
          :game-logs="gameLogs || []"
          @log-entry-clicked="handleLogEntryClick"
        />
      </div>

      <div v-if="activeTab === 'ai'" class="h-full w-full">
        <AIDialogTab @switch-to-logs="activeTab = 'logs'" />
      </div>
    </div>
  </div>
</template>

<style scoped></style>
