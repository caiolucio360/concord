import { describe, expect, it, vi } from 'vitest'
import { befriend, friendButtonOf } from './cardFriendship'

describe('friendButtonOf', () => {
  it('sem @, já amigos ou bloqueado: sem botão', () => {
    expect(friendButtonOf('none', false)).toBeNull()
    expect(friendButtonOf('friend', true)).toBeNull()
    expect(friendButtonOf('blocked', true)).toBeNull()
  })

  it('texto e estado pela relação', () => {
    expect(friendButtonOf('none', true)).toEqual({
      label: 'Adicionar amigo',
      incoming: false,
      pending: false
    })
    expect(friendButtonOf('outgoing', true)).toMatchObject({
      label: 'Pedido enviado',
      pending: true
    })
    expect(friendButtonOf('incoming', true)).toMatchObject({
      label: 'Aceitar pedido',
      incoming: true
    })
  })
})

describe('befriend', () => {
  const actions = (over = {}) => ({
    accept: vi.fn(async () => undefined),
    sendRequest: vi.fn(async () => 'sent'),
    ...over
  })

  it('pedido que chegou: aceita, sem aviso', async () => {
    const a = actions()
    expect(await befriend('incoming', 'ana', 'Ana', a)).toBeNull()
    expect(a.accept).toHaveBeenCalledWith('ana')
  })

  it('pedido novo: avisa que enviou', async () => {
    expect(await befriend('none', 'ana', 'Ana', actions())).toEqual({
      kind: 'success',
      message: 'Pedido de amizade enviado para Ana.'
    })
  })

  it('a outra pessoa já tinha pedido: viram amigos', async () => {
    const a = actions({ sendRequest: vi.fn(async () => 'accepted') })
    expect((await befriend('none', 'ana', 'Ana', a))?.message).toBe('Você e Ana agora são amigos.')
  })

  it('erro do servidor vira aviso de erro', async () => {
    const a = actions({ sendRequest: vi.fn(async () => Promise.reject(new Error('x'))) })
    expect(await befriend('none', 'ana', 'Ana', a)).toEqual({
      kind: 'error',
      message: 'Não foi possível enviar o pedido. Tente de novo.'
    })
  })
})
