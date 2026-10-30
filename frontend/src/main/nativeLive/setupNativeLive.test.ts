import { describe, expect, it } from 'vitest'
import { leavesPage, nativeLiveAvailability } from './setupNativeLive'

describe('nativeLiveAvailability', () => {
  it('Linux com o helper: disponível, e diz se a placa é NVIDIA', () => {
    expect(nativeLiveAvailability('linux', () => true, () => true)).toEqual({
      available: true,
      nvidia: true
    })
    expect(nativeLiveAvailability('linux', () => true, () => false)).toEqual({
      available: true,
      nvidia: false
    })
  })

  it('sem o helper ou fora do Linux: indisponível (a live segue pelo Chromium)', () => {
    expect(nativeLiveAvailability('linux', () => false, () => true)).toEqual({
      available: false,
      nvidia: false
    })
    expect(nativeLiveAvailability('win32', () => true, () => true)).toEqual({
      available: false,
      nvidia: false
    })
  })
})

describe('leavesPage', () => {
  it('recarregar a página acaba com a live; trocar de rota (#/) ou um iframe não', () => {
    expect(leavesPage({ isMainFrame: true, isSameDocument: false })).toBe(true)
    expect(leavesPage({ isMainFrame: true, isSameDocument: true })).toBe(false)
    expect(leavesPage({ isMainFrame: false, isSameDocument: false })).toBe(false)
  })
})
