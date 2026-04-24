<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-vue-next'
import { gsap } from 'gsap'

interface TutorialStep {
  id: string
  titlePlaceholder: string
  contentPlaceholder: string
  targetSelector?: string
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  spotlightRadius?: number
}

interface SpotlightBox {
  left: number
  top: number
  width: number
  height: number
  borderRadius: number
}

interface TooltipLayout {
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'
  left: number
  top: number
  xPercent: number
  yPercent: number
}

const props = defineProps<{
  show: boolean
  steps?: TutorialStep[]
}>()

const emit = defineEmits<{
  close: []
  complete: []
}>()

const defaultSteps: TutorialStep[] = [
  {
    id: 'welcome',
    titlePlaceholder: '欢迎来到实验室',
    contentPlaceholder: '欢迎来到 Chemistry UNO。这是一场融合化学知识与策略的卡牌对战，接下来我会带你快速认识核心界面。',
    position: 'center'
  },
  {
    id: 'hand-cards',
    titlePlaceholder: '你的手牌区',
    contentPlaceholder: '这里会展示你当前持有的元素与化合物卡牌。点击卡牌可以选中，准备打出到场上。',
    targetSelector: '.hand-container-mobile',
    position: 'top',
    spotlightRadius: 180
  },
  {
    id: 'operation-area',
    titlePlaceholder: '操作区域',
    contentPlaceholder: '这里是你的操作中心。你可以输入化学式精确出牌，也可以点击摸牌来补充手牌。',
    targetSelector: '.operation-area',
    position: 'bottom',
    spotlightRadius: 200
  },
  {
    id: 'center-play',
    titlePlaceholder: '中央反应区',
    contentPlaceholder: '中央区域显示当前战场牌面。你需要打出可匹配的物质，或者利用化学反应改变局势。',
    targetSelector: '.center-play-area',
    position: 'bottom',
    spotlightRadius: 220
  },
  {
    id: 'complete',
    titlePlaceholder: '准备开始了吗',
    contentPlaceholder: '你已经掌握了基础区域和操作方式。接下来可以直接进入教学关卡，边玩边熟悉规则。',
    position: 'center'
  }
]

const tutorialSteps = computed(() => props.steps || defaultSteps)
const currentStep = ref(0)
const isVisible = ref(false)
const tooltipRef = ref<HTMLElement | null>(null)
const tooltipContentRef = ref<HTMLElement | null>(null)
const spotlightStyle = ref<SpotlightBox | null>(null)
const tooltipStyle = ref<TooltipLayout>({
  position: 'center',
  left: 0,
  top: 0,
  xPercent: -50,
  yPercent: -50
})
const activeTargetEl = ref<HTMLElement | null>(null)
const prefersReducedMotion = ref(false)
const fallbackStep: TutorialStep = {
  id: 'fallback',
  titlePlaceholder: '新手引导',
  contentPlaceholder: '暂无引导内容。',
  position: 'center'
}

const totalSteps = computed(() => Math.max(tutorialSteps.value.length, 1))
const currentStepData = computed(() => tutorialSteps.value[currentStep.value] || tutorialSteps.value[0] || fallbackStep)
const progressPercent = computed(() => {
  if (tutorialSteps.value.length <= 1) {
    return 100
  }
  return ((currentStep.value + 1) / tutorialSteps.value.length) * 100
})

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
const clampRange = (value: number, min: number, max: number) => clamp(value, Math.min(min, max), Math.max(min, max))

let motionMediaQuery: MediaQueryList | null = null
let tooltipContentTween: gsap.core.Tween | null = null

const updateReducedMotionPreference = () => {
  prefersReducedMotion.value = Boolean(motionMediaQuery?.matches)
}

const animateSpotlightBox = (nextSpotlight: SpotlightBox | null) => {
  if (!nextSpotlight) {
    if (spotlightStyle.value) {
      gsap.killTweensOf(spotlightStyle.value)
    }
    spotlightStyle.value = null
    return
  }

  if (!spotlightStyle.value || prefersReducedMotion.value) {
    spotlightStyle.value = { ...nextSpotlight }
    return
  }

  gsap.to(spotlightStyle.value, {
    left: nextSpotlight.left,
    top: nextSpotlight.top,
    width: nextSpotlight.width,
    height: nextSpotlight.height,
    borderRadius: nextSpotlight.borderRadius,
    duration: 0.5,
    ease: 'power3.out',
    overwrite: 'auto'
  })
}

