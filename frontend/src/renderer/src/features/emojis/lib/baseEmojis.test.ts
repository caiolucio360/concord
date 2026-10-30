import { describe, expect, it } from 'vitest'
import { EMOTE_CATEGORIES } from '../../chat/lib/emotes'
import { basePackToCategories, searchCategories, type BasePack } from './baseEmojis'

const PACK: BasePack = {
  groups: [
    { id: 0, name: 'sorrisos e emoção' },
    { id: 1, name: 'pessoas e corpo' }
  ],
  emojis: [
    { e: '😀', l: 'rosto risonho', k: ['feliz'], g: 0 },
    { e: '😃', l: 'rosto sorridente', g: 0 },
    { e: '👋', l: 'mão acenando', k: ['tchau'], g: 1 },
    { e: '❓', l: 'grupo que não veio', g: 9 }
  ]
}

describe('basePackToCategories', () => {
  it('põe os Frequentes locais primeiro e um grupo por categoria', () => {
    const cats = basePackToCategories(PACK)
    expect(cats[0]).toBe(EMOTE_CATEGORIES[0])
    expect(cats.slice(1).map((c) => [c.name, c.items.map((i) => i.emoji)])).toEqual([
      ['sorrisos e emoção', ['😀', '😃']],
      ['pessoas e corpo', ['👋']]
    ])
    expect(cats[1].items[0]).toMatchObject({ label: 'rosto risonho', keywords: ['feliz'] })
  })
})

describe('searchCategories', () => {
  const cats = basePackToCategories(PACK)

  it('busca vazia devolve as mesmas categorias', () => {
    expect(searchCategories(cats, '  ')).toBe(cats)
  })
  it('acha por rótulo e palavra-chave sem diferenciar acento nem maiúsculas', () => {
    const found = searchCategories(cats, 'MAO')
    expect(found.flatMap((c) => c.items.map((i) => i.emoji))).toEqual(['👋'])
    expect(searchCategories(cats, 'tchau')[0].items[0].emoji).toBe('👋')
  })
  it('corta no limite de resultados', () => {
    const found = searchCategories(cats, 'rosto', 1)
    expect(found.flatMap((c) => c.items)).toHaveLength(1)
  })
  it('sem resultado devolve lista vazia', () => {
    expect(searchCategories(cats, 'zzz')).toEqual([])
  })
})
