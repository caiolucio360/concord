import { describe, expect, it } from 'vitest'
import { isScreenHelper, mediaOwner, screenHelperIdentity } from './screenIdentity'

describe('screenIdentity', () => {
  it('a live do helper nativo é do usuário dono', () => {
    expect(screenHelperIdentity('u1')).toBe('u1:screen')
    expect(mediaOwner('u1:screen')).toBe('u1')
    expect(isScreenHelper('u1:screen')).toBe(true)
  })

  it('pessoas e o bot de música ficam como estão', () => {
    expect(mediaOwner('u1')).toBe('u1')
    expect(isScreenHelper('u1')).toBe(false)
    expect(mediaOwner('bot-music:canal')).toBe('bot-music:canal')
    expect(isScreenHelper('bot-music:canal')).toBe(false)
  })

  it('só o sufixo exato com dono conta', () => {
    expect(isScreenHelper(':screen')).toBe(false)
    expect(mediaOwner(':screen')).toBe(':screen')
    expect(isScreenHelper('u1:screens')).toBe(false)
  })
})
