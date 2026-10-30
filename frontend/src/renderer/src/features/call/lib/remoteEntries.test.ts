import { describe, expect, it } from 'vitest'
import { remoteEntries, type RemoteRoomParticipant } from './remoteEntries'

const track = (id: string) => ({ mediaStreamTrack: { id } as MediaStreamTrack, kind: 'video' })

function person(
  identity: string,
  name: string,
  pubs: { source: string; subscribed?: boolean; muted?: boolean; kind?: string }[]
): RemoteRoomParticipant {
  return {
    identity,
    name,
    trackPublications: new Map(
      pubs.map((p, i) => [
        String(i),
        {
          source: p.source,
          isSubscribed: p.subscribed ?? false,
          isMuted: p.muted ?? false,
          track: p.subscribed ? { ...track(`${identity}-${p.source}`), kind: p.kind ?? 'video' } : undefined
        }
      ])
    )
  }
}

describe('remoteEntries', () => {
  it('pessoas: nome, publicações e tracks assinadas', () => {
    const out = remoteEntries([person('bia', 'Bia', [{ source: 'microphone', subscribed: true, kind: 'audio' }])], null)
    expect(out.mediaPeers).toEqual({ bia: 'Bia' })
    expect(out.publications).toEqual([{ userId: 'bia', source: 'microphone' }])
    expect(out.entries.map((e) => [e.userId, e.source])).toEqual([['bia', 'microphone']])
  })

  it('a live do helper nativo é da dona e não é uma pessoa na sala', () => {
    const out = remoteEntries(
      [
        person('bia', 'Bia', []),
        person('bia:screen', 'Bia', [
          { source: 'screen_share', subscribed: true },
          { source: 'screen_share_audio', subscribed: true, kind: 'audio' }
        ])
      ],
      null
    )
    expect(out.mediaPeers).toEqual({ bia: 'Bia' })
    expect(out.publications).toEqual([
      { userId: 'bia', source: 'screen_share' },
      { userId: 'bia', source: 'screen_share_audio' }
    ])
    expect(out.entries.map((e) => [e.userId, e.source])).toEqual([
      ['bia', 'screen_share'],
      ['bia', 'screen_share_audio']
    ])
  })

  it('a minha live nativa: o vídeo vem (prévia), mas não conta como tela de outra pessoa', () => {
    const out = remoteEntries([person('eu:screen', 'Eu', [{ source: 'screen_share', subscribed: true }])], 'eu:screen')
    expect(out.publications).toEqual([])
    expect(out.entries.map((e) => [e.userId, e.source])).toEqual([['eu', 'screen_share']])
  })

  it('vídeo pausado some', () => {
    const out = remoteEntries([person('bia', 'Bia', [{ source: 'camera', subscribed: true, muted: true }])], null)
    expect(out.entries).toEqual([])
  })
})
