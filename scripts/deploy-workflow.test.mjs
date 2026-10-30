// Garantias do .github/workflows/deploy.yml que, quebradas, só apareceriam em
// produção (o CI não roda testes). Lê o texto: os passos são uma lista simples.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const workflow = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8')

/** Nome de cada passo, na ordem, com o texto do passo. */
function steps() {
  return workflow
    .split(/\n(?=      - (?:name|uses): )/)
    .slice(1)
    .map((text) => ({ name: /- name: (.+)/.exec(text)?.[1]?.trim() ?? '', text }))
}

function step(name) {
  const found = steps().find((s) => s.name === name)
  assert.ok(found, `passo "${name}" não existe`)
  return found
}

const position = (name) => steps().findIndex((s) => s.name === name)

test('o job pode criar releases (GITHUB_TOKEN com contents: write)', () => {
  assert.match(workflow, /\n {4}permissions:\n {6}contents: write\n/)
})

test('a GitHub Release sai depois dos instaladores e antes dos manifestos na VPS', () => {
  const release = position('GitHub Release')
  assert.ok(release > position('App desktop (instalador assinado)'))
  assert.ok(release > position('App desktop Linux (AppImage e .tar.gz assinados)'))
  // A VPS publica os latest*.yml; o Caddy manda os instaladores para a release.
  assert.ok(release < position('Publicar na VPS (backend + página de download + app web + atualização do app)'))
})

test('a release usa o token do Actions e o script do repo, sem ação de terceiros', () => {
  const { text } = step('GitHub Release')
  assert.match(text, /GH_TOKEN: \$\{\{ github\.token \}\}/)
  assert.match(text, /GH_REPO: \$\{\{ github\.repository \}\}/)
  assert.match(
    text,
    /node scripts\/github-release\.mjs "\$\{\{ steps\.version\.outputs\.version \}\}" backend\/updates changelog\/next\.md/
  )
  assert.doesNotMatch(text, /uses:/)
})

test('o Conferir segue o redirect dos instaladores e confere a release no GitHub', () => {
  const { text } = step('Conferir')
  assert.match(text, /curl -fsSIL "\$\{PUBLIC_URL%\/\}\/updates\/\$path"/)
  assert.match(text, /curl -fsSL "\$\{PUBLIC_URL%\/\}\/updates\/\$path\.sig"/)
  assert.match(text, /releases\/download\/v\$\{\{ steps\.version\.outputs\.version \}\}\/\$path/)
})
