import { useEffect } from 'react'
import { ChangelogIcon, CrownIcon, DiamondIcon } from '../../../shared/ui/icons'
import { useProposalStore } from '../../proposals/store/proposalStore'
import { useRankingStore } from '../../ranking/store/rankingStore'
import HubCard from '../components/HubCard'
import { CHANGELOG_PATH, PROPOSALS_PATH, RANKING_PATH, proposalsStat, rankStat } from '../lib/hub'

interface ViewProps {
  proposalsStat: string | null
  rankStat: string | null
}

/** Tela inicial da aba do diamante: três cards, um para cada assunto. */
export function ImprovementsHubView({ proposalsStat, rankStat }: ViewProps): React.JSX.Element {
  return (
    <div className="flex h-full w-full overflow-hidden bg-primary backdrop-blur-2xl text-strong">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-subtle px-4">
          <DiamondIcon className="h-6 w-6 text-brand" />
          <h1 className="text-ds-md font-bold tracking-wide text-strong">Melhorias</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto flex max-w-5xl flex-col gap-6">
            <p className="text-ds-sm text-muted">
              Ajude a decidir o que vem por aí, veja o que mudou e confira quem manda nas calls.
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <HubCard
                to={PROPOSALS_PATH}
                icon={<DiamondIcon className="size-7" />}
                title="Propostas de melhorias"
                description="Sugira ideias e vote no que o time deve construir."
                stat={proposalsStat}
                tone={{ glow: 'bg-brand', icon: 'text-brand' }}
              />
              <HubCard
                to={CHANGELOG_PATH}
                icon={<ChangelogIcon className="size-7" />}
                title="Novidades"
                description="O que mudou em cada versão da Salinha."
                stat={null}
                tone={{ glow: 'bg-success', icon: 'text-success' }}
              />
              <HubCard
                to={RANKING_PATH}
                icon={<CrownIcon className="size-7" />}
                title="Rank global"
                description="Os 100 maiores níveis da Salinha."
                stat={rankStat}
                tone={{ glow: 'bg-warning', icon: 'text-warning' }}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function ImprovementsHub(): React.JSX.Element {
  const proposals = useProposalStore((s) => s.proposals)
  const proposalsLoaded = useProposalStore((s) => s.loaded)
  const ranking = useRankingStore((s) => s.ranking)
  const fetchRanking = useRankingStore((s) => s.fetch)

  useEffect(() => {
    void fetchRanking()
  }, [fetchRanking])

  return (
    <ImprovementsHubView
      proposalsStat={proposalsStat(proposals, proposalsLoaded)}
      rankStat={rankStat(ranking !== null, ranking?.me ?? null)}
    />
  )
}

export default ImprovementsHub
