<template>
  <div class="fixed bottom-4 right-4 z-[110]">
    <button
      v-if="!showPanel"
      @click="showPanel = true"
      class="console-button console-button-primary h-12 w-12 rounded-2xl p-0 shadow-xl shadow-sky-900/20 hover:scale-[1.03] dark:text-slate-950"
    >
      <Settings class="h-5 w-5" />
    </button>

    <transition name="panel">
      <div
        v-if="showPanel"
        class="console-card animate-in slide-in-from-bottom-2 w-80 p-4 backdrop-blur"
      >
        <div class="mb-4 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="console-page-icon h-9 w-9 rounded-xl text-sky-600 dark:text-sky-300">
              <Settings class="h-4 w-4" />
            </div>
            <div>
              <p class="console-eyebrow">Feedback</p>
              <h3 class="text-base font-black text-slate-900 dark:text-white">反馈设置</h3>
            </div>
          </div>
          <button
            @click="showPanel = false"
            class="console-button console-button-ghost p-2"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="space-y-3">
          <div class="console-subcard flex items-center justify-between p-3">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-500/15 bg-sky-500/10">
                <Volume2 v-if="settings.soundEnabled" class="h-5 w-5 text-sky-500" />
                <VolumeX v-else class="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <p class="text-sm font-bold text-slate-800 dark:text-white">音效</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">操作提示音</p>
              </div>
            </div>
            <button
              @click="toggleSound"
              :class="[
                'relative h-6 w-12 rounded-full transition-colors',
                settings.soundEnabled ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-600'
              ]"
            >
              <div
                :class="[
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform',
                  settings.soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
                ]"
              />
            </button>
          </div>

          <div
            v-if="settings.soundEnabled"
            class="console-subcard animate-in slide-in-from-top-1 p-3"
          >
            <div class="mb-2 flex items-center justify-between">
              <span class="text-xs font-bold text-slate-600 dark:text-slate-400">音量</span>
              <span class="text-xs font-mono font-bold text-sky-500">{{ Math.round(settings.volume * 100) }}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              :value="settings.volume * 100"
              @input="updateVolume"
              class="h-2 w-full appearance-none cursor-pointer rounded-full bg-slate-200 dark:bg-slate-700
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                     [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-500 [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform
                     [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
                     [&::-moz-range-thumb]:bg-sky-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
            />
          </div>

          <div class="console-subcard flex items-center justify-between p-3">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/15 bg-cyan-500/10">
                <Smartphone v-if="settings.vibrationEnabled" class="h-5 w-5 text-cyan-500" />
                <SmartphoneNfc v-else class="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <p class="text-sm font-bold text-slate-800 dark:text-white">震动</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">触觉反馈</p>
              </div>
            </div>
            <button
              @click="toggleVibration"
              :class="[
                'relative h-6 w-12 rounded-full transition-colors',
                settings.vibrationEnabled ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-600'
              ]"
            >
              <div
                :class="[
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform',
                  settings.vibrationEnabled ? 'translate-x-6' : 'translate-x-0.5'
                ]"
              />
            </button>
          </div>

          <button
            @click="testFeedback"
            class="console-button console-button-primary w-full justify-center py-3 dark:text-slate-950"
          >
            <Play class="h-4 w-4" />
            测试反馈效果
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Play, Settings, Smartphone, SmartphoneNfc, Volume2, VolumeX, X } from 'lucide-vue-next'
import feedback from '../utils/feedback'
import { DEFAULT_FEEDBACK_VOLUME } from '../utils/audioEngine'

const showPanel = ref(false)
const settings = ref({
  soundEnabled: true,
  vibrationEnabled: true,
  volume: DEFAULT_FEEDBACK_VOLUME
})

onMounted(() => {
  settings.value = feedback.getSettings()
})

const toggleSound = () => {
  settings.value.soundEnabled = !settings.value.soundEnabled
  feedback.setSoundEnabled(settings.value.soundEnabled)
  if (settings.value.soundEnabled) {
    feedback.playSound('success')
  }
}

const toggleVibration = () => {
  settings.value.vibrationEnabled = !settings.value.vibrationEnabled
  feedback.setVibrationEnabled(settings.value.vibrationEnabled)
  if (settings.value.vibrationEnabled) {
    feedback.vibrate('medium')
  }
}

const updateVolume = (event: Event) => {
  const target = event.target as HTMLInputElement
  const volume = parseInt(target.value) / 100
  settings.value.volume = volume
  feedback.setVolume(volume)
}

const testFeedback = () => {
  console.log('[测试] 触发反馈测试')
  feedback.diagnoseVibration()
  feedback.feedback({
    sound: 'success',
    vibration: 'success'
  })
}
</script>

<style scoped>
.panel-enter-active,
.panel-leave-active {
  transition: all 0.24s ease;
}

.panel-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.97);
}

.panel-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}
</style>
