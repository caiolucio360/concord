import type { LevelUpEffects } from '../lib/levels'
import { levelUpHeadline, type BannerCelebration } from '../lib/levelUpBanner'
import LevelBadge from './LevelBadge'
import { ArrowUpIcon, CrownIcon, TrophyIcon, type IconProps } from '../../../shared/ui/icons'

/** Símbolo da faixa: coroa no lendário (100+), troféu no marco, seta no resto. */
function stageIcon(fx: LevelUpEffects): React.ComponentType<IconProps> {
  if (fx.stage === 5) return CrownIcon
  return fx.milestone ? TrophyIcon : ArrowUpIcon
}

/** Miolo da faixa de nível: brilho que passa, símbolo, título, faixa e selo. */
export default function LevelUpBannerContent({
  celebration,
  fx
}: {
  celebration: BannerCelebration & { userId: string }
  fx: LevelUpEffects
}): React.JSX.Element {
  const { tier, milestone } = fx
  const StageIcon = stageIcon(fx)
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
      <span className="relative shrink-0" aria-hidden="true" style={{ color: tier.color }}>
        <StageIcon size={24} />
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
