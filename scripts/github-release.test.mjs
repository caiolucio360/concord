import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  manifestVersion,
  missingArtifacts,
  newEntries,
  notesMarkdown,
  previousTag,
  publishRelease,
  releaseAssets
} from './github-release.mjs'

const VERSION = '0.9.3'

const MANIFESTS = {
  'latest.yml': `version: ${VERSION}\npath: Salinha-${VERSION}-setup.exe\n`,
  'latest-linux.yml': `version: ${VERSION}\npath: 'Salinha-${VERSION}-x64.AppImage'\n`,
  'latest-linux-tar.yml': `version: ${VERSION}\npath: Salinha-${VERSION}-x64.tar.gz\n`
}

test('releaseAssets lista instaladores, assinaturas, blockmap e manifestos da versão', () => {
  assert.deepEqual(releaseAssets(VERSION), [
    'Salinha-0.9.3-setup.exe',
    'Salinha-0.9.3-setup.exe.blockmap',
    'Salinha-0.9.3-setup.exe.sig',
    'Salinha-0.9.3-x64.AppImage',
    'Salinha-0.9.3-x64.AppImage.sig',
    'Salinha-0.9.3-x64.tar.gz',
    'Salinha-0.9.3-x64.tar.gz.sig',
    'latest.yml',
    'latest-linux.yml',
    'latest-linux-tar.yml'
  ])
})

test('manifestVersion lê a versão com ou sem aspas', () => {
  assert.equal(manifestVersion('version: 1.2.3\npath: x\n'), '1.2.3')
  assert.equal(manifestVersion("path: x\nversion: '1.2.4'\r\n"), '1.2.4')
  assert.equal(manifestVersion('path: x\n'), null)
})

test('missingArtifacts: tudo presente e na versão certa', () => {
  const files = new Map(releaseAssets(VERSION).map((name) => [name, MANIFESTS[name] ?? 'bin']))
  assert.deepEqual(missingArtifacts(VERSION, (name) => files.get(name) ?? null), [])
})

test('missingArtifacts aponta arquivo que falta e manifesto de outra versão', () => {
  const files = new Map(releaseAssets(VERSION).map((name) => [name, MANIFESTS[name] ?? 'bin']))
  files.delete('Salinha-0.9.3-x64.tar.gz.sig')
  files.set('latest-linux.yml', 'version: 0.9.2\n')
  assert.deepEqual(missingArtifacts(VERSION, (name) => files.get(name) ?? null), [
    'Salinha-0.9.3-x64.tar.gz.sig (não existe)',
    'latest-linux.yml (versão 0.9.2, esperada 0.9.3)'
  ])
})

const note = (source, text, kind = 'feature') => ({ kind, text, source })

test('newEntries: só as notas de arquivos que a release anterior não tinha', () => {
  const entries = [note('nova.md', 'Nova'), note('nova.md', 'Bug novo', 'fix'), note('velha.md', 'Antiga')]
  assert.deepEqual(newEntries(entries, new Set(['velha.md'])), [
    note('nova.md', 'Nova'),
    note('nova.md', 'Bug novo', 'fix')
  ])
})

// Regressão: reescrever uma nota já publicada fazia ela sair de novo como nova.
test('newEntries: nota reescrita num arquivo antigo não volta', () => {
  assert.deepEqual(newEntries([note('velha.md', 'Texto reescrito')], new Set(['velha.md'])), [])
})

test('newEntries sem release anterior: todas as notas', () => {
  assert.deepEqual(newEntries([note('a.md', 'Uma')], null), [note('a.md', 'Uma')])
})

test('notesMarkdown separa novidades e correções e omite seção vazia', () => {
  assert.equal(
    notesMarkdown([
      { kind: 'feature', text: 'Nova' },
      { kind: 'fix', text: 'Bug novo' }
    ]),
    '## Novidades\n\n- Nova\n\n## Correções\n\n- Bug novo\n'
  )
  assert.equal(notesMarkdown([{ kind: 'fix', text: 'Só bug' }]), '## Correções\n\n- Só bug\n')
  assert.equal(notesMarkdown([]), 'Sem notas novas nesta versão.\n')
})

