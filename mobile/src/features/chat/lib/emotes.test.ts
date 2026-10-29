import { EMOTE_CATEGORIES, filterEmoteCategories } from './emotes'

describe('emotes', () => {
  it('sem busca devolve todas as categorias', () => {
    expect(filterEmoteCategories('  ')).toBe(EMOTE_CATEGORIES)
  })
  it('busca por rótulo, palavra-chave ou o próprio emoji; categorias vazias somem', () => {
    expect(filterEmoteCategories('fogo').flatMap((c) => c.items.map((i) => i.emoji))).toContain('🔥')
    expect(filterEmoteCategories('🔥').length).toBeGreaterThan(0)
    expect(filterEmoteCategories('zzzzzz')).toEqual([])
  })
})
