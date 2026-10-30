import { useEffect, useState } from 'react'
import { fetchChangelog, type ChangelogRelease } from '../api/changelog'
import { ChangelogIcon } from '../../../shared/ui/icons'
import { ChangelogSkeleton } from '../../../shared/ui/skeleton/layouts'
import { formatReleaseDate, groupEntries } from '../lib/changelog'
import { buildTimeline } from '../lib/timeline'

interface ViewProps {
  releases: ChangelogRelease[]
  /** Versão instalada (desktop); null na web ou enquanto não se sabe. */
  current: string | null
  loading: boolean
  error: string | null
}

function Group({
  title,
  items,
  tone
}: {
  title: string
  items: string[]
  tone: string
}): React.JSX.Element | null {
  if (items.length === 0) return null
  return (
    <div className="mt-3">
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>{title}</span>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-300">
        {items.map((text, i) => (
          <li key={i}>{text}</li>
        ))}
      </ul>
    </div>
  )
}

function ReleaseCard({
  release,
  current
}: {
  release: ChangelogRelease
  current: boolean
}): React.JSX.Element {
  const { features, fixes } = groupEntries(release)
  return (
    <section
      data-current-release={current || undefined}
      className={`rounded-xl border bg-surface p-4 ${current ? 'border-violet-500/60' : 'border-subtle'}`}
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="text-lg font-bold">v{release.version}</h2>
        <span className="text-xs text-gray-400">{formatReleaseDate(release.released_at)}</span>
        {current && (
          <span className="rounded-full bg-violet-600/30 px-2 py-0.5 text-xs font-semibold text-violet-300">
            Você está aqui
          </span>
        )}
      </div>
      {release.summary && <p className="mt-1 text-sm text-gray-400">{release.summary}</p>}
      <Group title="Novidades" items={features} tone="bg-emerald-500/20 text-emerald-300" />
      <Group title="Correções" items={fixes} tone="bg-amber-500/20 text-amber-300" />
      {features.length + fixes.length === 0 && (
        <p className="mt-3 text-sm text-gray-500">Sem notas para esta versão.</p>
      )}
    </section>
  )
}

/** Versões seguidas sem nada a contar: "v0.6.4 a v0.6.2" ou só "v0.6.4". */
function QuietRow({ versions }: { versions: string[] }): React.JSX.Element {
  const label =
    versions.length === 1 ? `v${versions[0]}` : `v${versions[0]} a v${versions[versions.length - 1]}`
  return (
    <p className="px-1 text-xs text-gray-500">
      {label} · sem mudanças visíveis
    </p>
  )
}

export function ChangelogView({ releases, current, loading, error }: ViewProps): React.JSX.Element {
  const timeline = buildTimeline(releases, current)
  return (
    <div className="flex h-full w-full overflow-hidden bg-primary backdrop-blur-2xl text-gray-100">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-subtle px-4">
          <ChangelogIcon className="h-5 w-5 text-violet-400" />
          <h1 className="text-base font-semibold">Novidades</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {loading && <ChangelogSkeleton />}
            {error && <p className="text-sm text-red-400">{error}</p>}
            {!loading && !error && releases.length === 0 && (
              <p className="text-sm text-gray-400">Nenhuma versão publicada ainda.</p>
            )}
            {timeline.map((item) =>
              item.kind === 'quiet' ? (
                <QuietRow key={item.versions[0]} versions={item.versions} />
              ) : (
                <ReleaseCard key={item.release.version} release={item.release} current={item.current} />
              )
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function Changelog(): React.JSX.Element {
  const [releases, setReleases] = useState<ChangelogRelease[]>([])
  const [current, setCurrent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetchChangelog()
      .then((r) => alive && setReleases(r))
      .catch(() => alive && setError('Não foi possível carregar as novidades.'))
      .finally(() => alive && setLoading(false))
    window.api?.updates?.currentVersion().then(
      (v) => alive && setCurrent(v),
      () => {}
    )
    return () => {
      alive = false
    }
  }, [])

  // Com muitas versões a atual fica abaixo da dobra: leva o usuário até ela.
  useEffect(() => {
    if (loading) return
    document.querySelector('[data-current-release]')?.scrollIntoView({ block: 'center' })
  }, [loading, releases, current])

  return <ChangelogView releases={releases} current={current} loading={loading} error={error} />
}

export default Changelog
