import { addProguardRules, PROGUARD_RULES } from '../plugins/withProguardRules'

// Regressão: o build de release (R8) falhava com "Missing class livekit.org.jni_zero.JniZeroJni" desde que a
// voz entrou no app: o WebRTC do LiveKit referencia essa classe e o R8 não a encontra. O Gradle sugere
// ignorar o aviso (-dontwarn); sem a regra o APK de release não compila.
describe('addProguardRules', () => {
  const BASE = '# regras do projeto\n-keep class com.swmansion.reanimated.** { *; }\n'

  it('acrescenta a regra que o R8 pede, sem tirar as que já existem', () => {
    const out = addProguardRules(BASE)
    expect(out.startsWith(BASE)).toBe(true)
    expect(out).toContain('-dontwarn livekit.org.jni_zero.JniZeroJni')
  })

  it('é idempotente: rodar o prebuild de novo não duplica as regras', () => {
    const once = addProguardRules(BASE)
    expect(addProguardRules(once)).toBe(once)
    expect(once.split('-dontwarn livekit.org.jni_zero.JniZeroJni').length - 1).toBe(1)
  })

  it('arquivo vazio e arquivo sem quebra de linha no fim também funcionam', () => {
    expect(addProguardRules('')).toContain(PROGUARD_RULES[PROGUARD_RULES.length - 1])
    expect(addProguardRules('-keep class a.B')).toMatch(/-keep class a\.B\n/)
  })

  it('termina com uma quebra de linha', () => {
    expect(addProguardRules(BASE).endsWith('\n')).toBe(true)
  })
})
