import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isDesignFile, ratchetErrors, scanDesign } from './check-design.mjs'

const R = 'frontend/src/renderer/src/'
const rules = (text, file = R + 'features/x/components/X.tsx') => scanDesign(text, file).map((v) => v.rule)

test('só arquivos de código do renderer, sem testes', () => {
  assert.equal(isDesignFile(R + 'features/chat/components/A.tsx'), true)
  assert.equal(isDesignFile(R + 'shared/lib/a.ts'), true)
  assert.equal(isDesignFile(R + 'features/chat/components/A.test.tsx'), false)
  assert.equal(isDesignFile(R + 'env.d.ts'), false)
  assert.equal(isDesignFile('frontend/src/main/index.ts'), false)
  assert.equal(isDesignFile('mobile/src/features/a.tsx'), false)
  assert.equal(isDesignFile(R + 'assets/main.css'), false)
})

test('emoji e Unicode como ícone, em string ou texto JSX', () => {
  assert.deepEqual(rules(`const a = <button>✕</button>`), ['icone-texto'])
  assert.deepEqual(rules(`const s = { symbol: '✓' }`), ['icone-texto'])
  assert.deepEqual(rules('const t = `${n} 🔊`'), ['icone-texto'])
  assert.deepEqual(rules(`const a = <span>▼ ••• ★ ↺ 🎲</span>`), ['icone-texto'])
  assert.deepEqual(rules(`const a = <p>Salvando… · 3 votos — ok</p>`), [])
  assert.deepEqual(rules(`// comentário com ✕ não conta\nconst a = 1`), [])
})

test('whitelist por caminho: conteúdo, notação de tecla e efeito visual', () => {
  assert.deepEqual(rules(`const k = '⌘'`, R + 'features/settings/lib/keybinds.ts'), [])
  assert.deepEqual(rules(`const e = ['😀']`, R + 'features/chat/lib/emotes.ts'), [])
  assert.deepEqual(rules(`const x = '1920×1080'`, R + 'features/call/lib/screenStatsFormat.ts'), [])
})

test('design-allow com motivo libera a linha (e a seguinte)', () => {
  assert.deepEqual(rules(`const e = ['🎺'] // design-allow: emoji escolhido pelo usuário`), [])
  assert.deepEqual(rules(`{/* design-allow: conteúdo */}\nconst a = <i>🎉</i>`), [])
  assert.deepEqual(rules(`const e = ['🎺'] // design-allow:`), ['icone-texto'])
})

test('classes: px, hex, cor crua e raio fora da escala', () => {
  assert.deepEqual(rules(`<p className="text-[11px] sm:text-[9px]" />`), ['texto-px', 'texto-px'])
  assert.deepEqual(rules(`<p className="bg-[#14161a]" />`), ['hex-classe'])
  assert.deepEqual(rules(`<p className="bg-violet-600 hover:text-red-400 border-amber-400/30" />`), ['cor-crua', 'cor-crua', 'cor-crua'])
  assert.deepEqual(rules(`<p className="text-gray-400 placeholder-gray-500" />`), ['cor-crua', 'cor-crua'])
  assert.deepEqual(rules(`<p className="text-muted bg-brand text-danger" />`), [])
  assert.deepEqual(rules(`<p className="border-t-violet-500 bg-discord-green text-discord-dnd" />`), ['cor-crua', 'cor-crua', 'cor-crua'])
  assert.deepEqual(rules(`<p className="rounded-2xl rounded-t-3xl rounded-sm" />`), ['raio', 'raio', 'raio'])
  assert.deepEqual(rules(`<p className="rounded rounded-md rounded-lg rounded-xl rounded-full" />`), [])
})

test('outline-none só com foco substituto na mesma string', () => {
  assert.deepEqual(rules(`<b className="outline-none" />`), ['outline-none'])
  assert.deepEqual(rules(`<b className="outline-none focus-ring" />`), [])
  assert.deepEqual(rules(`<b className="outline-none focus-visible:bg-brand" />`), [])
  assert.deepEqual(rules(`<b className="focus:outline-none focus:border-brand" />`), [])
  assert.deepEqual(rules('<b className={`outline-none ${on ? "group-focus-visible:ring-2" : ""}`} />'), [])
})

test('<svg> fora de shared/ui/icons e dos gráficos liberados', () => {
  assert.deepEqual(rules(`const a = <svg viewBox="0 0 1 1" />`), ['svg'])
  assert.deepEqual(rules(`const a = <svg><path /></svg>`, R + 'shared/ui/icons/media.tsx'), [])
  assert.deepEqual(rules(`const a = <svg />`, R + 'features/call/components/ConnectionQualityBars.tsx'), [])
})

test('cada achado traz a linha', () => {
  const [v] = scanDesign(`const a = 1\nconst b = <p className="bg-red-500" />`, R + 'a.tsx')
  assert.equal(v.line, 2)
})

test('catraca: só falha se os arquivos tocados saem com mais ocorrências de uma regra', () => {
  const file = R + 'features/x/components/X.tsx'
  const before = `<p className="text-[11px] bg-red-500">✕</p>`
  assert.deepEqual(ratchetErrors([{ file, before, after: before }]), [])
  assert.deepEqual(ratchetErrors([{ file, before, after: `<p className="text-[11px]">✕</p>` }]), [])
  const errors = ratchetErrors([{ file, before, after: `<p className="text-[11px] text-[10px] bg-red-500">✕ ✓</p>` }])
  assert.equal(errors.length, 1)
  assert.match(errors[0], /texto-px: 1 → 2/)
  assert.match(errors[0], /X\.tsx \(linha 1, 1\)/)
})

test('arquivo novo começa do zero', () => {
  const errors = ratchetErrors([{ file: R + 'features/x/components/Novo.tsx', before: null, after: `<i className="rounded-2xl">🎉</i>` }])
  assert.deepEqual(errors.map((e) => e.split(':')[0]), ['icone-texto', 'raio'])
})

test('extrair para arquivo novo não piora: o achado só mudou de lugar', () => {
  const god = R + 'features/x/components/Grande.tsx'
  const part = R + 'features/x/components/Parte.tsx'
  const errors = ratchetErrors([
    { file: god, before: `<a className="text-[11px]" /><b className="bg-red-500" />`, after: `<b className="bg-red-500" />` },
    { file: part, before: null, after: `<a className="text-[11px]" />` }
  ])
  assert.deepEqual(errors, [])
})
