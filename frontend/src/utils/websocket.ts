import { OFFLINE_MODE, WS_URL } from './runtimeConfig'
import { offlineSocket } from './offlineBackend'

interface WebSocketMessage {
  type: string
  [key: string]: any
}

class WebSocketService {
  private ws: WebSocket | null = null
  private listeners: { [key: string]: Array<(message: WebSocketMessage) => void> } = {}
  private offlineUnsubscribers: { [key: string]: (() => void) | undefined } = {}
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 5
  private pendingMessages: WebSocketMessage[] = []
  private isConnecting = false
  private networkEventsBound = false
  private currentRoomId: string | null = null

  private bindNetworkEvents(): void {
    if (this.networkEventsBound) return
    this.networkEventsBound = true

    window.addEventListener('offline', () => {
      console.log('[WebSocket] Browser offline, connection will retry when network returns')
    })

    window.addEventListener('online', () => {
      console.log('[WebSocket] Browser back online')
      if (!this.isConnected() && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.connect()
      }
    })
  }

  connect(): void {
    if (OFFLINE_MODE) {
      this.bindNetworkEvents()
      this.isConnecting = false
      this.reconnectAttempts = 0
      return
    }

    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return
    }

    this.bindNetworkEvents()
    this.isConnecting = true
    this.ws = new WebSocket(WS_URL)

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      this.isConnecting = false
      while (this.pendingMessages.length > 0) {
        const message = this.pendingMessages.shift()
        if (message) this.send(message)
      }
    }

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        this.handleMessage(JSON.parse(event.data))
      } catch (error) {
        console.error('[WebSocket] failed to parse message:', error)
      }
    }

    this.ws.onclose = () => {
      this.isConnecting = false
      this.attemptReconnect()
    }

    this.ws.onerror = (error: Event) => {
      console.error('[WebSocket] error:', error)
      this.isConnecting = false
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts += 1
      setTimeout(() => this.connect(), 3000)
    }
  }

  disconnect(): void {
    if (OFFLINE_MODE) {
      this.isConnecting = false
      return
    }

    this.reconnectAttempts = this.maxReconnectAttempts
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.isConnecting = false
  }

  send(message: WebSocketMessage): void {
    if (OFFLINE_MODE) {
      if (message.type === 'chat' && this.currentRoomId) {
        offlineSocket.sendRoomChat(this.currentRoomId, String(message.message || ''))
      } else if (message.type === 'private_chat') {
        this.handleMessage({
          type: 'chat',
          data: {
            uid: 0,
            username: 'system',
            nickname: '离线系统',
            avatar: '???',
            message: '纯离线模式下未启用跨用户私聊。',
            created_at: new Date().toISOString()
          }
        })
      }
      return
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
      return
    }

    this.pendingMessages.push(message)
    if (!this.isConnecting) {
      this.connect()
    }
  }

  on(event: string, callback: (message: WebSocketMessage) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(callback)

    if (OFFLINE_MODE && !this.offlineUnsubscribers[event]) {
      this.offlineUnsubscribers[event] = offlineSocket.on(event, (message) => this.handleMessage(message))
    }
  }

  off(event: string, callback: (message: WebSocketMessage) => void): void {
    if (!this.listeners[event]) return
    this.listeners[event] = this.listeners[event].filter((item) => item !== callback)
    if (OFFLINE_MODE && this.listeners[event].length === 0 && this.offlineUnsubscribers[event]) {
      this.offlineUnsubscribers[event]?.()
      delete this.offlineUnsubscribers[event]
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    const handlers = this.listeners[message.type] || []
    handlers.forEach((handler) => {
      try {
        handler(message)
      } catch (error) {
        console.error(`[WebSocket] handler error for ${message.type}:`, error)
      }
    })
  }

  joinRoom(roomId: string): void {
    this.currentRoomId = roomId
    this.send({ type: 'join_room', room_id: roomId })
  }

  leaveRoom(): void {
    this.currentRoomId = null
    this.send({ type: 'leave_room' })
  }

  sendChat(message: string): void {
    this.send({ type: 'chat', message })
  }

  isConnected(): boolean {
    if (OFFLINE_MODE) return true
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}

export default new WebSocketService()

