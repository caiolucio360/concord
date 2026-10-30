import { beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// Sem portal no SSR: o modal aberto vira um bloco com o título.
vi.mock('../../../shared/ui/Modal', () => ({
  default: ({ title, children }: { title?: string; children: React.ReactNode }) => (
    <div data-modal={title}>{children}</div>
  )
}))
const access = { perms: 0 }
vi.mock('../hooks/useServerAccess', () => ({
  useServerAccess: () => ({ isOwner: false, perms: access.perms, channelPerms: () => access.perms })
}))
// SSR lê o estado atual do zustand.
vi.spyOn(React, 'useSyncExternalStore').mockImplementation((_subscribe, getSnapshot) =>
  getSnapshot()
)

import type { Channel } from '../api/channels'
import type { ServerMember } from '../api/servers'
import { Perm, type Role } from '../lib/permissions'
import { useServerStore } from '../store/serverStore'
import ChannelPermissionsModal from './ChannelPermissionsModal'

const role = (id: string, name: string, extra: Partial<Role> = {}): Role =>
  ({ id, server_id: 's1', name, color: null, position: 1, permissions: 0, hoist: false, is_default: false, ...extra }) as Role

const text = {
  id: 'c1',
  server_id: 's1',
  name: 'geral',
  type: 'text',
  overwrites: [{ target_type: 'role', target_id: 'everyone', allow: 0, deny: Perm.VIEW_CHANNEL }]
} as Channel

function setStore(channel: Channel): void {
  useServerStore.setState({
    currentServer: { id: 's1', name: 'Salinha', owner_id: 'dono' },
    roles: [role('everyone', '@everyone', { is_default: true, position: 0 }), role('mod', 'Mod')],
    currentMembers: [{ user_id: 'u1', username: 'ana' } as ServerMember],
    channels: [channel]
  })
}

const render = (channel: Channel | null = text): string =>
  renderToStaticMarkup(<ChannelPermissionsModal channel={channel} onClose={() => {}} />)

describe('ChannelPermissionsModal', () => {
  beforeEach(() => {
    access.perms = Perm.ADMINISTRATOR
    setStore(text)
  })

  it('sem canal, nada', () => {
    expect(render(null)).toBe('')
  })

  it('canal de texto privado: título com #, interruptor ligado e o @everyone selecionado', () => {
    const html = render()
    expect(html).toContain('data-modal="Permissões de #geral"')
    expect(html).toMatch(/role="switch" aria-checked="true"/)
    expect(html).toMatch(/aria-current="true"[^>]*>.*@everyone/)
    expect(html).toContain('aria-label="Ver canais: Negar"')
  })

  it('cada permissão tem negar, herdar e permitir; o estado salvo vem marcado', () => {
    const html = render()
    expect(html).toMatch(/aria-label="Ver canais: Negar" aria-pressed="true"/)
    expect(html).toMatch(/aria-label="Ver canais: Permitir" aria-pressed="false"/)
  })

  it('canal de voz: título sem # e texto falando em entrar', () => {
    const voice = { ...text, id: 'v1', name: 'resenha', type: 'voice', overwrites: [] } as Channel
    setStore(voice)
    const html = render(voice)
    expect(html).toContain('data-modal="Permissões de resenha"')
    expect(html).toContain('ver e entrar neste canal')
  })

  it('sem a permissão no canal, os botões vêm travados', () => {
    access.perms = 0
    expect(render()).toMatch(/disabled="" aria-label="Ver canais: Negar"/)
  })
})
