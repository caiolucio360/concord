// Regras do R8 (build de release) que o prebuild acrescenta em android/app/proguard-rules.pro.
// É JavaScript (e não TypeScript) de propósito: o Expo só transpila o próprio app.config.ts, e o que ele
// importa é carregado como está. Os tipos ficam em withProguardRules.d.ts.
const { withDangerousMod } = require('expo/config-plugins')
const fs = require('node:fs')
const path = require('node:path')

const PROGUARD_RULES = [
  '# LiveKit: o WebRTC dele referencia livekit.org.jni_zero.JniZeroJni, que o R8 não encontra e faz o',
  '# build de release falhar. É a regra que o próprio Gradle sugere (app/build/outputs/mapping/release/missing_rules.txt).',
  '-dontwarn livekit.org.jni_zero.JniZeroJni',
  '# WorkManager (veio com o notifee): cria o banco do Room (WorkDatabase_Impl) por reflexão; sem o construtor',
  '# o app fecha ao abrir com "Failed to create an instance of class androidx.work.impl.WorkDatabase".',
  '-keep class * extends androidx.room.RoomDatabase { <init>(); }'
]

/** Acrescenta as regras ao conteúdo do proguard-rules.pro, sem duplicar se o prebuild rodar de novo. */
function addProguardRules(current) {
  if (current.includes(PROGUARD_RULES[PROGUARD_RULES.length - 1])) return current
  const base = current === '' || current.endsWith('\n') ? current : `${current}\n`
  return `${base}\n${PROGUARD_RULES.join('\n')}\n`
}

const withProguardRules = (config) =>
  withDangerousMod(config, [
    'android',
    (c) => {
      const file = path.join(c.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro')
      fs.writeFileSync(file, addProguardRules(fs.readFileSync(file, 'utf8')))
      return c
    }
  ])

module.exports = { PROGUARD_RULES, addProguardRules, withProguardRules }
