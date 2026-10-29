import type { MyRank } from '../api/ranking'
import { myPositionText } from './ranking'

/** Dado ao vivo do card Rank global; nulo enquanto o ranking não carregou. */
export function rankStat(loaded: boolean, me: MyRank | null): string | null {
  return loaded ? myPositionText(me) : null
}
