import type { ButtonHTMLAttributes, ComponentType, Ref } from 'react'
import type { IconProps, IconSize } from './icons'

type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg'
type IconButtonVariant = 'ghost' | 'filled' | 'danger' | 'media'

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  /** Componente de `shared/ui/icons`. */
  icon: ComponentType<IconProps>
  /** Nome acessível (aria-label) e dica (title, se não vier outro). Obrigatório: o botão só tem ícone. */
  label: string
  /**
   * xs 20 px (selo em miniatura ou pílula; cresce no toque), sm 32 px, md 40 px
   * no celular e 32 px do sm em diante (padrão), lg 44 px (controles de chamada).
   */
  size?: IconButtonSize
  /** ghost (padrão), filled (fundo leve), danger (vermelho no hover), media (por cima de imagem/vídeo). */
  variant?: IconButtonVariant
  ref?: Ref<HTMLButtonElement>
}

const SIZE: Record<IconButtonSize, { box: string; icon: IconSize }> = {
  xs: { box: 'size-5 rounded-full pointer-coarse:size-7', icon: 12 },
  sm: { box: 'size-8 rounded-md', icon: 16 },
  md: { box: 'size-10 sm:size-8 rounded-md', icon: 20 },
  lg: { box: 'size-11 rounded-md', icon: 24 }
}

const VARIANT: Record<IconButtonVariant, string> = {
  ghost: 'text-interactive-normal hover:bg-fg/10 hover:text-interactive-hover',
  filled: 'bg-fg/10 text-interactive-normal hover:bg-fg/15 hover:text-interactive-hover',
  danger: 'text-interactive-normal hover:bg-danger-strong hover:text-white',
  media: 'on-media bg-black/70 text-interactive-hover hover:bg-danger-strong'
}

/** Botão só de ícone (fechar, apagar, mais ações...), com rótulo para leitor de tela e dica. */
function IconButton({
  icon: Icon,
  label,
  size = 'md',
  variant = 'ghost',
  title,
  className = '',
  type = 'button',
  ...props
}: IconButtonProps): React.JSX.Element {
  const { box, icon } = SIZE[size]
  return (
    <button
      type={type}
      aria-label={label}
      title={title ?? label}
      className={`focus-ring inline-flex shrink-0 cursor-pointer items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent ${box} ${VARIANT[variant]} ${className}`}
      {...props}
    >
      <Icon size={icon} />
    </button>
  )
}

export default IconButton
