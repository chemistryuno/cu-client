import { offlineSocket } from './localRuntimeAdapter'

interface WebSocketMessage {
  type: string
  [key: string]: any
}

class WebSocketService {
  private listeners: { [key: string]: Array<(message: WebSocketMessage) => void> } = {}
  private offlineUnsubscribers: { [key: string]: (() => void) | undefined } = {}
  private currentRoomId: string | null = null

  connect(): void {}

  disconnect(): void {
    this.currentRoomId = null
  }

  send(message: WebSocketMessage): void {
    if (message.type === 'join_room') {
      this.currentRoomId = typeof message.room_id === 'string' ? message.room_id : null
      return
    }
    if (message.type === 'leave_room') {
      this.currentRoomId = null
      return
    }
    if (message.type === 'chat' && this.currentRoomId) {
      offlineSocket.sendRoomChat(this.currentRoomId, String(message.message || ''))
      return
    }
    if (message.type === 'private_chat') {
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
  }

  on(event: string, callback: (message: WebSocketMessage) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(callback)

    if (!this.offlineUnsubscribers[event]) {
      this.offlineUnsubscribers[event] = offlineSocket.on(event, (message) => this.handleMessage(message))
    }
  }

  off(event: string, callback: (message: WebSocketMessage) => void): void {
    if (!this.listeners[event]) return
    this.listeners[event] = this.listeners[event].filter((item) => item !== callback)
    if (this.listeners[event].length === 0 && this.offlineUnsubscribers[event]) {
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
    return true
  }
}

export default new WebSocketService()
