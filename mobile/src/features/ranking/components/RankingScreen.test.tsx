import { fireEvent, render, screen } from '@testing-library/react-native'
import type { Ranking, RankingEntry } from '../api/ranking'
import { useRankingStore } from '../store/rankingStore'
import { ImprovementsHub } from './ImprovementsHub'
import { RankingScreen } from './RankingScreen'

jest.mock('../api/ranking', () => ({ fetchRanking: jest.fn() }))

const entry = (position: number, over: Partial<RankingEntry> = {}): RankingEntry => ({
  position,
  user_id: `u${position}`,
  username: `user${position}`,
  display_name: `Pessoa ${position}`,
  avatar_url: null,
  name_style: { font: 'default', effect: 'solid', colors: [] },
  level: 10 + position,
  xp: 1000 * (10 - position),
  ...over
})
const ranking = (n: number, me: Ranking['me'] = { position: 2, level: 12, xp: 8000 }): Ranking => ({ entries: Array.from({ length: n }, (_, i) => entry(i + 1)), me })
const seed = (state: Partial<ReturnType<typeof useRankingStore.getState>>) => {
  const fetch = jest.fn().mockResolvedValue(undefined)
  useRankingStore.setState({ ranking: null, loading: false, error: null, fetch, ...state })
  return fetch
}

describe('RankingScreen', () => {
  const props = { onBack: jest.fn(), onOpenProfile: jest.fn() }
  beforeEach(() => jest.clearAllMocks())

  it('carrega ao abrir; enquanto carrega mostra o indicador', async () => {
    const fetch = seed({ loading: true })
    await render(<RankingScreen {...props} />)
    expect(fetch).toHaveBeenCalled()
    expect(screen.getByTestId('ranking-loading')).toBeOnTheScreen()
  })

  it('sem resposta (erro): mostra o aviso e tenta de novo', async () => {
    const fetch = seed({ error: 'Não foi possível carregar o ranking.' })
    await render(<RankingScreen {...props} />)
    expect(screen.getByText('Não foi possível carregar o ranking.')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('ranking vazio convida a entrar numa call', async () => {
    seed({ ranking: { entries: [], me: null } })
    await render(<RankingScreen {...props} />)
    expect(screen.getByText('Ninguém no ranking ainda. Entre numa call e seja o primeiro!')).toBeOnTheScreen()
  })

  it('pódio (2º, 1º, 3º), classificação, a sua linha e a faixa "Sua posição"', async () => {
    seed({ ranking: ranking(5) })
    await render(<RankingScreen {...props} />)
    expect(screen.getByLabelText('Pódio')).toBeOnTheScreen()
    expect(screen.getByText('Pessoa 1')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: '#4 Pessoa 4' })).toBeOnTheScreen()
    expect(screen.getByText('Sua posição: #2')).toBeOnTheScreen()
    expect(screen.getAllByText('8.000 XP').length).toBeGreaterThan(0)
  })

  it('tocar numa pessoa abre o perfil dela; voltar volta', async () => {
    seed({ ranking: ranking(5) })
    await render(<RankingScreen {...props} />)
    await fireEvent.press(screen.getByRole('button', { name: '#5 Pessoa 5' }))
    expect(props.onOpenProfile).toHaveBeenCalledWith('u5')
    await fireEvent.press(screen.getByRole('button', { name: 'Pessoa 1, 1º lugar' }))
    expect(props.onOpenProfile).toHaveBeenCalledWith('u1')
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }))
    expect(props.onBack).toHaveBeenCalled()
  })

  it('quem ainda não tem XP vê o convite na faixa; erro com ranking antigo mostra o aviso por cima', async () => {
    seed({ ranking: ranking(3, null), error: 'Falhou agora' })
    await render(<RankingScreen {...props} />)
    expect(screen.getByText('Fique em call para entrar no ranking')).toBeOnTheScreen()
    expect(screen.getByText('Falhou agora')).toBeOnTheScreen()
  })
})

describe('ImprovementsHub', () => {
  it('card do Rank global com a sua posição, e abre o ranking', async () => {
    seed({ ranking: ranking(3) })
    const onOpenRanking = jest.fn()
    await render(<ImprovementsHub onBack={jest.fn()} onOpenRanking={onOpenRanking} onOpenChangelog={jest.fn()} />)
    expect(screen.getByText('Sua posição: #2')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Rank global' }))
    expect(onOpenRanking).toHaveBeenCalled()
  })

  it('antes do ranking carregar não mostra a posição', async () => {
    seed({ ranking: null })
    await render(<ImprovementsHub onBack={jest.fn()} onOpenRanking={jest.fn()} onOpenChangelog={jest.fn()} />)
    expect(screen.queryByText(/Sua posição/)).toBeNull()
  })

  it('card Novidades abre o changelog', async () => {
    seed({ ranking: null })
    const onOpenChangelog = jest.fn()
    await render(<ImprovementsHub onBack={jest.fn()} onOpenRanking={jest.fn()} onOpenChangelog={onOpenChangelog} />)
    await fireEvent.press(screen.getByRole('button', { name: 'Novidades' }))
    expect(onOpenChangelog).toHaveBeenCalled()
  })

  it('textos dos cards iguais aos da web', async () => {
    seed({ ranking: null })
    await render(<ImprovementsHub onBack={jest.fn()} onOpenRanking={jest.fn()} onOpenChangelog={jest.fn()} />)
    expect(screen.getByText('O que mudou em cada versão do Salinha.')).toBeOnTheScreen()
    expect(screen.getByText('Os 100 maiores níveis do Salinha.')).toBeOnTheScreen()
    expect(screen.getByText('Ajude a decidir o que vem por aí, veja o que mudou e confira quem manda nas calls.')).toBeOnTheScreen()
  })
})
