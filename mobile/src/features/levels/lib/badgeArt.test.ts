import { badgeArt } from './badgeArt'
import { BADGE_ART } from './badgeArtMap'

describe('badgeArt', () => {
  it('acha a arte da categoria e do tier; tier 0 usa o primeiro', () => {
    expect(badgeArt('amigos', 1)).toBeDefined()
    expect(badgeArt('amigos', 0)).toBe(badgeArt('amigos', 1))
  })
  it('categoria desconhecida não tem arte', () => {
    expect(badgeArt('nao-existe', 1)).toBeUndefined()
  })
  it('o mapa tem as artes copiadas do desktop', () => {
    expect(Object.keys(BADGE_ART).length).toBeGreaterThan(100)
  })
})
