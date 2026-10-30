import { describe, expect, it } from 'vitest'
import { queueTarget, QUEUE_NEEDS_CALL } from './queueTarget'

describe('queueTarget', () => {
  it('em call de canal de um servidor: o servidor da call', () => {
    expect(queueTarget({ status: 'active', type: 'channel', serverId: 's1' })).toEqual({
      serverId: 's1'
    })
  })

  it.each([
    ['sem call', { status: 'idle', type: null, serverId: null }],
    ['tocando', { status: 'ringing', type: 'channel', serverId: 's1' }],
    ['call de DM', { status: 'active', type: 'dm', serverId: null }],
    ['canal sem servidor', { status: 'active', type: 'channel', serverId: null }]
  ] as const)('%s: desabilitado com o motivo', (_, call) => {
    expect(queueTarget(call)).toEqual({ reason: QUEUE_NEEDS_CALL })
  })
})
