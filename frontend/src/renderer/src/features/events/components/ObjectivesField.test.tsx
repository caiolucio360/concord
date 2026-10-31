import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ObjectiveInput } from '../api/events'
import ObjectivesField from './ObjectivesField'

const one: ObjectiveInput = { kind: 'time', difficulty: 'easy', minutes: 30 }

function render(props: Partial<React.ComponentProps<typeof ObjectivesField>> = {}): string {
  return renderToStaticMarkup(
    <ObjectivesField objectives={[]} durationMinutes={120} hasGame onChange={() => {}} {...props} />
  )
}

describe('ObjectivesField', () => {
  it('tem o título e a ajuda aprovados', () => {
    const html = render()
    expect(html).toContain('Objetivos (opcional)')
    expect(html).toContain('Quem confirmar presença e cumprir o objetivo na sala do evento ganha XP.')
  })

  it('sem objetivos só tem o botão Adicionar objetivo', () => {
    const html = render()
    expect(html).toContain('Adicionar objetivo')
    expect(html).not.toContain('name="objective-kind-0"')
  })

  it('cada objetivo ganha a sua linha', () => {
    const html = render({ objectives: [one, one] })
    expect(html).toContain('name="objective-kind-0"')
    expect(html).toContain('name="objective-kind-1"')
    expect(html).not.toContain('name="objective-kind-2"')
    expect(html.match(/aria-label="Remover objetivo"/g)).toHaveLength(2)
  })

  it('no terceiro objetivo o botão de adicionar some', () => {
    expect(render({ objectives: [one, one] })).toContain('Adicionar objetivo')
    expect(render({ objectives: [one, one, one] })).not.toContain('Adicionar objetivo')
  })

  it('com o evento em andamento, trava as linhas e esconde adicionar e remover', () => {
    const html = render({ objectives: [one], disabled: true })
    expect(html).not.toContain('Adicionar objetivo')
    expect(html).not.toContain('Remover objetivo')
    expect(html).toMatch(/<select[^>]*name="objective-kind-0"[^>]*disabled/)
  })

  it('repassa se o evento tem jogo às linhas', () => {
    const html = render({ objectives: [one], hasGame: false })
    expect(html).toContain('Escolha um jogo para o evento.')
  })
})
