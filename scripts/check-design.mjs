// Catraca de design (docs/ai/exemplos/design.md): nos arquivos do renderer
// tocados pelo diff, nenhuma regra pode sair com mais ocorrências do que
// entrou (somando os arquivos tocados; arquivo novo entra com zero).
//
//   node scripts/check-design.mjs               # diff contra origin/develop (ou origin/main)
//   node scripts/check-design.mjs --base HEAD~3
//   node scripts/check-design.mjs --all         # inventário do renderer inteiro (não falha)
//
// Linha liberada de propósito: `// design-allow: <motivo>` nela ou na de cima.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { changedLines, defaultBase, renames } from './lib/diff.mjs'
import { ROOT } from './lib/run.mjs'

const require = createRequire(path.join(ROOT, 'frontend/package.json'))
const ts = require('typescript')

const RENDERER = 'frontend/src/renderer/src/'

export const RULES = {
  'icone-texto': 'emoji ou caractere Unicode como ícone: use um ícone de shared/ui/icons',
  'texto-px': 'text-[Npx]: use a escala text-ds-*',
  'hex-classe': '[#hex] em classe: use os tokens de assets/theme.css',
  'cor-crua': 'cor crua do Tailwind: use brand, danger, warning ou success',
  raio: 'rounded-2xl/3xl/sm: use rounded, rounded-md, -lg, -xl ou -full',
  'outline-none': 'outline-none sem foco substituto: use focus-ring (ou focus-*/focus-within na mesma classe)',
  svg: '<svg> fora de shared/ui/icons: ícone novo entra no conjunto'
}

// Conteúdo, notação de tecla e efeito visual: aqui o caractere é o próprio dado.
const GLYPH_ALLOW = [
  'features/chat/lib/emotes.ts',
  'features/settings/lib/keybinds.ts',
  'features/profile/lib/effects/',
  'features/profile/components/ProfileCardFrame.tsx',
  'features/profile/components/BirthdayModal.tsx',
  'features/notifications/lib/notifications.ts',
  'features/call/lib/screenStatsFormat.ts'
]

// Gráficos de dados e logos de marca: desenho próprio, não ícone de UI.
const SVG_ALLOW = [
  'shared/ui/icons/',
  'shared/ui/StatusIcon.tsx',
  'features/call/components/ConnectionQualityBars.tsx',
  'features/call/components/ConnectionStatsPopover.tsx',
  'features/call/components/ScreenStatsPanel.tsx',
  'features/friends/components/GroupIcon.tsx',
  'features/levels/components/Crown.tsx',
  'features/levels/components/LevelUpBanner.tsx',
  'features/activity/components/GameIcon.tsx',
  'features/activity/components/MusicIcon.tsx',
  'features/serverlevel/components/ServerLevelUpView.tsx',
  'features/profile/components/LinkIcon.tsx'
]

