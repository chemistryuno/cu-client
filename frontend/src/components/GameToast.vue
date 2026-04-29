<template>
  <Teleport to="body">
    <div class="game-notification-layer">
      <div v-if="statusNotice" class="notice-status-shell">
        <div :class="['notice-status-card', `tone-${statusNotice.type}`]">
          <div class="notice-status-icon">{{ iconMap[statusNotice.type] }}</div>
          <div class="notice-status-copy">
            <p v-if="statusNotice.title" class="notice-status-label">{{ statusNotice.title }}</p>
            <p class="notice-status-text">{{ statusNotice.message }}</p>
          </div>
        </div>
      </div>

      <div ref="eventStackRef" class="notice-event-stack">
        <TransitionGroup name="notice-event" tag="div" class="notice-event-group">
          <div
            v-for="toast in eventToasts"
            :key="toast.id"
            :class="['notice-event-card', `tone-${toast.type}`]"
            @click="dismissToast(toast.id)"
          >
            <div class="notice-event-mark">{{ iconMap[toast.type] }}</div>
            <div class="notice-event-copy">
              <div v-if="toast.title" class="notice-event-title">{{ toast.title }}</div>
              <div class="notice-event-message">{{ toast.message }}</div>
            </div>
            <div class="notice-event-timer" :style="{ animationDuration: `${toast.duration}ms` }"></div>
          </div>
        </TransitionGroup>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import gsap from 'gsap'

type ToastTone = 'info' | 'success' | 'warning' | 'error'

interface EventToast {
  id: number
  type: ToastTone
  title?: string
  message: string
  duration: number
}

interface StatusNotice {
  type: ToastTone
  title?: string
  message: string
}

const eventToasts = ref<EventToast[]>([])
const statusNotice = ref<StatusNotice | null>(null)
const eventStackRef = ref<HTMLElement | null>(null)
const hasVisibleNotices = computed(() => eventToasts.value.length > 0 || statusNotice.value !== null)
const iconMap: Record<ToastTone, string> = {
  info: 'i',
  success: '+',
  warning: '!',
  error: 'x',
}

let toastId = 0

const syncSafeArea = () => {
  if (typeof document === 'undefined') return
  document.body.classList.toggle('game-toast-safe-area', hasVisibleNotices.value)
}

watch(hasVisibleNotices, syncSafeArea, { immediate: true })

onMounted(() => {
  syncSafeArea()
})

onUnmounted(() => {
  if (typeof document === 'undefined') return
  document.body.classList.remove('game-toast-safe-area')
})

const animateStack = () => {
  if (!eventStackRef.value) return
  const cards = Array.from(eventStackRef.value.querySelectorAll('.notice-event-card'))
  if (!cards.length) return

  gsap.fromTo(
    cards,
    { y: -10, opacity: 0, scale: 0.98 },
    {
      y: 0,
      opacity: 1,
      scale: 1,
      duration: 0.22,
      ease: 'power2.out',
      stagger: 0.035,
      overwrite: 'auto',
    },
  )
}

const showToast = (
  message: string,
  title?: string,
  type: ToastTone = 'info',
  duration: number = 3600,
) => {
  const id = ++toastId

  eventToasts.value.unshift({
    id,
    type,
    title,
    message,
    duration,
  })

  if (eventToasts.value.length > 4) {
    eventToasts.value = eventToasts.value.slice(0, 4)
  }

  void nextTick(() => animateStack())

  window.setTimeout(() => {
    dismissToast(id)
  }, duration)
}

const dismissToast = (id: number) => {
  eventToasts.value = eventToasts.value.filter((toast) => toast.id !== id)
}

const setStatus = (
  message: string,
  title?: string,
  type: ToastTone = 'info',
) => {
  statusNotice.value = { message, title, type }
}

const clearStatus = () => {
  statusNotice.value = null
}

defineExpose({
  showToast,
  dismissToast,
  setStatus,
  clearStatus,
})
</script>

<style scoped>
.game-notification-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 140;
}

.notice-status-shell {
  position: absolute;
  top: 0.9rem;
  left: 50%;
  transform: translateX(-50%);
  width: min(42rem, calc(100vw - 2rem));
}

.notice-status-card {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-height: 3.25rem;
  padding: 0.8rem 1rem;
  border-radius: 1.2rem;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 22px 48px -34px rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(20px) saturate(140%);
}

.notice-status-icon,
.notice-event-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.8rem;
  height: 1.8rem;
  flex-shrink: 0;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  background: rgba(255, 255, 255, 0.72);
}

.notice-status-copy,
.notice-event-copy {
  min-width: 0;
  flex: 1;
}

