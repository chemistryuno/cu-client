<script setup lang="ts">
import { ref, watch } from 'vue'
import { useDialog } from '../utils/dialog'
import { AlertCircle, HelpCircle, MessageSquare } from 'lucide-vue-next'

const { state, handleConfirm, handleCancel } = useDialog()

const countdown = ref(0)
const timer = ref<ReturnType<typeof setInterval> | null>(null)
const isComposing = ref(false)

watch(() => state.show, (newVal) => {
  if (newVal && state.closeDelay > 0) {
    countdown.value = state.closeDelay
    if (timer.value) clearInterval(timer.value)
    timer.value = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        if (timer.value) clearInterval(timer.value)
        timer.value = null
      }
    }, 1000)
  } else {
    if (timer.value) clearInterval(timer.value)
    timer.value = null
    countdown.value = 0
  }
})

const handleInputKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !isComposing.value && countdown.value <= 0) {
    handleConfirm()
  }
}

const handleCompositionStart = () => {
  isComposing.value = true
}

const handleCompositionEnd = () => {
  isComposing.value = false
}

const iconClassByType: Record<string, string> = {
  alert: 'text-sky-600 dark:text-sky-300',
  confirm: 'text-amber-600 dark:text-amber-300',
  prompt: 'text-cyan-600 dark:text-cyan-300'
}

const iconShellClassByType: Record<string, string> = {
  alert: 'border-sky-500/20 bg-sky-500/10',
  confirm: 'border-amber-500/20 bg-amber-500/10',
  prompt: 'border-cyan-500/20 bg-cyan-500/10'
}

const confirmButtonClassByType: Record<string, string> = {
  alert: 'console-button-primary',
  confirm: 'border-amber-500/20 bg-amber-500/90 text-white hover:bg-amber-500 dark:bg-amber-500 dark:text-slate-950',
  prompt: 'border-cyan-500/20 bg-cyan-500/90 text-white hover:bg-cyan-500 dark:bg-cyan-500 dark:text-slate-950'
}
</script>

<template>
  <Transition name="fade">
    <div v-if="state.show" class="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div class="console-card animate-in zoom-in-95 flex w-full max-w-md flex-col overflow-hidden border p-6 sm:p-7">
        <div class="mb-6 flex items-center gap-4">
          <div :class="['flex h-12 w-12 items-center justify-center rounded-2xl border', iconShellClassByType[state.type]]">
            <AlertCircle v-if="state.type === 'alert'" :class="['h-6 w-6', iconClassByType[state.type]]" />
            <HelpCircle v-else-if="state.type === 'confirm'" :class="['h-6 w-6', iconClassByType[state.type]]" />
            <MessageSquare v-else-if="state.type === 'prompt'" :class="['h-6 w-6', iconClassByType[state.type]]" />
          </div>
          <div class="space-y-1">
            <p class="console-eyebrow">System Notice</p>
            <h3 class="text-xl font-black tracking-tight text-slate-900 dark:text-white">{{ state.title }}</h3>
          </div>
        </div>

        <div class="space-y-4">
          <p class="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">{{ state.message }}</p>

          <div v-if="state.type === 'prompt'" class="console-subcard p-3">
            <input
              v-model="state.inputValue"
              type="text"
              :placeholder="state.inputPlaceholder"
              class="console-input w-full rounded-xl border border-slate-200/80 bg-white px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]"
              @keydown="handleInputKeyDown"
              @compositionstart="handleCompositionStart"
              @compositionend="handleCompositionEnd"
              autofocus
            />
          </div>
        </div>

        <div class="mt-6 flex gap-3">
          <button
            v-if="state.type === 'confirm' || state.type === 'prompt'"
            @click="handleCancel"
            class="console-button flex-1 justify-center"
          >
            {{ state.cancelText }}
          </button>
          <button
            @click="handleConfirm"
            :disabled="countdown > 0"
            :class="['console-button flex-1 justify-center disabled:opacity-50 disabled:grayscale', confirmButtonClassByType[state.type]]"
          >
            {{ countdown > 0 ? `${state.confirmText} (${countdown}s)` : state.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style src="./CustomDialog.css" scoped></style>
