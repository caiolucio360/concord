import { DEFAULT_PROFILE_THEME } from '../../profile/lib/profileTheme'
import { PROFILE_PRESETS } from '../../profile/lib/profilePresets'
import {
  linksSummary,
  nameStyleSummary,
  textSummary,
  themeName
} from './profileTiles'

describe('themeName', () => {
  it('o nome da predefinição, ou "Personalizado"', () => {
    expect(themeName(DEFAULT_PROFILE_THEME)).toBe('Padrão')
    expect(themeName(PROFILE_PRESETS[1].theme)).toBe(PROFILE_PRESETS[1].label)
    expect(themeName({ ...DEFAULT_PROFILE_THEME, border: 'solid', border_colors: ['#123456'] })).toBe('Personalizado')
  })
})

describe('nameStyleSummary', () => {
  it('fonte · efeito', () => {
    expect(nameStyleSummary({ font: 'default', effect: 'solid', colors: [] })).toBe('Padrão · Sólido')
    expect(nameStyleSummary({ font: 'sakura', effect: 'gradient', colors: [] })).toBe(
      'Sakura · Degradê'
    )
  })
  it('ids desconhecidos voltam ao padrão', () => {
    expect(nameStyleSummary({ font: '??', effect: '??', colors: [] })).toBe('Padrão · Sólido')
  })
})

describe('textSummary', () => {
  it('o texto sem espaços nas pontas, ou null quando vazio', () => {
    expect(textSummary('  oi  ')).toBe('oi')
    expect(textSummary('   ')).toBeNull()
    expect(textSummary(undefined)).toBeNull()
  })
})

describe('linksSummary', () => {
  it('nenhum, um ou vários', () => {
    expect(linksSummary([])).toBeNull()
    expect(linksSummary(['a'])).toBe('1 link')
    expect(linksSummary(['a', 'b', 'c'])).toBe('3 links')
  })
})

