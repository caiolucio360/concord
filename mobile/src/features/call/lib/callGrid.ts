export interface GridMetrics {
  columns: number
  /** Altura de cada tile: preenche a tela quando cabe (com teto), senão o mínimo e a lista rola. */
  tileHeight: number
  /** Lado da foto dentro do tile. */
  avatar: number
  scroll: boolean
}

const GAP = 12
const PADDING = 12
const MIN_TILE = 132
const MAX_TILE = 360
const MIN_AVATAR = 56
const MAX_AVATAR = 120

/** Colunas: 1 para até 2 pessoas (uma sobre a outra), 2 no celular, 3 a partir de 600 px, 4 a partir de 1000 px. */
function columnsFor(width: number, people: number): number {
  if (people <= 2 && width < 600) return 1
  const byWidth = width >= 1000 ? 4 : width >= 600 ? 3 : 2
  return Math.max(1, Math.min(byWidth, people))
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

/**
 * Tamanho dos tiles da chamada, como no Discord: poucos tiles grandes preenchendo a tela; com muita gente
 * ficam no tamanho mínimo e a lista rola. `height` é a altura livre para a grade.
 */
export function callGrid(width: number, height: number, people: number): GridMetrics {
  const columns = columnsFor(width, people)
  const rows = Math.max(1, Math.ceil(people / columns))
  const fit = Math.floor((height - PADDING * 2 - GAP * (rows - 1)) / rows)
  const tileHeight = clamp(fit, MIN_TILE, MAX_TILE)
  const tileWidth = (width - PADDING * 2 - GAP * (columns - 1)) / columns
  const avatar = clamp(Math.floor(Math.min(tileWidth, tileHeight) * 0.5), MIN_AVATAR, Math.min(MAX_AVATAR, tileHeight))
  return { columns, tileHeight, avatar, scroll: fit < MIN_TILE }
}
