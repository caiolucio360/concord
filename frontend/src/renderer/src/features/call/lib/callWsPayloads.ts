import type { CallUserInfo } from '../store/callStore'

// Payloads dos eventos call:* do WS que o callStore trata. Extraído do callStore.

export interface InvitePayload {
  call_id: string
  type: string
  initiator: CallUserInfo
  conversation_id?: string | null
}

export interface RingPayload {
  call_id: string
  callee: CallUserInfo
}

export interface ResponsePayload {
  call_id: string
  user: CallUserInfo
}

export interface StatePayload {
  call_id: string
  user: CallUserInfo
}

export interface ScreenSharePayload {
  call_id: string
  user: CallUserInfo
  active: boolean
}

export interface VoicePayload {
  call_id: string
  user_id: string
  muted: boolean
  deafened: boolean
  /** Impostos por um moderador (silenciar/ensurdecer no servidor). */
  server_muted?: boolean
  server_deafened?: boolean
}

export interface EndedPayload {
  call_id: string
}
