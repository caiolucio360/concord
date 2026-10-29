import { act, fireEvent, render, screen } from '@testing-library/react-native'
import type { Badge } from '../api/badges'
import { useBadgeStore } from '../store/badgeStore'
import { useLevelStore } from '../store/levelStore'
import { BadgeIcon } from './BadgeIcon'
import { BadgeRow } from './BadgeRow'
import { BadgesModal } from './BadgesModal'
import { LevelBadge, LevelPill } from './LevelBadge'

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }))
jest.mock('../api/levels', () => ({ fetchLevels: jest.fn().mockResolvedValue({}), fetchMyLevel: jest.fn() }))
jest.mock('../api/badges', () => ({ fetchBadges: jest.fn().mockResolvedValue({ badges: [] }) }))

const tiers = [
  { tier: 1, name: 'Iniciante', threshold: 3600, rarity: 'comum' as const },
  { tier: 2, name: 'Locutor', threshold: 36000, rarity: 'raro' as const }
]
const badge = (category: string, over: Partial<Badge> = {}): Badge => ({
  category,
  name: 'Tempo em call',
  description: 'Horas falando em chamadas',
  unit: 'seconds',
  tier: 1,
  tier_name: 'Iniciante',
  rarity: 'comum',
  tiers,
  ...over
})
const seed = (badges: Badge[], hiddenRemaining = 0) =>
  useBadgeStore.setState({ byUser: { u1: { badges, hiddenRemaining, loadedAt: Date.now() } }, modal: null })

describe('LevelBadge', () => {
  beforeEach(() => useLevelStore.getState().reset())

  it('mostra "Nv N" com a faixa no rótulo de acessibilidade; selo especial e lendário também', async () => {
    await render(<LevelPill level={12} />)
    expect(screen.getByLabelText('Nível 12 · Prata')).toBeOnTheScreen()
    expect(screen.getByText(/12/)).toBeOnTheScreen()
  })

  it('desenha o degradê depois de medido (pill do orgulho em faixas, o 100 lendário)', async () => {
    await render(
      <>
        <LevelPill level={24} size="md" />
        <LevelPill level={100} />
      </>
    )
    const pills = screen.getAllByLabelText(/Nível/)
    for (const p of pills) await fireEvent(p, 'layout', { nativeEvent: { layout: { width: 40, height: 18 } } })
    expect(screen.getAllByTestId('level-fill', { includeHiddenElements: true })).toHaveLength(2)
    expect(screen.getByLabelText('Nível 100 · Lendário')).toBeOnTheScreen()
  })

  it('LevelBadge pede o nível e só aparece quando ele chega', async () => {
    const ensure = jest.spyOn(useLevelStore.getState(), 'ensureLevels')
    await render(<LevelBadge userId="u1" />)
    expect(screen.queryByLabelText(/Nível/)).toBeNull()
    await act(async () => useLevelStore.setState({ levels: { u1: 30 } }))
    expect(screen.getByLabelText('Nível 30 · Esmeralda')).toBeOnTheScreen()
    expect(ensure).toHaveBeenCalledWith(['u1'])
  })
})

describe('BadgeIcon', () => {
  it('com arte mostra a imagem; sem arte cai numa estrela', async () => {
    const { rerender, toJSON } = await render(<BadgeIcon category="amigos" tier={1} size={24} />)
    expect(JSON.stringify(toJSON())).toContain('"width":24')
    await rerender(<BadgeIcon category="nao-existe" tier={1} size={24} rarity="raro" locked />)
    expect(JSON.stringify(toJSON())).toContain('"opacity":0.4')
  })
})

describe('BadgeRow', () => {
  beforeEach(() => useBadgeStore.getState().reset())

  it('sem badges não mostra nada', async () => {
    seed([])
    await render(<BadgeRow userId="u1" name="Ana" />)
    expect(screen.queryByLabelText('Badges')).toBeNull()
  })

  it('mostra os mais raros primeiro, "+N" do resto, e tocar abre o modal naquele badge', async () => {
    seed([
      badge('a', { rarity: 'comum' }),
      badge('b', { rarity: 'mitico', tier_name: 'Fundador', name: 'Fundador' }),
      badge('c', { rarity: 'raro' }),
      badge('d', { rarity: 'epico' })
    ])
    await render(<BadgeRow userId="u1" name="Ana" max={2} />)
    expect(screen.getByRole('button', { name: 'Fundador' })).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Ver mais 2 badges' }))
    expect(useBadgeStore.getState().modal).toEqual({ userId: 'u1', name: 'Ana', category: undefined })
    await fireEvent.press(screen.getByRole('button', { name: 'Fundador' }))
    expect(useBadgeStore.getState().modal?.category).toBe('b')
  })
})

describe('BadgesModal', () => {
  beforeEach(() => useBadgeStore.getState().reset())

  it('fechado, não renderiza nada', async () => {
    await render(<BadgesModal />)
    expect(screen.queryByText(/Badges de/)).toBeNull()
  })

  it('perfil de outra pessoa: grade, detalhe público, escada de tiers e badges ocultos', async () => {
    seed([badge('tempo', { tier: 2, tier_name: 'Locutor', rarity: 'raro', unlocked_at: '2026-07-29' }), badge('amigos')], 2)
    useBadgeStore.getState().openModal({ userId: 'u1', name: 'Ana', category: 'tempo' })
    await render(<BadgesModal />)
    expect(screen.getByText('Badges de Ana')).toBeOnTheScreen()
    expect(screen.getByText('Locutor')).toBeOnTheScreen()
    expect(screen.getByText(/Desbloqueado em 29\/07\/26/)).toBeOnTheScreen()
    expect(screen.getByText(/✓ Iniciante/)).toBeOnTheScreen()
    expect(screen.getByText('2 badges ocultos restantes')).toBeOnTheScreen()
    expect(screen.queryByRole('progressbar')).toBeNull()
    await fireEvent.press(screen.getByRole('button', { name: 'Iniciante (Tempo em call)' }))
    expect(screen.getByText('Iniciante')).toBeOnTheScreen()
  })

  it('meu perfil: mostra o progresso e o que falta; fechar limpa o modal', async () => {
    seed([badge('tempo', { value: 5000, progress: 0.4, next_threshold: 36000, next_tier_name: 'Locutor' })])
    useBadgeStore.getState().openModal({ userId: 'u1', name: 'Eu' })
    await render(<BadgesModal />)
    expect(screen.getByRole('progressbar')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Fechar' }))
    expect(useBadgeStore.getState().modal).toBeNull()
  })

  it('sem badges conquistados, avisa', async () => {
    seed([])
    useBadgeStore.getState().openModal({ userId: 'u1', name: 'Ana' })
    await render(<BadgesModal />)
    expect(screen.getByText('Nenhum badge ainda.')).toBeOnTheScreen()
  })
})
