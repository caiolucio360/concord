import type { ComponentType, ReactNode } from 'react'
import type { IconProps } from './icons'

/**
 * Título de seção, como o rótulo de seção do Discord: 12 px, semibold, em
 * maiúsculas e na cor apagada. Um estilo só para o app inteiro (listas,
 * menus, painéis, configurações); o espaçamento vem de quem usa.
 */
export default function SectionHeader({
  as: Tag = 'h3',
  icon: Icon,
  count,
  id,
  className = '',
  children
}: {
  as?: 'h2' | 'h3' | 'h4' | 'p' | 'legend'
  /** Ícone de 12 px antes do texto (ex.: a estrela dos Favoritos). */
  icon?: ComponentType<IconProps>
  /** Quantos itens a seção tem: "Online — 3". */
  count?: number
  id?: string
  className?: string
  children: ReactNode
}): React.JSX.Element {
  const base = 'text-ds-xs font-semibold uppercase tracking-wide text-muted'
  const layout = Icon ? 'flex items-center gap-1' : ''
  return (
    <Tag id={id} className={[base, layout, className].filter(Boolean).join(' ')}>
      {Icon && <Icon size={12} className="shrink-0" />}
      {children}
      {count !== undefined && ` — ${count}`}
    </Tag>
  )
}
