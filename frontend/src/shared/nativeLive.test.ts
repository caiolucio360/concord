import { describe, expect, it } from 'vitest'
import { parseNativeLiveEvent, parseNativeLiveQuality, parseNativeLiveStart } from './nativeLive'

describe('parseNativeLiveEvent', () => {
  it('lê os eventos do helper', () => {
    expect(parseNativeLiveEvent('{"event":"capturing","width":2560,"height":1440}')).toEqual({
      event: 'capturing',
      width: 2560,
      height: 1440
    })
    expect(parseNativeLiveEvent('{"event":"published","codec":"h264","audio":true}')).toEqual({
      event: 'published',
      codec: 'h264',
      audio: true
    })
    expect(parseNativeLiveEvent('{"event":"ended","reason":"stopped"}')).toEqual({
      event: 'ended',
      reason: 'stopped'
    })
  })

  it('estatísticas: só objetos', () => {
    const line = JSON.stringify({ event: 'stats', stats: [{ type: 'outbound-rtp' }, 3, null] })
    expect(parseNativeLiveEvent(line)).toEqual({ event: 'stats', stats: [{ type: 'outbound-rtp' }] })
  })

  it('erro só com código conhecido', () => {
    expect(
      parseNativeLiveEvent('{"event":"error","code":"capture_denied","message":"fechou"}')
    ).toEqual({ event: 'error', code: 'capture_denied', message: 'fechou' })
    expect(parseNativeLiveEvent('{"event":"error","code":"outro","message":"x"}')).toBeNull()
  })

  it('ignora lixo, evento desconhecido e campos faltando', () => {
    expect(parseNativeLiveEvent('[webrtc] log solto')).toBeNull()
    expect(parseNativeLiveEvent('{"event":"explodiu"}')).toBeNull()
    expect(parseNativeLiveEvent('{"event":"capturing","width":"1920"}')).toBeNull()
    expect(parseNativeLiveEvent('[1,2]')).toBeNull()
    expect(parseNativeLiveEvent('{"event":"published"}')).toBeNull()
  })

  it('ended sem motivo vira unknown; published sem audio é sem som', () => {
    expect(parseNativeLiveEvent('{"event":"ended"}')).toEqual({ event: 'ended', reason: 'unknown' })
    expect(parseNativeLiveEvent('{"event":"published","codec":"h264"}')).toMatchObject({
      audio: false
    })
  })
})

describe('parseNativeLiveStart', () => {
  const quality = { width: 1920, height: 1080, fps: 30, maxBitrate: 4_500_000 }

  it('aceita o pedido do renderer', () => {
    expect(
      parseNativeLiveStart({ url: 'wss://salinha.example', token: 'jwt', quality, simulcast: true })
    ).toEqual({ url: 'wss://salinha.example', token: 'jwt', quality, simulcast: true, audio: false })
  })

  it('recusa endereço, token ou degrau inválidos', () => {
    expect(parseNativeLiveStart({ url: 'file:///etc', token: 'jwt', quality })).toBeNull()
    expect(parseNativeLiveStart({ url: 'wss://x', token: '', quality })).toBeNull()
    expect(parseNativeLiveStart({ url: 'wss://x', token: 'jwt', quality: { ...quality, fps: 120 } })).toBeNull()
    expect(parseNativeLiveStart(null)).toBeNull()
  })
})

describe('parseNativeLiveQuality', () => {
  it('só inteiros no intervalo', () => {
    expect(parseNativeLiveQuality({ width: 1280, height: 720, fps: 60, maxBitrate: 1 })).toEqual({
      width: 1280,
      height: 720,
      fps: 60,
      maxBitrate: 1
    })
    expect(parseNativeLiveQuality({ width: 1280.5, height: 720, fps: 30, maxBitrate: 1 })).toBeNull()
    expect(parseNativeLiveQuality({ width: 1280, height: 1, fps: 30, maxBitrate: 1 })).toBeNull()
    expect(parseNativeLiveQuality({ width: 1280, height: 720, fps: 0, maxBitrate: 1 })).toBeNull()
    expect(parseNativeLiveQuality({ width: 1280, height: 720, fps: 30, maxBitrate: 0 })).toBeNull()
    expect(parseNativeLiveQuality('1080p')).toBeNull()
  })
})
