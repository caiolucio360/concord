import { Children, type ComponentType } from 'react'
import type { IconProps } from '../../../shared/ui/icons'

/** Uma seção da mesa de áudio (Favoritos, Sons do servidor); vazia não aparece. */
export default function SoundSection({
  title,
  icon: Icon,
  children
}: {
  title?: string
  /** Ícone antes do título (ex.: a estrela dos Favoritos). */
  icon?: ComponentType<IconProps>
  children: React.ReactNode
}): React.JSX.Element | null {
  if (Children.count(children) === 0) return null
  return (
    <div>
      {title && (
        <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
          {Icon && <Icon size={12} />}
          {title}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  )
}
