import type { GameSessionSaveState, GameSessionMetadata } from '../types/gameSaveState'

const DB_NAME = 'cu-game-sessions'
const DB_VERSION = 1
const STORE_NAME = 'sessions'
const METADATA_KEY = 'session-metadata'

let db: IDBDatabase | null = null

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db)
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

export const saveGameSession = async (
  gameState: GameSessionSaveState['gameState'],
  userId: number,
  status: 'in_progress' | 'paused' | 'completed' = 'in_progress',
  roomInfo?: GameSessionSaveState['roomInfo']
): Promise<string> => {
  try {
    const database = await initDB()
    const sessionId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const saveState: GameSessionSaveState = {
      id: sessionId,
      userId,
      timestamp: Date.now(),
      status,
      gameState,
      roomInfo,
    }

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.add(saveState)

      request.onsuccess = () => {
        updateMetadataIndex(userId)
        resolve(sessionId)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Failed to save game session:', error)
    throw error
  }
}

export const loadGameSession = async (sessionId: string): Promise<GameSessionSaveState | null> => {
  try {
    const database = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(sessionId)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Failed to load game session:', error)
    return null
  }
}

export const listUserSessions = async (userId: number): Promise<GameSessionMetadata[]> => {
  try {
    const database = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        const sessions = (request.result as GameSessionSaveState[])
          .filter((s) => s.userId === userId)
          .map((s) => ({
            id: s.id,
            userId: s.userId,
            timestamp: s.timestamp,
            gameMode: s.gameState.gameMode,
            status: s.status,
            roomName: s.roomInfo?.name,
            playerCount: s.roomInfo?.current_players?.length,
          }))
          .sort((a, b) => b.timestamp - a.timestamp)

        resolve(sessions)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Failed to list user sessions:', error)
    return []
  }
}

export const getActiveGames = async (userId: number): Promise<GameSessionMetadata[]> => {
  try {
    const allSessions = await listUserSessions(userId)
    return allSessions.filter((s) => s.status === 'in_progress' || s.status === 'paused')
  } catch (error) {
    console.error('Failed to get active games:', error)
    return []
  }
}

export const deleteGameSession = async (sessionId: string): Promise<boolean> => {
  try {
    const database = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(sessionId)

      request.onsuccess = () => resolve(true)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Failed to delete game session:', error)
    return false
  }
}

const updateMetadataIndex = (userId: number) => {
  listUserSessions(userId).then((sessions) => {
    localStorage.setItem(`${METADATA_KEY}-${userId}`, JSON.stringify(sessions))
  })
}

export const getStorageInfo = async (): Promise<{ used: number; quota: number }> => {
  if (!navigator.storage?.estimate) {
    return { used: 0, quota: 0 }
  }

  const estimate = await navigator.storage.estimate()
  return {
    used: estimate.usage || 0,
    quota: estimate.quota || 0,
  }
}

export const cleanupOldSessions = async (userId: number, maxSessions: number = 5) => {
  const sessions = await listUserSessions(userId)
  if (sessions.length > maxSessions) {
    const toDelete = sessions.slice(maxSessions)
    for (const session of toDelete) {
      await deleteGameSession(session.id)
    }
  }
}

export const checkStorageQuota = async (): Promise<boolean> => {
  const { used, quota } = await getStorageInfo()
  const usagePercent = (used / quota) * 100
  return usagePercent > 90
}

