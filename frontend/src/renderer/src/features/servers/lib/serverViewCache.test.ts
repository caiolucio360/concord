import { describe, expect, it } from 'vitest'
import { createServerViewCache, type ServerView } from './serverViewCache'

const view = (id: string): ServerView => ({
  server: { id, name: id, owner_id: 'ana' },
  members: [{ server_id: id, user_id: 'ana', role: 'member' }],
  roles: [],
  channels: []
})

describe('serverViewCache', () => {
  it('lembra a última tela de cada servidor, por conta', () => {
    const cache = createServerViewCache()
    cache.remember('ana', view('s1'))

    expect(cache.recall('ana', 's1')?.server.id).toBe('s1')
    expect(cache.recall('bia', 's1')).toBeNull() // outra conta não vê
    expect(cache.recall('ana', 's2')).toBeNull()
  })

  it('sem conta não guarda nem devolve nada', () => {
    const cache = createServerViewCache()
    cache.remember(null, view('s1'))
    expect(cache.recall(null, 's1')).toBeNull()
  })

  it('forget tira o servidor de todas as contas (saiu, foi expulso, mudou permissão)', () => {
    const cache = createServerViewCache()
    cache.remember('ana', view('s1'))
    cache.remember('bia', view('s1'))
    cache.remember('ana', view('s2'))

    cache.forget('s1')

    expect(cache.recall('ana', 's1')).toBeNull()
    expect(cache.recall('bia', 's1')).toBeNull()
    expect(cache.recall('ana', 's2')).not.toBeNull()
  })

  it('invalidate esquece e recusa a tela do servidor até markFresh', () => {
    const cache = createServerViewCache()
    cache.remember('ana', view('s1'))

    cache.invalidate('s1')
    expect(cache.recall('ana', 's1')).toBeNull()
    cache.remember('ana', view('s1')) // tela de antes da mudança: recusada
    expect(cache.recall('ana', 's1')).toBeNull()

    cache.markFresh('s1')
    cache.remember('ana', view('s1'))
    expect(cache.recall('ana', 's1')).not.toBeNull()
  })

  it('clear esquece tudo (saiu da conta)', () => {
    const cache = createServerViewCache()
    cache.remember('ana', view('s1'))
    cache.invalidate('s2')
    cache.clear()
    expect(cache.recall('ana', 's1')).toBeNull()
    cache.remember('ana', view('s2')) // s2 não está mais marcado
    expect(cache.recall('ana', 's2')).not.toBeNull()
  })

  it('guarda no máximo max telas, esquecendo a usada há mais tempo', () => {
    const cache = createServerViewCache(2)
    cache.remember('ana', view('s1'))
    cache.remember('ana', view('s2'))
    cache.recall('ana', 's1') // s1 usado de novo: o mais antigo agora é s2
    cache.remember('ana', view('s3'))

    expect(cache.recall('ana', 's1')).not.toBeNull()
    expect(cache.recall('ana', 's2')).toBeNull()
    expect(cache.recall('ana', 's3')).not.toBeNull()
  })
})
