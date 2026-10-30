import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Poll } from '../api/messages'
import PollCard from './PollCard'
import PollAnswerRow from './PollAnswerRow'
import PollActions from './PollActions'

const later = new Date(Date.now() + 3 * 3_600_000).toISOString()

function poll(overrides: Partial<Poll> = {}): Poll {
  return {
    question: 'Jantar?',
    answers: [
      { answer_id: 1, text: 'Pizza', emoji: '🍕', count: 2, me_voted: false },
      { answer_id: 2, text: 'Sushi', count: 1, me_voted: false }
    ],
    allow_multiselect: false,
    expires_at: later,
    total_voters: 3,
    ...overrides
  }
}

const noop = async (): Promise<void> => {}
const render = (p: Poll, isAuthor = false): string =>
  renderToStaticMarkup(<PollCard poll={p} isAuthor={isAuthor} onVote={noop} onEnd={noop} />)

describe('PollCard', () => {
  it('aberta e sem voto: escolha única, Votar travado e dá para espiar', () => {
    const html = render(poll())
    expect(html).toContain('Selecione uma resposta')
    expect(html).toContain('role="radio"')
    expect(html).toContain('Mostrar resultados')
    expect(html).toMatch(/disabled=""[^>]*>Votar</)
    expect(html).toContain('3 votos')
    expect(html).not.toContain('Encerrar enquete')
  })

  it('múltipla escolha vira checkbox', () => {
    const html = render(poll({ allow_multiselect: true }))
    expect(html).toContain('Selecione uma ou mais respostas')
    expect(html).toContain('role="checkbox"')
  })

  it('já votou: resultados, a marca no seu voto e remover voto', () => {
    const p = poll()
    p.answers[1].me_voted = true
    const html = render(p, true)
    expect(html).toContain('role="list"')
    expect(html).toContain('title="Seu voto"')
    expect(html).toContain('Remover voto')
    expect(html).toContain('Encerrar enquete')
    expect(html).not.toContain('>Votar<')
  })

  it('encerrada: destaca a vencedora e não mostra ações', () => {
    const html = render(poll({ ended_at: new Date().toISOString() }), true)
    expect(html).toContain('Enquete encerrada')
    expect(html).toContain('bg-success/25')
    expect(html).not.toContain('Encerrar enquete')
    expect(html).toContain('title="2 votos"')
  })
})

describe('PollAnswerRow', () => {
  const answer = { answer_id: 1, text: 'Pizza', count: 1, me_voted: false }
  const base = { answer, percent: 50, isWinner: false, multiselect: false, disabled: false, onToggle: () => {} }

  it('escolhida antes de votar: marcada e com a caixinha cheia', () => {
    const html = renderToStaticMarkup(<PollAnswerRow {...base} isSelected showResults={false} />)
    expect(html).toContain('aria-checked="true"')
    expect(html).toContain('border-brand bg-brand/15')
  })

  it('resultado: barra com a porcentagem e o total no title', () => {
    const html = renderToStaticMarkup(<PollAnswerRow {...base} isSelected={false} showResults />)
    expect(html).toContain('width:50%')
    expect(html).toContain('title="1 voto"')
  })
})

describe('PollActions', () => {
  const base = {
    closed: false,
    hasVoted: false,
    isAuthor: false,
    peek: true,
    showResults: true,
    busy: false,
    canVote: true,
    onTogglePeek: () => {},
    onRemoveVote: () => {},
    onEnd: () => {},
    onVote: () => {}
  }

  it('espiando: volta a votar e esconde o Votar', () => {
    const html = renderToStaticMarkup(<PollActions {...base} />)
    expect(html).toContain('Voltar a votar')
    expect(html).not.toContain('Votar</button>')
  })
})
