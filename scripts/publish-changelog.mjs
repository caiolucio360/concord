// Publica as notas da release no changelog do app.
//
//   CHANGELOG_TOKEN=… node scripts/publish-changelog.mjs <versão> <pasta> <url-base>
//   node scripts/publish-changelog.mjs --check <pasta>
//
// Lê os arquivos de `changelog/pending/` (um por mudança, com as seções
// "## Novidades" e "## Correções" em bullets) e faz o PUT idempotente em
// <url-base>/api/changelog/<versão>. Cada nota leva o nome do arquivo de
// origem: o CI não apaga os arquivos já publicados do git, e é pela origem que
// o servidor guarda na versão só as notas que nenhuma versão anterior trouxe.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export const EMPTY_NOTES = '## Novidades\n\n## Correções\n'

// Mesmos limites de backend/internal/changelog/changelog.go: o erro aparece
// aqui, antes do merge, e não no PUT depois que a versão já está no ar.
export const MAX_ENTRIES = 1000
export const MAX_ENTRY_TEXT = 1000
export const MAX_SOURCE = 200

const SECTIONS = { novidades: 'feature', correções: 'fix', correcoes: 'fix' }

export function parseNotes(markdown, source = '') {
  const entries = []
  let kind = null
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const heading = /^##\s+(.+)$/.exec(line)
    if (heading) {
      kind = SECTIONS[heading[1].trim().toLowerCase()]
      if (!kind) throw new Error(`seção desconhecida: ${heading[1].trim()}`)
      continue
    }
    const bullet = /^[-*]\s+(.+)$/.exec(line)
    if (!bullet) continue
    if (!kind) throw new Error(`bullet fora de uma seção: ${line}`)
    entries.push({ kind, text: bullet[1].trim(), ...(source && { source }) })
  }
  checkLimits(entries)
  return { entries }
}

/** Notas de todos os arquivos de `dir`, do arquivo mais novo (nome maior) para o mais antigo. */
export function readPending(dir) {
  const names = readdirSync(dir)
    .filter((name) => name.endsWith('.md') && name !== 'README.md')
    .sort()
    .reverse()
  const entries = names.flatMap((name) => parseFile(dir, name))
  checkLimits(entries)
  return { entries, names }
}

function parseFile(dir, name) {
  if ([...name].length > MAX_SOURCE) throw new Error(`nome de arquivo grande demais: ${name}`)
  try {
    return parseNotes(readFileSync(join(dir, name), 'utf8'), name).entries
  } catch (err) {
    throw new Error(`${name}: ${err.message}`)
  }
}

// Conta caracteres (code points), como o utf8.RuneCountInString do servidor.
function checkLimits(entries) {
  if (entries.length > MAX_ENTRIES) {
    throw new Error(`entradas demais: ${entries.length} (máximo ${MAX_ENTRIES})`)
  }
  for (const { text } of entries) {
    const size = [...text].length
    if (size > MAX_ENTRY_TEXT) {
      throw new Error(`nota com ${size} caracteres (máximo ${MAX_ENTRY_TEXT}): ${text.slice(0, 60)}…`)
    }
  }
}

export async function publishError(version, res) {
  const body = (await res.text().catch(() => '')).trim()
  return `PUT /api/changelog/${version}: HTTP ${res.status}${body ? ` ${body}` : ''}`
}

// --check <pasta>: só valida (o affected-tests pr chama quando o diff toca a pasta).
function check(dir) {
  if (!dir) throw new Error('uso: publish-changelog.mjs --check <pasta>')
  const { entries, names } = readPending(dir)
  console.log(`${dir}: ${entries.length} entradas em ${names.length} arquivos, dentro dos limites`)
}

async function main([version, dir, baseUrl]) {
  if (version === '--check') return check(dir)
  const token = process.env.CHANGELOG_TOKEN
  if (!version || !dir || !baseUrl || !token) {
    throw new Error('uso: CHANGELOG_TOKEN=… publish-changelog.mjs <versão> <pasta> <url-base>')
  }
  const { entries } = readPending(dir)
  if (entries.length === 0) console.warn(`::warning::${dir} vazia: ${version} sai sem notas`)
  const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/changelog/${version}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Changelog-Token': token },
    body: JSON.stringify({ entries })
  })
  if (!res.ok) throw new Error(await publishError(version, res))
  console.log(`changelog ${version}: ${entries.length} entradas enviadas (o servidor ignora as de arquivos já publicados)`)
}

if (process.argv[1]?.endsWith('publish-changelog.mjs')) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
}
