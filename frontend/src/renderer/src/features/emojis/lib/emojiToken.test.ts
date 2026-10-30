import { describe, expect, it } from 'vitest'
import {
  isEmojiOnly,
  isValidEmojiName,
  messageToken,
  reactionEmojiId,
  reactionToken,
  splitCustomEmojis
} from './emojiToken'

const ID = '3f2b6c1e-8a4d-4f7e-9b1a-2c3d4e5f6a7b'
const ID2 = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'

describe('nome do emoji', () => {
  it('aceita 2 a 32 letras, números ou _', () => {
    expect(isValidEmojiName('ok')).toBe(true)
    expect(isValidEmojiName('kkk_2')).toBe(true)
    expect(isValidEmojiName('a'.repeat(32))).toBe(true)
  })
  it('recusa curto, longo, espaço, acento e hífen', () => {
    for (const bad of ['', 'a', 'a'.repeat(33), 'com espaço', 'ação', 'a-b']) {
      expect(isValidEmojiName(bad)).toBe(false)
    }
  })
})

describe('tokens', () => {
  it('monta o token do texto e o da reação', () => {
    expect(messageToken({ id: ID, name: 'festa' })).toBe(`<:festa:${ID}>`)
    expect(reactionToken(ID)).toBe(`<:${ID}>`)
  })
  it('lê o id da reação personalizada e ignora emoji comum', () => {
    expect(reactionEmojiId(`<:${ID}>`)).toBe(ID)
    expect(reactionEmojiId('👍')).toBeNull()
    expect(reactionEmojiId('<:nao-uuid>')).toBeNull()
  })
})

describe('splitCustomEmojis', () => {
  it('sem "<:" devolve o texto inteiro', () => {
    expect(splitCustomEmojis('oi tudo bem')).toEqual([{ text: 'oi tudo bem' }])
  })
  it('separa os emojis do texto em volta', () => {
    expect(splitCustomEmojis(`oi <:festa:${ID}> e <:kkk:${ID2}>!`)).toEqual([
      { text: 'oi ' },
      { text: `<:festa:${ID}>`, emoji: { id: ID, name: 'festa' } },
      { text: ' e ' },
      { text: `<:kkk:${ID2}>`, emoji: { id: ID2, name: 'kkk' } },
      { text: '!' }
    ])
  })
  it('emoji colado em emoji e no começo/fim', () => {
    const parts = splitCustomEmojis(`<:a1:${ID}><:b2:${ID2}>`)
    expect(parts.map((p) => p.emoji?.name)).toEqual(['a1', 'b2'])
  })
  it('token malformado fica texto', () => {
    const text = `<:a:${ID}> <:festa:123> <festa:${ID}>`
    expect(splitCustomEmojis(text)).toEqual([{ text }])
  })
})

describe('isEmojiOnly', () => {
  it('só emojis e espaços: grande', () => {
    expect(isEmojiOnly(splitCustomEmojis(`<:a1:${ID}> <:b2:${ID2}>`))).toBe(true)
  })
  it('com texto, vazio ou emojis demais: normal', () => {
    expect(isEmojiOnly(splitCustomEmojis(`oi <:a1:${ID}>`))).toBe(false)
    expect(isEmojiOnly([{ text: '  ' }])).toBe(false)
    expect(isEmojiOnly(splitCustomEmojis(`<:a1:${ID}>`.repeat(28)))).toBe(false)
  })
})
