import type { LevelUpEffects } from '../lib/levels'
import { levelUpHeadline, type BannerCelebration } from '../lib/levelUpBanner'
import LevelBadge from './LevelBadge'

/** Miolo da faixa de nível: brilho que passa, símbolo, título, faixa e selo. */
export default function LevelUpBannerContent({
  celebration,
  fx
}: {
  celebration: BannerCelebration & { userId: string }
  fx: LevelUpEffects
}): React.JSX.Element {
  const { tier, milestone } = fx
  return (
    <>
      <span
        aria-hidden="true"
        className="level-motion absolute inset-y-0 w-1/3"
        style={{
          background: `linear-gradient(90deg, transparent, ${tier.color}33, transparent)`,
          animation: 'level-shimmer 1.4s ease-in-out 300ms 2 both'
        }}
      />
      <span className="relative text-xl" aria-hidden="true">
        {fx.stage === 5 ? '👑' : milestone ? '🏆' : '⬆️'}
      </span>
      <div className="relative leading-tight">
        <p className="max-w-[280px] truncate text-sm font-bold text-strong">
          {levelUpHeadline(celebration, milestone)}
        </p>
        <p className="text-[11px] text-gray-400">
          Faixa {tier.name}
          {milestone ? ` · ${milestone.title}` : ''}
        </p>
      </div>
      <LevelBadge userId={celebration.userId} size="md" className="relative" />
    </>
  )
}
