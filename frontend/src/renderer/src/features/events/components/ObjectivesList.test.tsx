import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { EventObjective } from '../api/events'
import ObjectivesList from './ObjectivesList'

function objective(extra: Partial<EventObjective> = {}): EventObjective {
  return {
    id: 'o1',
    kind: 'time',
    difficulty: 'easy',
    minutes: 30,
    xp: 1000,
    my_minutes: 12,
    my_done: false,
    ...extra
  }
}

function render(props: Partial<React.ComponentProps<typeof ObjectivesList>> = {}): string {
  return renderToStaticMarkup(
    <ObjectivesList objectives={[objective()]} game={null} going {...props} />
  )
}

describe('ObjectivesList', () => {
  it('sem objetivos não renderiza nada', () => {
    expect(render({ objectives: [] })).toBe('')
  })

  it('mostra o título, o XP e o progresso de cada objetivo', () => {
    const html = render()
    expect(html).toContain('Objetivos')
    expect(html).toContain('Ficar 30 min na sala do evento')
    expect(html).toContain('+1.000 XP')
    expect(html).toContain('12 de 30 min')
  })

  it('o objetivo de jogo diz o jogo do evento', () => {
    const html = render({ objectives: [objective({ kind: 'game', xp: 6000 })], game: 'Minecraft' })
    expect(html).toContain('Jogar Minecraft por 30 min')
    expect(html).toContain('+6.000 XP')
  })

  it('a barra de progresso é acessível e tem a porcentagem', () => {
    const html = render()
    expect(html).toContain('role="progressbar"')
    expect(html).toContain('aria-valuenow="40"')
    expect(html).toContain('aria-label="Ficar 30 min na sala do evento"')
    expect(html).toContain('width:40%')
  })

  it('os números de XP e de progresso usam algarismos de largura fixa', () => {
    const html = render()
    expect(html).toMatch(/class="[^"]*tabular-nums[^"]*">\+1\.000 XP/)
    expect(html).toMatch(/class="[^"]*tabular-nums[^"]*">12 de 30 min/)
  })

  it('cumprido mostra "Cumprido" no lugar de "N de M min"', () => {
    const html = render({ objectives: [objective({ my_done: true, my_minutes: 30 })] })
    expect(html).toContain('Cumprido')
    expect(html).not.toContain('de 30 min')
    expect(html).toContain('aria-valuenow="100"')
  })

  it('quem não confirmou presença vê o convite para confirmar', () => {
    expect(render({ going: false })).toContain('Confirme presença para ganhar XP com os objetivos.')
    expect(render({ going: true })).not.toContain('Confirme presença')
  })

  it('lista todos os objetivos na ordem', () => {
    const html = render({
      objectives: [objective({ id: 'a', minutes: 15 }), objective({ id: 'b', minutes: 60 })]
    })
    expect(html.indexOf('Ficar 15 min')).toBeLessThan(html.indexOf('Ficar 60 min'))
  })
})
