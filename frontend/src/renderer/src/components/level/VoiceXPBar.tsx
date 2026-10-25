import { useLevelStore } from '../../store/levelStore'
import {
  fatigueState,
  formatVoiceTime,
  levelPercent,
  levelTier,
  minutesToNext
} from '../../lib/levels'

/** Barra de XP de quem está logado, no painel "Voz conectada". */
function VoiceXPBar({ paused }: { paused: boolean }): React.JSX.Element | null {
  const me = useLevelStore((s) => s.me)
  if (!me) return null

  const tier = levelTier(me.level)
  const percent = levelPercent(me.xp_into_level, me.xp_for_next)
  const minutes = minutesToNext(me.xp_into_level, me.xp_for_next)
  const daily = me.daily_seconds ?? 0
  const fatigue = fatigueState(daily)
  const label = paused
    ? 'XP pausado (mutado)'
    : fatigue === 'done'
      ? 'Limite de XP de hoje atingido'
      : fatigue === 'tired'
        ? `${me.xp_into_level}/${me.xp_for_next} XP · metade (cansaço)`
        : `${me.xp_into_level}/${me.xp_for_next} XP`

  return (
    <div
      className="mt-2 px-0.5"
      title={`Hoje: ${formatVoiceTime(daily)} de call · ${formatVoiceTime(me.voice_seconds)} no total · faltam ~${minutes} min (sem cansaço) para o nível ${me.level + 1}`}
    >
      <div className="mb-1 flex items-baseline justify-between text-[10px]">
        <span className="font-bold" style={{ color: paused ? '#6b7280' : tier.color }}>
          Nível {me.level}
        </span>
        <span className={fatigue === 'full' || paused ? 'text-gray-500' : 'text-amber-300/80'}>
          {label}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{
            width: `${percent}%`,
            backgroundImage: paused
              ? 'linear-gradient(90deg, #4b5563, #374151)'
              : `linear-gradient(90deg, ${tier.accent}, ${tier.color})`,
            boxShadow: paused ? undefined : `0 0 8px ${tier.color}88`
          }}
        />
      </div>
    </div>
  )
}

export default VoiceXPBar
