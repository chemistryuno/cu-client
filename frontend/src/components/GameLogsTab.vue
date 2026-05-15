<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { BookOpen } from 'lucide-vue-next'
import { cn } from '../utils/cn'
import type { GameLogEntry } from '../types/gameLog'
import GameLogEntryComponent from './GameLogEntry.vue'

const props = defineProps<{
  gameLogs: GameLogEntry[]
}>()

const emit = defineEmits<{
  (e: 'log-entry-clicked', entry: GameLogEntry): void
}>()

const scrollContainer = ref<HTMLElement | null>(null)

const scrollToBottom = () => {
  if (scrollContainer.value) {
    nextTick(() => {
      scrollContainer.value!.scrollTop = scrollContainer.value!.scrollHeight
    })
  }
}

watch(() => props.gameLogs.length, () => {
  scrollToBottom()
}, { immediate: false })

onMounted(() => {
  scrollToBottom()
})

const handleEntryClick = (entry: GameLogEntry) => {
  emit('log-entry-clicked', entry)
}
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden bg-transparent">
    <div
      v-if="gameLogs.length === 0"
      class="flex h-full flex-col items-center justify-center py-10 opacity-20"
    >
      <div class="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 dark:bg-white/10">
        <BookOpen class="h-7 w-7" />
      </div>
      <p class="text-xs-mobile font-black uppercase tracking-widest text-slate-500">
        实验开始 / 等待第一步操作... / Game started | Waiting for first move...
      </p>
    </div>

    <div
      v-else
      ref="scrollContainer"
      class="custom-scrollbar flex-1 space-y-2 overflow-y-auto p-3"
    >
      <GameLogEntryComponent
        v-for="(entry, idx) in gameLogs"
        :key="`log-${entry.step}`"
        :entry="entry"
        @click="handleEntryClick(entry)"
      />
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.5) transparent;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(148, 163, 184, 0.5);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(148, 163, 184, 0.7);
}
</style>
