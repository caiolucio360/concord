import { CALL_SERVICE, applyCallForegroundService } from '../plugins/withCallForegroundService'

type Manifest = Parameters<typeof applyCallForegroundService>[0]

const base = (): Manifest => ({
  manifest: {
    $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
    application: [{ $: { 'android:name': '.MainApplication' }, service: [{ $: { 'android:name': 'com.oney.WebRTCModule.MediaProjectionService' } }] }]
  }
})

// Regressão: sem serviço em primeiro plano a chamada caía uns 30 s depois de ir para outra tela (o Android pausa o
// JavaScript e corta o microfone). O notifee declara o serviço como "shortService" (no máximo ~3 min); a chamada
// precisa dos tipos microphone e camera.
describe('applyCallForegroundService', () => {
  it('sobrescreve o tipo do serviço do notifee para microfone e câmera, sem mexer nos outros serviços', () => {
    const out = applyCallForegroundService(base())
    const services = out.manifest.application?.[0].service ?? []
    const call = services.find((s) => s.$['android:name'] === CALL_SERVICE)
    expect(call?.$).toMatchObject({ 'android:foregroundServiceType': 'microphone|camera', 'tools:replace': 'android:foregroundServiceType' })
    expect(services.some((s) => s.$['android:name'] === 'com.oney.WebRTCModule.MediaProjectionService')).toBe(true)
    expect(out.manifest.$['xmlns:tools']).toBe('http://schemas.android.com/tools')
  })

  it('declara as permissões de serviço em primeiro plano de microfone e câmera', () => {
    const names = (applyCallForegroundService(base()).manifest['uses-permission'] ?? []).map((p) => p.$['android:name'])
    expect(names).toEqual(expect.arrayContaining(['android.permission.FOREGROUND_SERVICE_MICROPHONE', 'android.permission.FOREGROUND_SERVICE_CAMERA']))
  })

  it('é idempotente: rodar o prebuild de novo não duplica o serviço nem as permissões', () => {
    const twice = applyCallForegroundService(applyCallForegroundService(base()))
    expect(twice.manifest.application?.[0].service?.filter((s) => s.$['android:name'] === CALL_SERVICE)).toHaveLength(1)
    const perms = (twice.manifest['uses-permission'] ?? []).map((p) => p.$['android:name'])
    expect(perms.filter((n) => n === 'android.permission.FOREGROUND_SERVICE_CAMERA')).toHaveLength(1)
  })
})
