import { Children, type ComponentType } from 'react'
import type { IconProps } from '../../../shared/ui/icons'
import SectionHeader from '../../../shared/ui/SectionHeader'

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
        <SectionHeader as="p" icon={Icon} className="mb-1.5">
          {title}
        </SectionHeader>
      )}
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  )
}
