import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ObjectiveInput } from '../api/events'
import ObjectiveRow from './ObjectiveRow'

const time: ObjectiveInput = { kind: 'time', difficulty: 'easy', minutes: 30 }

function render(props: Partial<React.ComponentProps<typeof ObjectiveRow>> = {}): string {
  return renderToStaticMarkup(
    <ObjectiveRow
      index={0}
      objective={time}
      durationMinutes={120}
      hasGame
      onChange={() => {}}
      onRemove={() => {}}
      {...props}
    />
  )
}

/** A tag do campo com esse nome. */
function tag(html: string, name: string): string {
  const match = new RegExp(`<select[^>]*name="${name}"[^>]*>`).exec(html)
  if (!match) throw new Error(`sem campo ${name}`)
  return match[0]
}

describe('ObjectiveRow', () => {
  it('tem os campos Tipo, Dificuldade e Meta com os rótulos aprovados', () => {
    const html = render()
    for (const label of ['Tipo', 'Dificuldade', 'Meta']) expect(html).toContain(label)
    for (const option of ['Ficar na sala', 'Jogar o jogo do evento', 'Fácil', 'Médio', 'Difícil']) {
      expect(html).toContain(`>${option}</option>`)
    }
  })

  it('marca o que está escolhido', () => {
    const html = render({ objective: { kind: 'game', difficulty: 'hard', minutes: 60 } })
    expect(html).toMatch(/<option[^>]*value="game"[^>]*selected[^>]*>/)
    expect(html).toMatch(/<option[^>]*value="hard"[^>]*selected[^>]*>/)
    expect(html).toMatch(/<option[^>]*value="60"[^>]*selected[^>]*>60 min/)
  })

  it('só oferece metas que cabem na duração do evento', () => {
    const html = render({ durationMinutes: 30 })
    expect(html).toContain('>15 min</option>')
    expect(html).toContain('>30 min</option>')
    expect(html).not.toContain('>45 min</option>')
    expect(html).not.toContain('>120 min</option>')
  })

  it('sem jogo no evento, o tipo "jogar" fica desativado e a dica explica', () => {
    const html = render({ hasGame: false })
    expect(html).toMatch(/<option[^>]*value="game"[^>]*disabled[^>]*>/)
    expect(html).toContain('Escolha um jogo para o evento.')
    const withGame = render({ hasGame: true })
    expect(withGame).not.toMatch(/<option[^>]*value="game"[^>]*disabled[^>]*>/)
    expect(withGame).not.toContain('Escolha um jogo para o evento.')
  })

  it('o objetivo de jogo avisa que só conta no app para Windows', () => {
    const game = render({ objective: { kind: 'game', difficulty: 'easy', minutes: 30 } })
    expect(game).toContain('Conta só para quem usa o app para Windows.')
    expect(render()).not.toContain('Conta só para quem usa o app para Windows.')
  })

  it('as dicas ficam ligadas ao campo Tipo para o leitor de tela', () => {
    const noGame = render({ hasGame: false, index: 1 })
    expect(tag(noGame, 'objective-kind-1')).toContain('aria-describedby="objective-hint-1"')
    expect(noGame).toMatch(/<div[^>]*id="objective-hint-1"[^>]*>[\s\S]*Escolha um jogo para o evento\./)

    const game = render({ objective: { kind: 'game', difficulty: 'easy', minutes: 30 } })
    expect(tag(game, 'objective-kind-0')).toContain('aria-describedby="objective-hint-0"')

    // Sem nenhuma dica, não aponta para nada.
    expect(tag(render(), 'objective-kind-0')).not.toContain('aria-describedby')
    expect(render()).not.toContain('objective-hint-0')
  })

  it('o botão de remover tem nome acessível', () => {
    expect(render()).toMatch(/<button[^>]*aria-label="Remover objetivo"/)
  })

  it('com o evento em andamento (disabled), trava os campos e esconde o remover', () => {
    const html = render({ disabled: true })
    for (const name of ['objective-kind-0', 'objective-difficulty-0', 'objective-minutes-0']) {
      expect(tag(html, name)).toContain('disabled')
    }
    expect(html).not.toContain('Remover objetivo')
  })

  it('os campos têm nomes por posição, para mais de uma linha', () => {
    const html = render({ index: 2 })
    expect(html).toContain('name="objective-kind-2"')
    expect(html).toContain('name="objective-minutes-2"')
  })
})
