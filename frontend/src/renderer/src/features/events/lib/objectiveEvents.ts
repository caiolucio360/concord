import { showToast } from '../../../shared/store/toastStore'
import type { ServerEvent } from '../api/events'
import { objectiveTitle, objectiveToast } from './objectives'

/** O que o `event:objective` do servidor traz (campos que faltarem viram "ignora"). */
export interface ObjectivePayload {
  server_id?: string
  event_id?: string
  objective_id?: string
  minutes?: number
  done?: boolean
  xp?: number
  capped?: boolean
}

/** Ao cumprir um objetivo, avisa com o título e o XP que entrou (e do teto diário, se cortou). */
export function announceObjective(event: ServerEvent | undefined, p: ObjectivePayload): void {
  if (p.done !== true || !event) return
  const objective = event.objectives.find((o) => o.id === p.objective_id)
  if (!objective) return
  const title = objectiveTitle(objective, event.game_name)
  showToast.success(objectiveToast(title, p.xp ?? 0, p.capped === true), 6000)
}
