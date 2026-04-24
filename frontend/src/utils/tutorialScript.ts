/**
 * 教学关卡脚本配置
 * 定义固定的出牌顺序和提示
 */

export interface TutorialStep {
  stepNumber: number
  player: 'human' | 'ai'
  action: 'play' | 'double' | 'draw'
  substance?: string
  substances?: string[]
  hint: string
  aiMessage?: string
}

export const TUTORIAL_SCRIPT: TutorialStep[] = [
  {
    stepNumber: 1,
    player: 'human',
    action: 'play',
    substance: 'Mg',
    hint: '💡 第一步：从手牌中选择 <strong>Mg</strong>（镁）打出，它可以和场上的 <strong>Cl2</strong> 反应生成 MgCl2。'
  },
  {
    stepNumber: 2,
    player: 'ai',
    action: 'play',
    substance: 'HCl',
    hint: '⏳ 现在轮到 AI，它会打出 <strong>HCl</strong>（盐酸）作为下一步演示。',
    aiMessage: 'AI 打出了 HCl（盐酸）'
  },
  {
    stepNumber: 3,
    player: 'human',
    action: 'play',
    substance: 'NaOH',
    hint: '💡 第二步：使用 <strong>Na</strong>、<strong>O</strong>、<strong>H</strong> 组合成 <strong>NaOH</strong>（氢氧化钠），与 AI 的 HCl 中和。'
  },
  {
    stepNumber: 4,
    player: 'ai',
    action: 'play',
    substance: 'Br2',
    hint: '⏳ AI 会继续打出 <strong>Br2</strong>（溴单质），观察战场变化。',
    aiMessage: 'AI 打出了 Br2（溴单质）'
  },
  {
    stepNumber: 5,
    player: 'human',
    action: 'play',
    substance: 'Ar',
    hint: '💡 第三步：打出 <strong>Ar</strong>（氩气），触发稀有气体的稳定效果并跳过 AI。'
  },
  {
    stepNumber: 6,
    player: 'ai',
    action: 'draw',
    hint: '⏳ AI 无法响应当前局面，将执行摸牌。',
    aiMessage: 'AI 选择摸牌'
  },
  {
    stepNumber: 7,
    player: 'human',
    action: 'play',
    substance: 'Au',
    hint: '💡 第四步：打出 <strong>Au</strong>（金），它会触发跳过效果，帮助你掌握特殊牌。'
  },
  {
    stepNumber: 8,
    player: 'human',
    action: 'play',
    substance: '+2',
    hint: '💡 最后一步：打出 <strong>+2</strong>，完成本次教学关卡！'
  }
]

export const TUTORIAL_TOTAL_STEPS = TUTORIAL_SCRIPT.length

export interface TutorialInitialState {
  humanHand: string[]
  aiHand: string[]
  discardTop: string
}

export const TUTORIAL_INITIAL_STATE: TutorialInitialState = {
  humanHand: ['Mg', 'Na', 'O', 'H', 'Ar', 'Au', '+2'],
  aiHand: ['H', 'Cl', 'Br', 'Br', 'Mn', 'Fe', 'Zn'],
  discardTop: 'Cl2'
}

export const getTutorialStep = (stepNumber: number): TutorialStep | undefined => {
  return TUTORIAL_SCRIPT.find((step) => step.stepNumber === stepNumber)
}

export const canPlaySubstance = (substance: string, currentStep: number): boolean => {
  const step = getTutorialStep(currentStep)
  if (!step || step.player !== 'human') return false
  return step.substance === substance
}

export const getTutorialProgress = (currentStep: number): string => {
  const totalSteps = TUTORIAL_SCRIPT.filter((s) => s.player === 'human').length
  const completedSteps = TUTORIAL_SCRIPT.filter((s) =>
    s.player === 'human' && s.stepNumber < currentStep
  ).length
  return `${completedSteps}/${totalSteps}`
}