const animateTooltipLayout = (nextLayout: TooltipLayout, immediate = false) => {
  tooltipStyle.value = nextLayout

  const tooltipEl = tooltipRef.value
  if (!tooltipEl) {
    return
  }

  gsap.killTweensOf(tooltipEl)

  if (prefersReducedMotion.value || immediate) {
    gsap.set(tooltipEl, {
      left: nextLayout.left,
      top: nextLayout.top,
      xPercent: nextLayout.xPercent,
      yPercent: nextLayout.yPercent,
      scale: 1,
      autoAlpha: 1
    })
    return
  }

  gsap.to(tooltipEl, {
    left: nextLayout.left,
    top: nextLayout.top,
    xPercent: nextLayout.xPercent,
    yPercent: nextLayout.yPercent,
    scale: 1,
    autoAlpha: 1,
    duration: 0.5,
    ease: 'power3.out',
    overwrite: 'auto'
  })
}

const animateTooltipContent = () => {
  const tooltipContentEl = tooltipContentRef.value
  if (!tooltipContentEl) {
    return
  }

  tooltipContentTween?.kill()

  if (prefersReducedMotion.value) {
    gsap.set(tooltipContentEl, { autoAlpha: 1, y: 0 })
    return
  }

  tooltipContentTween = gsap.fromTo(
    tooltipContentEl,
    { autoAlpha: 0, y: 18 },
    {
      autoAlpha: 1,
      y: 0,
      duration: 0.3,
      ease: 'power2.out',
      clearProps: 'transform'
    }
  )
}

const shouldIgnoreKeyboard = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  const tagName = target.tagName.toLowerCase()
  return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select'
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!isVisible.value || shouldIgnoreKeyboard(event.target)) {
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    skipTutorial()
    return
  }

  if (event.key === 'ArrowRight' || event.key === 'Enter') {
    event.preventDefault()
    void nextStep()
    return
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    void prevStep()
  }
}

const clearTargetHighlight = () => {
  if (!activeTargetEl.value) {
    return
  }
  activeTargetEl.value.classList.remove('tutorial-target-highlight')
  activeTargetEl.value = null
}

const applyTargetHighlight = (target: HTMLElement) => {
  if (activeTargetEl.value === target) {
    return
  }
  clearTargetHighlight()
  target.classList.add('tutorial-target-highlight')
  activeTargetEl.value = target
}

const getCenterLayout = (): TooltipLayout => ({
  position: 'center',
  left: window.innerWidth / 2,
  top: window.innerHeight / 2,
  xPercent: -50,
  yPercent: -50
})

