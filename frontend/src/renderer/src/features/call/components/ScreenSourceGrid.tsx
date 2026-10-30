import type { ScreenSourceInfo } from '../../../../../preload/index.d'
import { CheckIcon, MonitorIcon } from '../../../shared/ui/icons'
import { ScreenSourceGridSkeleton } from '../../../shared/ui/skeleton/layouts'

export type ScreenPickerTab = 'screen' | 'window'

const TABS: { id: ScreenPickerTab; label: string }[] = [
  { id: 'screen', label: 'Telas' },
  { id: 'window', label: 'Aplicativos' }
]

/** Abas "Telas" e "Aplicativos" do seletor de tela. */
export function ScreenPickerTabs({
  tab,
  onChange
}: {
  tab: ScreenPickerTab
  onChange: (tab: ScreenPickerTab) => void
}): React.JSX.Element {
  return (
    <div className="mt-4 flex gap-4 border-b border-subtle">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`cursor-pointer border-b-2 px-3 pb-2 text-sm font-semibold transition-colors ${
            tab === t.id
              ? 'border-[var(--text-strong)] text-strong'
              : 'border-transparent text-muted hover:text-normal'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

/** Miniatura de uma tela ou janela; a escolhida ganha o anel e a marca. */
export function ScreenSourceCard({
  source,
  selected,
  onSelect
}: {
  source: ScreenSourceInfo
  selected: boolean
  onSelect: () => void
}): React.JSX.Element {
  return (
    <button
      onClick={onSelect}
      className={`group cursor-pointer rounded-lg p-2 text-left transition-colors ${
        selected ? 'bg-brand/20' : 'bg-fg/[0.03] hover:bg-fg/[0.07]'
      }`}
    >
      <div
        className={`relative mb-2 aspect-video overflow-hidden rounded-md bg-black ${
          selected ? 'ring-2 ring-brand' : 'ring-1 ring-fg/10 group-hover:ring-fg/25'
        }`}
      >
        {source.thumbnail ? (
          <img src={source.thumbnail} alt={source.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <MonitorIcon className="h-8 w-8 text-interactive-muted" />
          </div>
        )}
        {selected && (
          <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
            <CheckIcon size={12} />
          </span>
        )}
      </div>
      <p className="truncate text-xs font-semibold text-normal">{source.name}</p>
    </button>
  )
}

/** Grade de fontes: esqueleto enquanto lista, aviso se não houver nenhuma. */
export function ScreenSourceGrid({
  loaded,
  sources,
  selected,
  onSelect
}: {
  loaded: boolean
  sources: ScreenSourceInfo[]
  selected: string | null
  onSelect: (id: string) => void
}): React.JSX.Element {
  return (
    <div className="mt-5 grid max-h-[46vh] grid-cols-2 gap-3 overflow-y-auto pr-1">
      {!loaded && <ScreenSourceGridSkeleton />}
      {loaded && sources.length === 0 && (
        <p className="col-span-2 py-8 text-center text-sm text-faint">Nenhuma opção disponível.</p>
      )}
      {sources.map((source) => (
        <ScreenSourceCard
          key={source.id}
          source={source}
          selected={selected === source.id}
          onSelect={() => onSelect(source.id)}
        />
      ))}
    </div>
  )
}
