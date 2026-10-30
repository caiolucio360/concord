import { useNavigate } from 'react-router-dom'
import type { SearchResult, SearchScope } from '../api/search'
import ResultItem from './SearchResultItem'
import {
  highlightTerms,
  resultCountLabel,
  SORT_LABELS,
  type SearchSort
} from '../lib/messageSearch'
import { SEARCH_PAGE_SIZE, searchScopeKey, useSearchStore } from '../store/searchStore'
import { useServerNicknames } from '../../servers/hooks/useServerNames'
import { SearchIcon, XIcon } from '../../../shared/ui/icons'

interface SearchResultsPanelProps {
  scope: SearchScope
  /** Canal aberto agora (servidor): resultado de outro canal navega até ele. */
  currentChannelId?: string
}

/** Painel da direita com os resultados da busca do servidor/DM aberto. */
export default function SearchResultsPanel({
  scope,
  currentChannelId
}: SearchResultsPanelProps): React.JSX.Element | null {
  const navigate = useNavigate()
  const activeKey = useSearchStore((s) => (s.scope ? searchScopeKey(s.scope) : null))
  const raw = useSearchStore((s) => s.raw)
  const sort = useSearchStore((s) => s.sort)
  const offset = useSearchStore((s) => s.offset)
  const page = useSearchStore((s) => s.page)
  const loading = useSearchStore((s) => s.loading)
  const error = useSearchStore((s) => s.error)
  const setSort = useSearchStore((s) => s.setSort)
  const goTo = useSearchStore((s) => s.goTo)
  const close = useSearchStore((s) => s.close)
  const requestJump = useSearchStore((s) => s.requestJump)
  const serverId = scope.kind === 'server' ? scope.id : undefined
  const nicknames = useServerNicknames(serverId)

  if (activeKey !== searchScopeKey(scope)) return null

  const terms = highlightTerms(raw)
  const total = page?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / SEARCH_PAGE_SIZE))
  const current = Math.floor(offset / SEARCH_PAGE_SIZE) + 1

  const open = (r: SearchResult): void => {
    if (scope.kind === 'server' && r.channel_id) {
      if (r.channel_id !== currentChannelId) {
        navigate(`/servers/${scope.id}/channels/${r.channel_id}`)
      }
      requestJump(`channel:${r.channel_id}`, r.id)
    } else if (r.conversation_id) {
      requestJump(`conversation:${r.conversation_id}`, r.id)
    }
  }

  return (
    <aside
      aria-label="Resultados da busca"
      className="flex w-80 shrink-0 flex-col border-l border-subtle bg-members xl:w-[26rem]"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-subtle px-4 py-3">
        <p className="text-ds-sm font-semibold text-strong" aria-live="polite">
          {loading
            ? 'Buscando…'
            : error
              ? 'Busca'
              : resultCountLabel(total, page?.total_capped ?? false)}
        </p>
        <button
          type="button"
          onClick={close}
          aria-label="Fechar resultados"
          title="Fechar"
          className="cursor-pointer rounded p-1 text-gray-400 hover:bg-fg/10 hover:text-strong"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      <div
        role="group"
        aria-label="Ordenar"
        className="flex shrink-0 gap-1 border-b border-subtle px-3 py-2"
      >
        {(Object.keys(SORT_LABELS) as SearchSort[]).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={sort === s}
            onClick={() => sort !== s && setSort(s)}
            className={`cursor-pointer rounded-md px-2.5 py-1 text-ds-xs font-medium transition ${
              sort === s
                ? 'bg-brand/30 text-strong'
                : 'text-gray-400 hover:bg-fg/5 hover:text-strong'
            }`}
          >
            {SORT_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {error ? (
          <p role="alert" className="px-2 py-8 text-center text-ds-sm text-gray-300">
            {error}
          </p>
        ) : loading && !page ? (
          <p className="px-2 py-8 text-center text-ds-sm text-gray-400">Buscando mensagens…</p>
        ) : page && page.results.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-10 text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-fg/5 text-gray-400">
              <SearchIcon className="h-6 w-6" />
            </span>
            <p className="text-ds-sm font-medium text-gray-200">Nenhum resultado</p>
            <p className="mt-1 text-ds-xs text-gray-400">
              Tente outras palavras ou tire algum filtro.
            </p>
          </div>
        ) : (
          <ul className={`space-y-2 ${loading ? 'opacity-60' : ''}`}>
            {page?.results.map((r) => (
              <li key={r.id}>
                <ResultItem
                  result={r}
                  terms={terms}
                  serverId={serverId}
                  nickname={nicknames?.[r.author_id]}
                  onOpen={() => open(r)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {!error && page && pages > 1 && (
        <nav
          aria-label="Páginas dos resultados"
          className="flex shrink-0 items-center justify-between gap-2 border-t border-subtle px-4 py-2"
        >
          <button
            type="button"
            disabled={current <= 1 || loading}
            onClick={() => goTo(offset - SEARCH_PAGE_SIZE)}
            className="cursor-pointer rounded-md px-2.5 py-1 text-ds-xs font-medium text-gray-300 hover:bg-fg/5 hover:text-strong disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-ds-xs text-gray-400">
            Página {current} de {pages}
          </span>
          <button
            type="button"
            disabled={current >= pages || loading}
            onClick={() => goTo(offset + SEARCH_PAGE_SIZE)}
            className="cursor-pointer rounded-md px-2.5 py-1 text-ds-xs font-medium text-gray-300 hover:bg-fg/5 hover:text-strong disabled:cursor-not-allowed disabled:opacity-40"
          >
            Próxima
          </button>
        </nav>
      )}
    </aside>
  )
}
