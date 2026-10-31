import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ServerEvent } from '../api/events'

vi.mock('../hooks/useBannerSrc', () => ({ useBannerSrc: () => ({ src: null, onError: () => {} }) }))
vi.mock('../api/events', async (original) => ({
  ...(await original<typeof import('../api/events')>()),
  fetchGoing: () => Promise.resolve([])
}))

import EventsPanelBody from './EventsPanelBody'

function ev(id: string, extra: Partial<ServerEvent> = {}): ServerEvent {
  return {
    id,
    server_id: 's1',
    channel_id: 'voz',
    title: `Evento ${id}`,
    description: 'Traga a galera',
    banner_id: null,
    starts_at: '2026-12-01T20:00:00.000Z',
    next_start_at: '2026-12-01T20:00:00.000Z',
    recurrence: 'weekly',
    recurrence_until: null,
    recurrence_count: null,
    reminder_offsets: [10, 5],
    created_by: 'u1',
    going_count: 3,
    my_rsvp: null,
    ...extra
  }
}

const channels = [{ id: 'voz', name: 'Sala de jogos' }]

function render(props: Partial<React.ComponentProps<typeof EventsPanelBody>> = {}): string {
  return renderToStaticMarkup(
    <EventsPanelBody
      serverId="s1"
      events={[ev('a'), ev('b')]}
      error={null}
      canManage={false}
      channels={channels}
      selectedId={null}
      onSelect={() => {}}
      onCreate={() => {}}
      onEdit={() => {}}
      onRetry={() => {}}
      onRespond={() => {}}
      onCancelEvent={() => {}}
      {...props}
    />
  )
}

describe('EventsPanelBody', () => {
  beforeEach(() => {
    vi.stubGlobal('document', { body: {} })
  })

  it('lista os eventos com título e quantos vão', () => {
    const html = render()
    expect(html).toContain('Evento a')
    expect(html).toContain('Evento b')
    expect(html).toContain('3 vão')
  })

  it('o botão Criar evento só aparece para quem gerencia eventos', () => {
    expect(render({ canManage: false })).not.toContain('Criar evento')
    expect(render({ canManage: true })).toContain('Criar evento')
  })

  it('sem eventos, mostra o estado vazio', () => {
    expect(render({ events: [] })).toContain('Nenhum evento marcado')
  })

  it('carregando (lista ainda indefinida), mostra o aviso de carregamento', () => {
    expect(render({ events: undefined })).toContain('Carregando eventos…')
  })

  it('com erro, mostra a mensagem e o botão para tentar de novo', () => {
    const html = render({ events: undefined, error: 'Não foi possível carregar os eventos.' })
    expect(html).toContain('Não foi possível carregar os eventos.')
    expect(html).toContain('Tentar de novo')
  })

  it('evento selecionado abre o detalhe com a descrição, o canal e a repetição', () => {
    const html = render({ selectedId: 'a' })
    expect(html).toContain('Traga a galera')
    expect(html).toContain('Sala de jogos')
    expect(html).toMatch(/Toda (segunda|terça|quarta|quinta|sexta)-feira|Todo (sábado|domingo)/)
  })

  it('só quem gerencia vê Editar e Cancelar evento no detalhe', () => {
    expect(render({ selectedId: 'a', canManage: false })).not.toContain('Cancelar evento')
    const html = render({ selectedId: 'a', canManage: true })
    expect(html).toContain('Editar')
    expect(html).toContain('Cancelar evento')
  })

  it('o evento marcado mostra a minha resposta na lista e no detalhe', () => {
    const html = render({ events: [ev('a', { my_rsvp: true })], selectedId: 'a' })
    expect(html).toContain('aria-pressed="true"')
  })

  it('em tela pequena, a lista some quando há detalhe aberto (e vice-versa)', () => {
    expect(render({ selectedId: 'a' })).toContain('hidden xl:flex')
    expect(render({ selectedId: null })).toContain('hidden xl:flex')
  })
})
