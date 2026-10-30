import type { ChangelogRelease } from '../api/changelog'

export type TimelineItem =
  | { kind: 'release'; release: ChangelogRelease; current: boolean }
  /** Versões seguidas sem nada a contar, numa linha só. */
  | { kind: 'quiet'; versions: string[] }

/** Compara versões `x.y.z` número a número (0.10.0 > 0.9.9). */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

/** A versão instalada precisa estar na lista, mesmo que o servidor ainda não a conheça. */
function withInstalled(releases: ChangelogRelease[], installed: string | null): ChangelogRelease[] {
  if (!installed || releases.some((r) => r.version === installed)) return releases
  const placeholder: ChangelogRelease = { version: installed, released_at: '', summary: '', entries: [] }
  const at = releases.findIndex((r) => compareVersions(r.version, installed) < 0)
  if (at === -1) return [...releases, placeholder]
  return [...releases.slice(0, at), placeholder, ...releases.slice(at)]
}

const isQuiet = (release: ChangelogRelease, current: string | null): boolean =>
  release.version !== current && release.entries.length === 0 && !release.summary

/**
 * Linha do tempo das versões, da mais nova para a mais antiga. `installed` é a
 * versão do app (desktop); na web é null e vale a mais nova, que é a do último
 * deploy. A versão atual sempre aparece, com ou sem notas.
 */
export function buildTimeline(releases: ChangelogRelease[], installed: string | null): TimelineItem[] {
  if (releases.length === 0) return []
  const all = withInstalled(releases, installed)
  const current = installed ?? all[0]?.version ?? null
  const items: TimelineItem[] = []
  for (const release of all) {
    const last = items.at(-1)
    if (!isQuiet(release, current)) {
      items.push({ kind: 'release', release, current: release.version === current })
    } else if (last?.kind === 'quiet') {
      last.versions.push(release.version)
    } else {
      items.push({ kind: 'quiet', versions: [release.version] })
    }
  }
  return items
}
