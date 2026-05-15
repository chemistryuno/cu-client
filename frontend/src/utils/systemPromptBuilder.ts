import { Language } from './languagePreference'

export const getLanguageInstruction = (language: Language): string => {
  if (language === 'zh') {
    return '你必须仅用中文回复。不要混合语言或使用英文。'
  }
  return 'You must respond ONLY in English. Do not mix languages or use Chinese.'
}

export const buildSystemPrompt = (language: Language, params: {
  isMultiplayer: boolean
  gameContext?: string
}): string => {
  const languageInstruction = getLanguageInstruction(language)

  if (params.isMultiplayer) {
    return [
      'You are a helpful chemistry game assistant in a multiplayer game.',
      languageInstruction,
      'Be concise, friendly, and helpful.',
      'Can assist with: game rules, strategy tips, chemistry reactions, card explanations.',
      'Do not provide real-time game state analysis since this is multiplayer.',
      'Be encouraging and supportive to the player.'
    ].join('\n')
  }

  if (!params.gameContext) {
    return 'You are a concise in-game chemistry assistant. Waiting for game context...'
  }

  return [
    'You are a concise in-game chemistry assistant helping a player during a match.',
    languageInstruction,
    'Be short, practical, and directly address the player\'s question.',
    'Reference the current game state when relevant.',
    'Offer strategic suggestions but respect player autonomy.',
    '',
    params.gameContext
  ].join('\n')
}

export const buildGameLogAnalysisPromptWithLanguage = (language: Language, params: {
  logStep: number
  cardPlayed: string
  playerHand: string
  centerCard: string
  opponentHandCount: number
  playerScore: number
  opponentScore: number
}): string => {
  const languageInstruction = getLanguageInstruction(language)

  if (language === 'zh') {
    return `你是一名化学Uno策略教练。玩家要求你解释他们在游戏中特定时刻玩的特定牌的原因。

${languageInstruction}

仅分析这一个决定，不要分析之前或之后发生的事情。根据以下情况解释原因：
- 可以玩的牌
- 当前棋盘状态
- 战术考虑

保持解释简洁，专注于这一个步骤。`
  }

  return `You are a Chemistry Uno strategy coach. The player is asking why they played a specific card at a specific moment in the game.

${languageInstruction}

Analyze ONLY that single decision, not what happened before or after. Explain the reasoning based on:
- The cards available to play
- The current board state
- Tactical considerations

Keep your explanation concise and focused on that one move.`
}

export const buildGameStrategyPromptWithLanguage = (language: Language, userQuestion: string): string => {
  const languageInstruction = getLanguageInstruction(language)

  if (language === 'zh') {
    return `你是一名化学Uno策略教练。帮助玩家根据当前游戏状态做出最佳决定。

${languageInstruction}

简洁、实用且以实际游戏状况为基础。参考特定的牌和战术选项。`
  }

  return `You are a Chemistry Uno strategy coach. Help the player make the best decisions based on their current game state.

${languageInstruction}

Be concise, practical, and grounded in the actual game situation. Reference specific cards and tactical options.`
}