.notice-status-label,
.notice-event-title {
  margin: 0 0 0.15rem;
  font-size: 0.62rem;
  line-height: 1;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(71, 85, 105, 0.92);
}

.notice-status-text,
.notice-event-message {
  margin: 0;
  color: #0f172a;
  font-weight: 700;
  line-height: 1.35;
}

.notice-status-text {
  font-size: 0.92rem;
}

.notice-event-message {
  font-size: 0.82rem;
}

.notice-event-stack {
  position: absolute;
  top: 4.8rem;
  right: 1rem;
  width: min(22rem, calc(100vw - 1.5rem));
}

.notice-event-group {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.notice-event-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  padding: 0.8rem 0.9rem 0.9rem;
  border-radius: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(248, 250, 252, 0.9);
  box-shadow: 0 18px 38px -30px rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(18px) saturate(145%);
  overflow: hidden;
  cursor: pointer;
  pointer-events: auto;
}

.notice-event-timer {
  position: absolute;
  left: 0.8rem;
  right: 0.8rem;
  bottom: 0;
  height: 2px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.22;
  transform-origin: left center;
  animation: notice-timer linear forwards;
}

.tone-info {
  color: #0369a1;
}

.tone-success {
  color: #15803d;
}

.tone-warning {
  color: #c2410c;
}

.tone-error {
  color: #b91c1c;
}

.tone-info.notice-status-card,
.tone-info.notice-event-card {
  border-color: rgba(14, 165, 233, 0.24);
  background: linear-gradient(180deg, rgba(240, 249, 255, 0.92), rgba(239, 246, 255, 0.82));
}

.tone-success.notice-status-card,
.tone-success.notice-event-card {
  border-color: rgba(34, 197, 94, 0.22);
  background: linear-gradient(180deg, rgba(240, 253, 244, 0.92), rgba(236, 253, 245, 0.82));
}

.tone-warning.notice-status-card,
.tone-warning.notice-event-card {
  border-color: rgba(249, 115, 22, 0.24);
  background: linear-gradient(180deg, rgba(255, 247, 237, 0.94), rgba(255, 237, 213, 0.82));
}

.tone-error.notice-status-card,
.tone-error.notice-event-card {
  border-color: rgba(248, 113, 113, 0.26);
  background: linear-gradient(180deg, rgba(254, 242, 242, 0.94), rgba(254, 226, 226, 0.84));
}

.notice-event-enter-active,
.notice-event-leave-active {
  transition: opacity 180ms ease, transform 220ms ease;
}

.notice-event-enter-from,
.notice-event-leave-to {
  opacity: 0;
  transform: translateY(-0.45rem);
}

@keyframes notice-timer {
  from {
    transform: scaleX(1);
  }

  to {
    transform: scaleX(0);
  }
}

.dark .notice-status-card {
  background: rgba(11, 20, 32, 0.9);
  border-color: rgba(148, 163, 184, 0.16);
}

.dark .notice-event-card {
  background: rgba(10, 19, 29, 0.92);
  border-color: rgba(148, 163, 184, 0.14);
}

.dark .notice-status-icon,
.dark .notice-event-mark {
  background: rgba(15, 23, 42, 0.74);
}

.dark .notice-status-label,
.dark .notice-event-title {
  color: rgba(148, 163, 184, 0.88);
}

.dark .notice-status-text,
.dark .notice-event-message {
  color: #e2e8f0;
}

.dark .tone-info.notice-status-card,
.dark .tone-info.notice-event-card {
  background: linear-gradient(180deg, rgba(8, 47, 73, 0.9), rgba(12, 74, 110, 0.64));
}

.dark .tone-success.notice-status-card,
.dark .tone-success.notice-event-card {
  background: linear-gradient(180deg, rgba(20, 83, 45, 0.9), rgba(6, 78, 59, 0.62));
}

.dark .tone-warning.notice-status-card,
.dark .tone-warning.notice-event-card {
  background: linear-gradient(180deg, rgba(124, 45, 18, 0.92), rgba(154, 52, 18, 0.66));
}

.dark .tone-error.notice-status-card,
.dark .tone-error.notice-event-card {
  background: linear-gradient(180deg, rgba(127, 29, 29, 0.92), rgba(153, 27, 27, 0.66));
}

@media (max-width: 640px) {
  .notice-status-shell {
    top: 0.65rem;
    width: calc(100vw - 1rem);
  }

  .notice-status-card {
    min-height: 3rem;
    padding: 0.72rem 0.85rem;
    border-radius: 1rem;
  }

  .notice-event-stack {
    top: 4.35rem;
    right: 0.5rem;
    width: min(18rem, calc(100vw - 1rem));
  }

  .notice-event-card {
    padding: 0.72rem 0.78rem 0.85rem;
  }
}
</style>
