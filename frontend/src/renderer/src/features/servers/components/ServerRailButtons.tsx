import { Link } from 'react-router-dom'
import { SalinhaMarkIcon } from '../../../shared/ui/icons'
import { badgeText } from '../lib/serverRailBadge'

/** Selo vermelho no canto de um botão da barra; sem contagem, não aparece. */
export function RailCountBadge({ count }: { count: number }): React.JSX.Element | null {
  if (count <= 0) return null
  return (
    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-ds-xxs font-bold text-white shadow-md">
      {badgeText(count)}
    </span>
  )
}

/** Início: botão com a marca da Salinha. */
export function RailHomeButton({
  isHome,
  unread,
  onClick
}: {
  isHome: boolean
  unread: number
  onClick: () => void
}): React.JSX.Element {
  return (
    <div className="relative flex items-center justify-center">
      <span
        className={`absolute -left-3.5 w-2 rounded-r-full bg-[var(--text-strong)] transition-all duration-200 ${
          isHome ? 'h-10' : 'h-0 group-hover/home:h-5'
        }`}
      />
      <Link
        to="/friends"
        onClick={onClick}
        aria-label="Início"
        title="Mensagens Diretas e Amigos"
        className={`group/home relative flex h-12 w-12 items-center justify-center font-bold text-ds-lg shadow-lg transition-all duration-200 ${
          isHome
            ? 'rounded-xl bg-gradient-brand text-white shadow-brand/30'
            : 'rounded-[50%] bg-surface border border-subtle text-strong hover:text-white hover:rounded-xl hover:bg-gradient-brand hover:shadow-brand/30'
        }`}
      >
        <SalinhaMarkIcon className="h-8 w-8" />
      </Link>
      <RailCountBadge count={unread} />
    </div>
  )
}

/** Botão de atalho da barra (convites, propostas) com selo opcional. */
export function RailNavButton({
  label,
  active,
  badge,
  icon,
  onClick
}: {
  label: string
  active: boolean
  badge: number
  icon: (className: string) => React.ReactNode
  onClick: () => void
}): React.JSX.Element {
  return (
    <div className="relative flex items-center justify-center">
      <button
        onClick={onClick}
        title={label}
        aria-label={label}
        className={`relative flex h-12 w-12 cursor-pointer items-center justify-center transition-all duration-200 ${
          active
            ? 'rounded-xl bg-brand shadow-md shadow-brand/30'
            : 'rounded-[50%] border border-subtle bg-surface hover:rounded-xl hover:bg-brand hover:shadow-md hover:shadow-brand/30'
        }`}
      >
        {icon(`h-6 w-6 ${active ? 'text-white' : 'text-brand'}`)}
      </button>
      <RailCountBadge count={badge} />
    </div>
  )
}
