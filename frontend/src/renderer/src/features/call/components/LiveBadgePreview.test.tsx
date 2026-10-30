import { describe, expect, it, vi } from 'vitest'

// O callStore puxa o áudio da call (AudioWorklet): aqui só a parte visual importa.
const call = vi.hoisted(() => ({ state: {} as Record<string, unknown> }))
vi.mock('../store/callStore', () => ({
  useCallStore: (select: (s: Record<string, unknown>) => unknown) => select(call.state)
}))
vi.mock('../../auth/store/authStore', () => ({
  useAuthStore: (select: (s: { user: { id: string } }) => unknown) => select({ user: { id: 'me' } })
}))
vi.mock('../store/streamJoinStore', () => ({ requestWatchStream: vi.fn() }))
vi.mock('../../servers/store/serverStore', () => ({ useServerStore: vi.fn() }))
import { renderToStaticMarkup } from 'react-dom/server'
import LiveBadgeWithPreview, { LiveBadgeButton, LivePreviewCardBody } from './LiveBadgePreview'

/** Fora da chamada; "bia" transmite no canal v1. */
function liveInChannel(locked = false): void {
  call.state = {
    status: 'idle',
    callId: null,
    type: null,
    channelId: null,
    screenSharers: [],
    availableScreens: [],
    serverCalls: {
      v1: {
        call: { id: 'c1', type: 'channel', status: 'active', server_id: 's1', locked },
        participants: [{ user_id: 'bia' }, { user_id: 'me' }],
        screen_sharing: ['bia', 'me']
      }
    }
  }
}

describe('LiveBadgeWithPreview: quem vê a prévia', () => {
  const badge = (userId: string, canWatch: boolean): string =>
    renderToStaticMarkup(
      <LiveBadgeWithPreview
        userId={userId}
        name="Bia"
        channelId="v1"
        connectedHere={false}
        canWatch={canWatch}
      />
    )

  it('posso ver e entrar no canal: o selo abre a prévia', () => {
    liveInChannel()
    expect(badge('bia', true)).toContain('<button')
  })

  it('sem permissão no canal, sala trancada ou a minha live: só o selo', () => {
    liveInChannel()
    expect(badge('bia', false)).not.toContain('<button')
    expect(badge('me', true)).not.toContain('<button')
    liveInChannel(true)
    expect(badge('bia', true)).not.toContain('<button')
    expect(badge('bia', true)).toContain('LIVE')
  })
})

describe('LiveBadgeButton', () => {
  it('o selo vira botão que abre a prévia (teclado e toque)', () => {
    const html = renderToStaticMarkup(
      <LiveBadgeButton name="Bia" open={false} onTap={vi.fn()} hover={{}} />
    )
    expect(html).toContain('<button')
    expect(html).toContain('aria-label="Prévia da transmissão de Bia"')
    expect(html).toContain('aria-haspopup="dialog"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('LIVE')
  })

  it('aberta: aria-expanded', () => {
    const html = renderToStaticMarkup(<LiveBadgeButton name="Bia" open onTap={vi.fn()} hover={{}} />)
    expect(html).toContain('aria-expanded="true"')
  })
})

describe('LivePreviewCardBody', () => {
  const body = (over: Partial<Parameters<typeof LivePreviewCardBody>[0]> = {}): string =>
    renderToStaticMarkup(
      <LivePreviewCardBody
        name="Bia"
        src={null}
        ended={false}
        watchers={3}
        onWatch={vi.fn()}
        {...over}
      />
    )

  it('carregando: esqueleto, nome, quem assiste e Assistir', () => {
    const html = body()
    expect(html).toContain('Carregando prévia…')
    expect(html).toContain('Bia')
    expect(html).toContain('3 assistindo')
    expect(html).toMatch(/<button[^>]*>Assistir<\/button>/)
    expect(html).not.toMatch(/<button[^>]* disabled=""/)
  })

  it('com a foto: mostra a miniatura', () => {
    expect(body({ src: 'data:image/jpeg;base64,AAA' })).toContain(
      'src="data:image/jpeg;base64,AAA"'
    )
  })

  it('encerrada: avisa e desliga o Assistir', () => {
    const html = body({ ended: true, watchers: 0 })
    expect(html).toContain('Transmissão encerrada')
    expect(html).toContain('Ninguém assistindo')
    expect(html).toMatch(/<button[^>]* disabled=""/)
  })
})