const calculateSpotlight = async (options?: { immediate?: boolean, animateContent?: boolean }) => {
  await nextTick()

  const step = tutorialSteps.value[currentStep.value]
  const immediate = Boolean(options?.immediate)
  const animateContentOnUpdate = options?.animateContent !== false

  if (!step.targetSelector) {
    clearTargetHighlight()
    animateTooltipLayout(getCenterLayout(), immediate)
    animateSpotlightBox(null)
    if (animateContentOnUpdate) {
      animateTooltipContent()
    }
    return
  }

  const targetCandidates = Array.from(document.querySelectorAll(step.targetSelector))
  const target = targetCandidates.find((el) => {
    const rect = (el as HTMLElement).getBoundingClientRect()
    return rect.width > 0 && rect.height > 0
  }) || targetCandidates[0]

  if (!target) {
    clearTargetHighlight()
    animateTooltipLayout(getCenterLayout(), immediate)
    animateSpotlightBox(null)
    if (animateContentOnUpdate) {
      animateTooltipContent()
    }
    return
  }

  const rect = target.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) {
    clearTargetHighlight()
    animateTooltipLayout(getCenterLayout(), immediate)
    animateSpotlightBox(null)
    if (animateContentOnUpdate) {
      animateTooltipContent()
    }
    return
  }

  applyTargetHighlight(target as HTMLElement)

  const highlightPadding = clamp(Math.round((step.spotlightRadius || 160) / 16), 8, 16)
  const boxWidth = rect.width + highlightPadding * 2
  const boxHeight = rect.height + highlightPadding * 2
  const dynamicRadius = clamp(Math.round(Math.min(boxWidth, boxHeight) * 0.14), 12, 26)

  animateSpotlightBox({
    left: rect.left + rect.width / 2,
    top: rect.top + rect.height / 2,
    width: boxWidth,
    height: boxHeight,
    borderRadius: dynamicRadius
  })

  const position = step.position || 'bottom'
  const tooltipOffset = 20
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const edgePadding = 16
  const tooltipEl = tooltipRef.value
  const tooltipMeasuredWidth = tooltipEl?.offsetWidth || 0
  const tooltipMeasuredHeight = tooltipEl?.offsetHeight || 0
  const tooltipEstimatedWidth = tooltipMeasuredWidth || Math.min(360, viewportWidth - edgePadding * 2)
  const tooltipEstimatedHeight = tooltipMeasuredHeight || 220

  let finalPosition = position
  let tooltipLeft = 0
  let tooltipTop = 0
  let xPercent = 0
  let yPercent = 0

  switch (position) {
    case 'top':
      tooltipLeft = rect.left + rect.width / 2
      tooltipTop = rect.top - tooltipOffset
      xPercent = -50
      yPercent = -100
      if (tooltipTop - tooltipEstimatedHeight < edgePadding) {
        finalPosition = 'bottom'
      }
      break
    case 'bottom':
      tooltipLeft = rect.left + rect.width / 2
      tooltipTop = rect.bottom + tooltipOffset
      xPercent = -50
      yPercent = 0
      if (tooltipTop + tooltipEstimatedHeight > viewportHeight - edgePadding) {
        finalPosition = 'top'
      }
      break
    case 'left':
      tooltipLeft = rect.left - tooltipOffset
      tooltipTop = rect.top + rect.height / 2
      xPercent = -100
      yPercent = -50
      if (tooltipLeft - tooltipEstimatedWidth < edgePadding) {
        finalPosition = 'right'
      }
      break
    case 'right':
      tooltipLeft = rect.right + tooltipOffset
      tooltipTop = rect.top + rect.height / 2
      xPercent = 0
      yPercent = -50
      if (tooltipLeft + tooltipEstimatedWidth > viewportWidth - edgePadding) {
        finalPosition = 'left'
      }
      break
    case 'center':
      animateTooltipLayout(getCenterLayout(), immediate)
      if (animateContentOnUpdate) {
        animateTooltipContent()
      }
      return
  }

  if (finalPosition !== position) {
    switch (finalPosition) {
      case 'top':
        tooltipLeft = rect.left + rect.width / 2
        tooltipTop = rect.top - tooltipOffset
        xPercent = -50
        yPercent = -100
        break
      case 'bottom':
        tooltipLeft = rect.left + rect.width / 2
        tooltipTop = rect.bottom + tooltipOffset
        xPercent = -50
        yPercent = 0
        break
      case 'left':
        tooltipLeft = rect.left - tooltipOffset
        tooltipTop = rect.top + rect.height / 2
        xPercent = -100
        yPercent = -50
        break
      case 'right':
        tooltipLeft = rect.right + tooltipOffset
        tooltipTop = rect.top + rect.height / 2
        xPercent = 0
        yPercent = -50
        break
      case 'center':
        animateTooltipLayout(getCenterLayout(), immediate)
        if (animateContentOnUpdate) {
          animateTooltipContent()
        }
        return
    }
  }

  const halfWidth = tooltipEstimatedWidth / 2
  const halfHeight = tooltipEstimatedHeight / 2

  switch (finalPosition) {
    case 'top':
      tooltipLeft = clampRange(tooltipLeft, edgePadding + halfWidth, viewportWidth - edgePadding - halfWidth)
      tooltipTop = clampRange(tooltipTop, edgePadding + tooltipEstimatedHeight, viewportHeight - edgePadding)
      break
    case 'bottom':
      tooltipLeft = clampRange(tooltipLeft, edgePadding + halfWidth, viewportWidth - edgePadding - halfWidth)
      tooltipTop = clampRange(tooltipTop, edgePadding, viewportHeight - edgePadding - tooltipEstimatedHeight)
      break
    case 'left':
      tooltipLeft = clampRange(tooltipLeft, edgePadding + tooltipEstimatedWidth, viewportWidth - edgePadding)
      tooltipTop = clampRange(tooltipTop, edgePadding + halfHeight, viewportHeight - edgePadding - halfHeight)
      break
    case 'right':
      tooltipLeft = clampRange(tooltipLeft, edgePadding, viewportWidth - edgePadding - tooltipEstimatedWidth)
      tooltipTop = clampRange(tooltipTop, edgePadding + halfHeight, viewportHeight - edgePadding - halfHeight)
      break
  }

  animateTooltipLayout({
    position: finalPosition,
    left: tooltipLeft,
    top: tooltipTop,
    xPercent,
    yPercent
  }, immediate)

  if (animateContentOnUpdate) {
    animateTooltipContent()
  }
}

const nextStep = async () => {
  if (currentStep.value < tutorialSteps.value.length - 1) {
    currentStep.value++
  } else {
    completeTutorial()
  }
}

const prevStep = async () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const skipTutorial = () => {
  emit('close')
  isVisible.value = false
}

const completeTutorial = () => {
  emit('complete')
  isVisible.value = false
}

watch(() => props.show, async (newVal) => {
  if (newVal) {
    isVisible.value = true
    currentStep.value = 0
    await nextTick()
    if (tooltipRef.value) {
      gsap.set(tooltipRef.value, {
        autoAlpha: 0,
        scale: prefersReducedMotion.value ? 1 : 0.96
      })
    }
    await calculateSpotlight({ immediate: true, animateContent: false })
    animateTooltipContent()
  } else {
    isVisible.value = false
    clearTargetHighlight()
    animateSpotlightBox(null)
    tooltipContentTween?.kill()
  }
}, { immediate: true })

