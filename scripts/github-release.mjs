// Publica a versão do app desktop como GitHub Release (tag v<versão>) com os
// instaladores, as assinaturas e os manifestos (docs/adr/0028).
//
//   GH_TOKEN=… GH_REPO=dono/repo node scripts/github-release.mjs <versão> <pasta> <notas.md>
//
// <pasta> é a saída do release-win.sh/release-linux.sh (backend/updates). A
// release nasce rascunho, recebe todos os arquivos e só depois vira pública e
// "latest": ninguém vê uma release pela metade. Rodar de novo na mesma versão
// (o deploy falhou depois da release) apaga a release e a tag e cria de novo.
//
// Notas: as entradas do <notas.md> (changelog/next.md, que acumula entre
// deploys) que o mesmo arquivo na tag da release anterior não tinha.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseNotes } from './publish-changelog.mjs'

const MANIFESTS = ['latest.yml', 'latest-linux.yml', 'latest-linux-tar.yml']

/** Arquivos da release, na ordem do upload. */
export function releaseAssets(version) {
  const setup = `Salinha-${version}-setup.exe`
  const appImage = `Salinha-${version}-x64.AppImage`
  const tarball = `Salinha-${version}-x64.tar.gz`
  return [
    setup,
    `${setup}.blockmap`,
    `${setup}.sig`,
    appImage,
    `${appImage}.sig`,
    tarball,
    `${tarball}.sig`,
    ...MANIFESTS
  ]
}

export function manifestVersion(yml) {
  const match = /^version:[ \t]*['"]?([^'"\s]+)/m.exec(yml)
  return match ? match[1] : null
}

/**
 * O que impede a publicação: arquivo ausente ou manifesto de outra versão.
 * `read(nome)`: conteúdo (basta '' para os binários) ou null se não existe.
 */
export function missingArtifacts(version, read) {
  const problems = []
  for (const name of releaseAssets(version)) {
    const content = read(name)
    if (content === null) {
      problems.push(`${name} (não existe)`)
      continue
    }
    const found = MANIFESTS.includes(name) ? manifestVersion(content) : version
    if (found !== version) problems.push(`${name} (versão ${found}, esperada ${version})`)
  }
  return problems
}

/** Entradas de `current` que `previous` (o next.md da release anterior) não tinha. */
export function newEntries(current, previous) {
  const key = ({ kind, text }) => `${kind}\n${text}`
  const seen = new Set(previous ? parseNotes(previous).entries.map(key) : [])
  return parseNotes(current).entries.filter((entry) => !seen.has(key(entry)))
}

const HEADINGS = { feature: 'Novidades', fix: 'Correções' }

export function notesMarkdown(entries) {
  const sections = Object.entries(HEADINGS)
    .map(([kind, heading]) => {
      const bullets = entries.filter((entry) => entry.kind === kind).map((e) => `- ${e.text}`)
      return bullets.length ? `## ${heading}\n\n${bullets.join('\n')}\n` : ''
    })
    .filter(Boolean)
  return sections.length ? sections.join('\n') : 'Sem notas novas nesta versão.\n'
}

/** Release publicada mais recente que não é a desta versão (`tags`: uma por linha). */
export function previousTag(tags, tag) {
  return (
    tags
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line && line !== tag) ?? null
  )
}

/** `gh` que devolve null em vez de lançar (release que não existe, rede). */
function tryGh(gh, args) {
  try {
    return gh(args)
  } catch {
    return null
  }
}

function previousNotes(gh, tag) {
  const tags = tryGh(gh, [
    'release',
    'list',
    '--exclude-drafts',
    '--exclude-pre-releases',
    '--limit',
    '20',
    '--json',
    'tagName',
    '--jq',
    '.[].tagName'
  ])
  const previous = tags === null ? null : previousTag(tags, tag)
  if (!previous) return null
  return tryGh(gh, [
    'api',
    '-H',
    'Accept: application/vnd.github.raw+json',
    `repos/{owner}/{repo}/contents/changelog/next.md?ref=${previous}`
  ])
}

/**
 * Cria a release (recria, se já existe) e a publica como latest.
 * `gh(args)`: roda o gh e devolve a saída; lança se ele falhar.
 */
export function publishRelease({ version, dir, notes, target, gh, writeNotes }) {
  const tag = `v${version}`
  const notesFile = writeNotes(notesMarkdown(newEntries(notes, previousNotes(gh, tag))))
  const files = releaseAssets(version).map((name) => join(dir, name))
  // Re-run (o deploy falhou depois da release): começa do zero, para a tag
  // apontar para o commit deste deploy e não para o da tentativa anterior.
  if (tryGh(gh, ['release', 'view', tag, '--json', 'tagName']) !== null) {
    gh(['release', 'delete', tag, '--cleanup-tag', '--yes'])
  }
  gh(['release', 'create', tag, '--draft', '--target', target, '--title', `Salinha ${version}`,
    '--notes-file', notesFile, ...files])
  gh(['release', 'edit', tag, '--draft=false', '--latest'])
}

function readArtifact(dir, name) {
  const path = join(dir, name)
  if (!existsSync(path)) return null
  return MANIFESTS.includes(name) ? readFileSync(path, 'utf8') : ''
}

function main([version, dir, notesPath]) {
  if (!version || !dir || !notesPath) {
    throw new Error('uso: GH_TOKEN=… GH_REPO=dono/repo github-release.mjs <versão> <pasta> <notas.md>')
  }
  const problems = missingArtifacts(version, (name) => readArtifact(dir, name))
  if (problems.length) throw new Error(`release ${version} incompleta: ${problems.join(', ')}`)
  const target =
    process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  publishRelease({
    version,
    dir,
    notes: readFileSync(notesPath, 'utf8'),
    target,
    gh: (args) => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }),
    writeNotes: (text) => {
      const file = join(mkdtempSync(join(tmpdir(), 'release-notes-')), 'notas.md')
      writeFileSync(file, text)
      return file
    }
  })
  console.log(`GitHub Release v${version} publicada (latest) com ${releaseAssets(version).length} arquivos`)
}

if (process.argv[1]?.endsWith('github-release.mjs')) {
  try {
    main(process.argv.slice(2))
  } catch (err) {
    console.error(err.stderr?.toString() || err.message)
    process.exit(1)
  }
}
