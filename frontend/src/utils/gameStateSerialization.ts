import type { GameSessionSaveState, GameStateSnapshot, AIConfig } from '../types/gameSaveState'
import type { CardInfo } from '../types/gameLog'

export const serializeGameState = (componentState: any): GameStateSnapshot => {
  return {
    boardSubstances: componentState.availableSubstances || [],
    aiConfigs: (componentState.playersInfo || []).map((player: any) => ({
      id: player.uid || player.id || '',
      name: player.username || `Player ${player.uid}`,
      difficulty: player.difficulty || 'normal',
      completed: player.is_ready || false,
    })),
    aiCompletionStatus: Object.fromEntries(
      (componentState.playersInfo || []).map((player: any) => [player.uid || player.id || '', player.is_ready || false])
    ),
    playerHand: componentState.gameState?.player_card_list || [],
    currentTurn: componentState.gameState?.current_player === 0 ? 'player' : 'ai',
    gameMode: 'single_player',
    playerScore: componentState.gameState?.score_player || 0,
    opponentScore: componentState.gameState?.score_opponent || 0,
    centerCard: componentState.gameState?.center_card || null,
  }
}

export const deserializeGameState = (saveState: GameStateSnapshot, currentComponentState: any): any => {
  return {
    ...currentComponentState,
    availableSubstances: saveState.boardSubstances,
    gameState: {
      ...currentComponentState.gameState,
      player_card_list: saveState.playerHand,
      score_player: saveState.playerScore,
      score_opponent: saveState.opponentScore,
      center_card: saveState.centerCard,
      current_player: saveState.currentTurn === 'player' ? 0 : 1,
    },
    playersInfo: saveState.aiConfigs.map((config: AIConfig) => ({
      uid: config.id,
      username: config.name,
      difficulty: config.difficulty,
      is_ready: saveState.aiCompletionStatus[config.id] || false,
    })),
  }
}