watch(currentStep, () => {
  if (!isVisible.value) {
    return
  }
  void calculateSpotlight()
})

onMounted(() => {
  motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  updateReducedMotionPreference()
  motionMediaQuery.addEventListener('change', updateReducedMotionPreference)
  window.addEventListener('resize', calculateSpotlight)
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  motionMediaQuery?.removeEventListener('change', updateReducedMotionPreference)
  motionMediaQuery = null
  if (spotlightStyle.value) {
    gsap.killTweensOf(spotlightStyle.value)
  }
  if (tooltipRef.value) {
    gsap.killTweensOf(tooltipRef.value)
  }
  tooltipContentTween?.kill()
  window.removeEventListener('resize', calculateSpotlight)
  window.removeEventListener('keydown', handleKeydown)
  clearTargetHighlight()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="tutorial-fade">
      <div
        v-if="isVisible"
        class="tutorial-overlay fixed inset-0 z-[9999] bg-transparent pointer-events-none"
      >
        <Transition name="spotlight">
          <div
            v-if="spotlightStyle"
            class="tutorial-focus-box absolute pointer-events-none z-[10004]"
            :style="{
              left: `${spotlightStyle.left}px`,
              top: `${spotlightStyle.top}px`,
              width: `${spotlightStyle.width}px`,
              height: `${spotlightStyle.height}px`,
              borderRadius: `${spotlightStyle.borderRadius}px`,
              transform: 'translate(-50%, -50%)'
            }"
          >
            <div class="focus-box-ring"></div>
            <div class="focus-box-ring-secondary"></div>
            <div class="focus-box-glint"></div>
          </div>
        </Transition>

        <div
          v-if="currentStepData"
          ref="tooltipRef"
          class="tutorial-tooltip absolute pointer-events-auto z-[10005]"
        >
          <div class="tutorial-card relative w-[90vw] max-w-md sm:max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div ref="tooltipContentRef" class="relative p-5 sm:p-7">
              <div class="flex items-start justify-between gap-4 mb-5">
                <div class="flex items-start gap-3">
                  <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-cyan-400 dark:to-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/25 dark:shadow-cyan-500/30 shrink-0">
                    <Sparkles class="w-5 h-5 text-white" />
                  </div>
                  <div class="pt-0.5">
                    <p class="text-[10px] tracking-[0.12em] font-black text-slate-500 dark:text-slate-400 uppercase mb-1">Guide</p>
                    <h3 class="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                      {{ currentStepData.titlePlaceholder }}
                    </h3>
                  </div>
                </div>
                <button
                  @click="skipTutorial"
                  aria-label="关闭引导"
                  class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center transition-colors border border-slate-200 dark:border-slate-700"
                >
                  <X class="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </button>
              </div>

              <div class="mb-6">
                <div class="mb-2 flex items-center justify-between text-[11px] font-bold">
                  <span class="px-2 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">STEP {{ currentStep + 1 }} / {{ totalSteps }}</span>
                  <span class="text-slate-500 dark:text-slate-400">{{ Math.round(progressPercent) }}%</span>
                </div>
                <div class="h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-700/70 overflow-hidden">
                  <div
                    class="h-full rounded-full bg-slate-700 dark:bg-slate-300 transition-[width] duration-500 ease-out"
                    :style="{ width: `${progressPercent}%` }"
                  ></div>
                </div>
              </div>

              <p class="text-slate-700 dark:text-slate-200 text-[0.95rem] sm:text-base leading-7 mb-5">
                {{ currentStepData.contentPlaceholder }}
              </p>

              <div class="mb-6 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span class="truncate">键盘：← / → 切换</span>
                <span>Esc 跳过引导</span>
              </div>

              <div class="flex items-center justify-between gap-3 sm:gap-4">
                <button
                  v-if="currentStep > 0"
                  @click="prevStep"
                  class="min-h-[44px] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm transition-colors border border-slate-200 dark:border-slate-700"
                >
                  <ChevronLeft class="w-4 h-4" />
                  <span>上一步</span>
                </button>
                <button
                  v-else
                  @click="skipTutorial"
                  class="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold text-sm transition-colors border border-slate-200 dark:border-slate-700"
                >
                  跳过引导
                </button>

                <button
                  @click="nextStep"
                  class="min-h-[44px] flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-200 dark:hover:bg-white text-white dark:text-slate-900 font-black text-sm transition-colors"
                >
                  <span>{{ currentStep === tutorialSteps.length - 1 ? '开始体验' : '下一步' }}</span>
                  <ChevronRight v-if="currentStep < tutorialSteps.length - 1" class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped src="./TutorialGuide.css"></style>
