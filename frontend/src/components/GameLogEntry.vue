<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import { cn } from '../utils/cn'
import type { GameLogEntry } from '../types/gameLog'

const props = defineProps<{
  entry: GameLogEntry
}>()

const emit = defineEmits<{
  (e: 'click'): void
}>()

const actionLabel = computed(() => {
  const labels: Record<string, string> = {
    play_card: 'Played / 出卡',
    draw_card: 'Drawn / 抽卡',
    pass: 'Passed / 通过',
    skip: 'Skipped / 跳过',
    reverse: 'Reversed / 反转',
    game_end: 'Game End / 游戏结束'
  }
  return labels[props.entry.action] || props.entry.action
})

const cardDisplay = computed(() => {
  if (!props.entry.card) return ''
  return `${props.entry.card.color}·${props.entry.card.element} (${props.entry.card.reaction})`
})

const resultDisplay = computed(() => {
  if (!props.entry.result) return ''
  const parts = []
  if (props.entry.result.cardsDrawn) parts.push(`+${props.entry.result.cardsDrawn} cards`)
  if (props.entry.result.pointsGained) parts.push(`+${props.entry.result.pointsGained} points`)
  if (props.entry.result.opponentPassed) parts.push('Opponent passed')
  return parts.join(' | ')
})

const timeDisplay = computed(() => {
  const date = new Date(props.entry.timestamp)
  return date.getHours().toString().padStart(2, '0') + ':' +
         date.getMinutes().toString().padStart(2, '0') + ':' +
         date.getSeconds().toString().padStart(2, '0')
})

const isPlayerAction = computed(() => props.entry.actor === 'player')
const isClickable = computed(() => ['play_card', 'draw_card', 'pass', 'skip', 'reverse'].includes(props.entry.action))
</script>

<template>
  <div
    :class="cn(
      'w-full rounded-xl border p-3 transition-all cursor-pointer',
      isPlayerAction
        ? 'border-sky-500/30 bg-sky-500/10 hover:border-sky-500/50 hover:bg-sky-500/15'
        : 'border-slate-300/30 bg-slate-200/10 hover:border-slate-300/50 hover:bg-slate-200/15 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]',
      !isClickable && 'opacity-75'
    )"
    @click="emit('click')"
  >
    <!-- Header: Step, Action, Time -->
    <div class="flex items-start justify-between gap-2 mb-2">
      <div class="flex items-center gap-2">
        <span class="inline-flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/20 text-[10px] font-black text-sky-600 dark:text-sky-400">
          {{ entry.step }}
        </span>
        <div>
          <p class="text-[9px] font-black uppercase tracking-tight text-slate-600 dark:text-slate-400">
            {{ isPlayerAction ? 'You / 你' : 'Opponent / 对手' }}
          </p>
          <p class="text-xs-mobile font-bold text-slate-800 dark:text-slate-200">
            {{ actionLabel }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-1">
        <span class="text-[8px] font-mono text-slate-400 dark:text-slate-500">{{ timeDisplay }}</span>
        <ChevronRight v-if="isClickable" class="h-3.5 w-3.5 text-sky-500 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </div>

    <!-- Card Details (if card was played) -->
    <div v-if="entry.card" class="mb-2 flex items-center gap-2">
      <div :class="cn(
        'flex h-8 items-center justify-center rounded-lg px-2 text-xs-mobile font-bold',
        isPlayerAction
          ? 'bg-sky-600 text-white'
          : 'bg-slate-400 text-white'
      )">
        {{ cardDisplay }}
      </div>
      <div v-if="resultDisplay" class="text-[9px] text-slate-600 dark:text-slate-400">
        {{ resultDisplay }}
      </div>
    </div>

    <!-- Game State Summary -->
    <div class="grid grid-cols-2 gap-2 text-[9px] font-mono">
      <div class="flex items-center justify-between rounded bg-slate-500/10 px-2 py-1 dark:bg-white/[0.03]">
        <span class="text-slate-600 dark:text-slate-400">Hand:</span>
        <span class="font-bold text-slate-800 dark:text-slate-200">{{ entry.snapshot.playerHand.length }}</span>
      </div>
      <div class="flex items-center justify-between rounded bg-slate-500/10 px-2 py-1 dark:bg-white/[0.03]">
        <span class="text-slate-600 dark:text-slate-400">Score:</span>
        <span class="font-bold text-slate-800 dark:text-slate-200">{{ entry.snapshot.playerScore }}</span>
      </div>
      <div class="flex items-center justify-between rounded bg-slate-500/10 px-2 py-1 dark:bg-white/[0.03]">
        <span class="text-slate-600 dark:text-slate-400">Opp Hand:</span>
        <span class="font-bold text-slate-800 dark:text-slate-200">{{ entry.snapshot.opponentHandCount }}</span>
      </div>
      <div class="flex items-center justify-between rounded bg-slate-500/10 px-2 py-1 dark:bg-white/[0.03]">
        <span class="text-slate-600 dark:text-slate-400">Center:</span>
        <span class="font-bold text-slate-800 dark:text-slate-200">
          {{ entry.snapshot.centerCard ? entry.snapshot.centerCard.element : 'empty' }}
        </span>
      </div>
    </div>

    <!-- Clickable Hint -->
    <div v-if="isClickable" class="mt-2 flex items-center justify-center gap-1 rounded bg-sky-500/10 px-2 py-1">
      <span class="text-[8px] font-black uppercase text-sky-600 dark:text-sky-400">
        Click to ask AI / 点击问AI
      </span>
    </div>
  </div>
</template>

<style scoped></style>
