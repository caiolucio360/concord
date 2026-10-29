import * as SecureStore from 'expo-secure-store'
import { playSound } from '../../call/lib/sounds/soundPlayer'
import { useVoiceControlsStore } from './voiceControlsStore'

jest.mock('../../call/lib/sounds/soundPlayer', () => ({ playSound: jest.fn() }))

jest.mock('expo-secure-store')

const store = jest.mocked(SecureStore)
const memory = new Map<string, string>()
const reset = () => useVoiceControlsStore.setState(useVoiceControlsStore.getInitialState(), true)
const state = () => useVoiceControlsStore.getState()

describe('voiceControlsStore', () => {
  beforeEach(() => {
    memory.clear()
    reset()
    store.getItemAsync.mockImplementation(async (k) => memory.get(k) ?? null)
    store.setItemAsync.mockImplementation(async (k, v) => void memory.set(k, v))
  })

  it('começa com microfone e fone ligados', () => {
    expect(state()).toMatchObject({ muted: false, deafened: false })
  })

  it('mutar e desmutar tocam o som; ensurdecer e voltar também', async () => {
    await state().toggleMute()
    expect(playSound).toHaveBeenLastCalledWith('mute')
    await state().toggleMute()
    expect(playSound).toHaveBeenLastCalledWith('unmute')
    await state().toggleDeafen()
    expect(playSound).toHaveBeenLastCalledWith('deafen')
    await state().toggleDeafen()
    expect(playSound).toHaveBeenLastCalledWith('undeafen')
  })

  it('toggleMute alterna o microfone', async () => {
    await state().toggleMute()
    expect(state().muted).toBe(true)
    await state().toggleMute()
    expect(state().muted).toBe(false)
  })

  it('ensurdecer também silencia o microfone', async () => {
    await state().toggleDeafen()
    expect(state()).toMatchObject({ deafened: true, muted: true })
  })

  it('desensurdecer devolve o microfone ao que estava antes', async () => {
    await state().toggleDeafen()
    await state().toggleDeafen()
    expect(state()).toMatchObject({ deafened: false, muted: false })
    await state().toggleMute() // mudo por conta própria
    await state().toggleDeafen()
    await state().toggleDeafen()
    expect(state()).toMatchObject({ deafened: false, muted: true })
  })

  it('ligar o microfone com o fone mudo também desensurdece', async () => {
    await state().toggleDeafen()
    await state().toggleMute()
    expect(state()).toMatchObject({ deafened: false, muted: false })
  })

  it('guarda no aparelho e restaura ao abrir', async () => {
    await state().toggleMute()
    reset()
    await state().hydrate()
    expect(state().muted).toBe(true)
  })

  it('conteúdo corrompido ou falha do secure-store: começa ligado', async () => {
    memory.set('salinha-voice-controls', '{quebrado')
    await state().hydrate()
    expect(state()).toMatchObject({ muted: false, deafened: false })
    store.getItemAsync.mockRejectedValueOnce(new Error('keystore'))
    await state().hydrate()
    expect(state().muted).toBe(false)
  })
})
