// Serviço em primeiro plano da chamada (ADR 0029): o notifee declara o serviço dele como "shortService" (o Android
// encerra em ~3 min); a chamada precisa dos tipos microphone e camera. O prebuild sobrescreve o tipo no manifest
// final e declara as permissões. JavaScript (e não TypeScript) pelo mesmo motivo do withProguardRules.
const { withAndroidManifest } = require('expo/config-plugins')

const CALL_SERVICE = 'app.notifee.core.ForegroundService'
const SERVICE_TYPES = 'microphone|camera'
const PERMISSIONS = ['android.permission.FOREGROUND_SERVICE_MICROPHONE', 'android.permission.FOREGROUND_SERVICE_CAMERA']

/** Aplica o serviço e as permissões ao manifest (objeto do xml2js que o Expo usa), sem duplicar. */
function applyCallForegroundService(config) {
  const manifest = config.manifest
  manifest.$ = { ...manifest.$, 'xmlns:tools': 'http://schemas.android.com/tools' }
  const perms = manifest['uses-permission'] ?? []
  for (const name of PERMISSIONS) {
    if (!perms.some((p) => p.$['android:name'] === name)) perms.push({ $: { 'android:name': name } })
  }
  manifest['uses-permission'] = perms
  const app = manifest.application[0]
  const services = (app.service ?? []).filter((s) => s.$['android:name'] !== CALL_SERVICE)
  services.push({
    $: {
      'android:name': CALL_SERVICE,
      'android:exported': 'false',
      'android:foregroundServiceType': SERVICE_TYPES,
      'tools:replace': 'android:foregroundServiceType'
    }
  })
  app.service = services
  return config
}

const withCallForegroundService = (config) =>
  withAndroidManifest(config, (c) => {
    c.modResults = applyCallForegroundService(c.modResults)
    return c
  })

module.exports = { CALL_SERVICE, applyCallForegroundService, withCallForegroundService }