test('previousTag pula a própria tag (reexecução do deploy)', () => {
  assert.equal(previousTag('v0.9.3\nv0.9.2\nv0.9.1\n', 'v0.9.3'), 'v0.9.2')
  assert.equal(previousTag('v0.9.2\n', 'v0.9.3'), 'v0.9.2')
  assert.equal(previousTag('', 'v0.9.3'), null)
})

/** gh falso: responde por prefixo dos argumentos e guarda as chamadas. */
function fakeGh(responses = {}) {
  const calls = []
  const gh = (args) => {
    calls.push(args)
    const key = Object.keys(responses).find((prefix) => args.join(' ').startsWith(prefix))
    const answer = key === undefined ? '' : responses[key]
    if (answer instanceof Error) throw answer
    return answer
  }
  return { gh, calls }
}

function publish(gh, entries = [note('nova.md', 'Nova')]) {
  const written = []
  publishRelease({
    version: VERSION,
    dir: '/updates',
    entries,
    target: 'abc123',
    gh,
    writeNotes: (text) => {
      written.push(text)
      return '/tmp/notas.md'
    }
  })
  return written
}

test('publishRelease cria rascunho com os arquivos e só então publica como latest', () => {
  const { gh, calls } = fakeGh({
    'release view v0.9.3': new Error('release not found'),
    'release list': 'v0.9.2\n',
    'api ': 'velha.md\n'
  })
  const written = publish(gh, [note('velha.md', 'Velha'), note('nova.md', 'Nova')])
  assert.deepEqual(written, ['## Novidades\n\n- Nova\n'])
  const create = calls.find((args) => args[1] === 'create')
  assert.deepEqual(create.slice(0, 10), [
    'release',
    'create',
    'v0.9.3',
    '--draft',
    '--target',
    'abc123',
    '--title',
    'Salinha 0.9.3',
    '--notes-file',
    '/tmp/notas.md'
  ])
  assert.deepEqual(
    create.slice(10),
    releaseAssets(VERSION).map((name) => `/updates/${name}`)
  )
  assert.deepEqual(calls.at(-1), ['release', 'edit', 'v0.9.3', '--draft=false', '--latest'])
  assert.ok(calls.indexOf(create) < calls.length - 1)
})

test('publishRelease lista os arquivos de notas da release anterior na tag dela', () => {
  const { gh, calls } = fakeGh({
    'release view v0.9.3': new Error('release not found'),
    'release list': 'v0.9.2\n'
  })
  publish(gh)
  const api = calls.find((args) => args[0] === 'api')
  assert.ok(api.includes('repos/{owner}/{repo}/contents/changelog/pending?ref=v0.9.2'))
})

test('publishRelease em reexecução: apaga a release e a tag antigas e cria de novo', () => {
  const { gh, calls } = fakeGh({ 'release list': 'v0.9.3\nv0.9.2\n' })
  publish(gh)
  const remove = calls.findIndex((args) => args[1] === 'delete')
  const create = calls.findIndex((args) => args[1] === 'create')
  assert.deepEqual(calls[remove], ['release', 'delete', 'v0.9.3', '--cleanup-tag', '--yes'])
  assert.ok(remove < create)
  assert.equal(calls[create][5], 'abc123')
  assert.deepEqual(calls.at(-1), ['release', 'edit', 'v0.9.3', '--draft=false', '--latest'])
})

test('publishRelease sem release anterior (ou sem acesso a ela): publica todas as notas', () => {
  const { gh } = fakeGh({
    'release view v0.9.3': new Error('release not found'),
    'release list': new Error('HTTP 502')
  })
  assert.deepEqual(publish(gh, [note('a.md', 'Uma')]), ['## Novidades\n\n- Uma\n'])
})

// A tag anterior ainda guardava as notas no next.md (sem a pasta): a API dá 404.
test('publishRelease com a pasta de notas ausente na tag anterior: publica todas as notas', () => {
  const { gh } = fakeGh({
    'release view v0.9.3': new Error('release not found'),
    'release list': 'v0.9.2\n',
    'api ': new Error('HTTP 404')
  })
  assert.deepEqual(publish(gh, [note('a.md', 'Uma')]), ['## Novidades\n\n- Uma\n'])
})
