import { callAvatarAnimate } from './callAvatarMotion'

describe('callAvatarAnimate', () => {
  it('o GIF do avatar só anima enquanto a pessoa fala (como no desktop e na web)', () => {
    expect(callAvatarAnimate({ speaking: true })).toBe(true)
    expect(callAvatarAnimate({ speaking: false })).toBe(false)
  })
})