// Setas, símbolos técnicos, formas, blocos, símbolos/dingbats, emoji, × e •.
const GLYPH = /[←-⇿⌀-⏿▀-◿☀-➿⬀-⯿〰×•\u{1F000}-\u{1FAFF}]/u
const CLASS_RULES = [
  ['texto-px', /(?<![\w-])text-\[\d+(?:\.\d+)?px\]/g],
  ['hex-classe', /-\[#[0-9a-fA-F]{3,8}\]/g],
  [
    'cor-crua',
    /(?<![\w-])(?:bg|text|border|ring|from|to|via|shadow|outline|fill|stroke|divide|decoration|placeholder|caret|accent)-(?:violet|red|amber|emerald|green|blue|yellow|orange|purple|indigo|pink|rose|sky|cyan|teal|lime|fuchsia|slate|zinc|neutral|stone)-\d{2,3}\b/g
  ],
  ['raio', /(?<![\w-])rounded(?:-[trblse]{1,2})?-(?:2xl|3xl|sm)(?![\w-])/g]
]
const BARE_OUTLINE_NONE = /(?<![\w:-])outline-none(?![\w-])/
const ALLOW_COMMENT = /design-allow:\s*\S/

const rel = (file) => file.slice(RENDERER.length)
const allowed = (file, list) => list.some((prefix) => rel(file).startsWith(prefix))

/** Arquivo de código do renderer (sem testes e declarações). */
export const isDesignFile = (file) =>
  file.startsWith(RENDERER) && /\.tsx?$/.test(file) && !/\.(test\.tsx?|d\.ts)$/.test(file)

// Trechos de texto do código: strings, templates (as partes literais juntas) e texto JSX.
function textUnits(source) {
  const units = []
  const visit = (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isJsxText(node)) {
      units.push({ node, text: node.text })
    } else if (ts.isTemplateExpression(node)) {
      const text = [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(' ')
      // O foco substituto pode vir de uma expressão dentro do template.
      units.push({ node, text, context: node.getText(source) })
      node.templateSpans.forEach((s) => visit(s.expression))
      return
    } else if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(source) === 'svg') {
      units.push({ node, svg: true })
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return units
}

function unitViolations(unit, file) {
  if (unit.svg) return allowed(file, SVG_ALLOW) ? [] : ['svg']
  const found = []
  if (GLYPH.test(unit.text) && !allowed(file, GLYPH_ALLOW)) found.push('icone-texto')
  for (const [rule, re] of CLASS_RULES) found.push(...[...unit.text.matchAll(re)].map(() => rule))
  if (BARE_OUTLINE_NONE.test(unit.text) && !(unit.context ?? unit.text).includes('focus')) found.push('outline-none')
  return found
}

/** Achados de design num arquivo: [{ rule, line }]. */
export function scanDesign(text, file) {
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind)
  const lines = text.split('\n')
  const isAllowed = (line) => ALLOW_COMMENT.test(lines[line - 1] ?? '') || ALLOW_COMMENT.test(lines[line - 2] ?? '')
  return textUnits(source).flatMap((unit) => {
    const line = source.getLineAndCharacterOfPosition(unit.node.getStart(source)).line + 1
    if (isAllowed(line)) return []
    return unitViolations(unit, file).map((rule) => ({ rule, line }))
  })
}

const countBy = (violations) =>
  violations.reduce((acc, v) => ({ ...acc, [v.rule]: (acc[v.rule] ?? 0) + 1 }), {})

/**
 * Catraca do diff: por regra, o total nos arquivos tocados não pode subir.
 * Somar (em vez de olhar arquivo a arquivo) deixa extrair código de um god
 * file para um arquivo novo sem "piorar": o achado só mudou de lugar.
 * entries: [{ file, before (null = arquivo novo), after }].
 */
export function ratchetErrors(entries) {
  const scanned = entries.map(({ file, before, after }) => ({
    file,
    was: countBy(before === null ? [] : scanDesign(before, file)),
    now: scanDesign(after, file)
  }))
  const total = (pick) => scanned.reduce((acc, f) => {
    for (const [rule, n] of Object.entries(pick(f))) acc[rule] = (acc[rule] ?? 0) + n
    return acc
  }, {})
  const was = total((f) => f.was)
  const now = total((f) => countBy(f.now))
  return Object.keys(RULES)
    .filter((rule) => (now[rule] ?? 0) > (was[rule] ?? 0))
    .map((rule) => {
      const where = scanned
        .map((f) => ({ ...f, lines: f.now.filter((v) => v.rule === rule).map((v) => v.line) }))
        .filter((f) => f.lines.length > (f.was[rule] ?? 0))
        .map((f) => `${f.file} (linha ${f.lines.join(', ')})`)
      return `${rule}: ${was[rule] ?? 0} → ${now[rule]}. ${RULES[rule]}
      ${where.join('\n      ')}`
    })
}

const git = (args) =>
  execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] })

function textAt(ref, file) {
  try {
    return git(['show', `${ref}:${file}`])
  } catch {
    return null // não existia na base
  }
}

function inventory() {
  const files = git(['ls-files', RENDERER]).split('\n').filter(isDesignFile)
  const totals = countBy(files.flatMap((f) => scanDesign(readFileSync(path.join(ROOT, f), 'utf8'), f)))
  console.log('Ocorrências no renderer (meta: zero):')
  for (const rule of Object.keys(RULES)) console.log(`  ${rule.padEnd(13)} ${totals[rule] ?? 0}`)
}

function main() {
  const args = process.argv.slice(2)
  process.chdir(ROOT)
  if (args.includes('--all')) return inventory()
  const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : defaultBase()
  const mergeBase = git(['merge-base', base, 'HEAD']).trim()
  const moved = renames(base)
  const errors = ratchetErrors(
    Object.keys(changedLines(base))
      .filter((f) => isDesignFile(f) && existsSync(path.join(ROOT, f)))
      .map((f) => ({ file: f, before: textAt(mergeBase, moved[f] ?? f), after: readFileSync(path.join(ROOT, f), 'utf8') }))
  )
  if (errors.length) {
    console.error(`❌ Design: ${errors.length} regra(s) pioraram (docs/ai/exemplos/design.md)\n` + errors.map((e) => `  - ${e}`).join('\n'))
    process.exit(1)
  }
  console.log('✅ Catraca de design ok.')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
