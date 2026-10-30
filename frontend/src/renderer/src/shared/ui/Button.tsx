import type { ButtonHTMLAttributes, ComponentType } from 'react'
import type { IconProps, IconSize } from './icons'
import Spinner from './Spinner'

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'success' | 'secondary'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  /** sm 32 px, md 40 px (padrão, alvo de toque), lg 44 px (ação principal de formulário). */
  size?: ButtonSize
  /** Ícone à esquerda do rótulo (componente de `shared/ui/icons`). */
  icon?: ComponentType<IconProps>
  /** Mostra a rodinha no lugar do ícone e bloqueia o clique. */
  loading?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand hover:bg-brand-hover text-white shadow-md shadow-brand/25',
  ghost: 'bg-fg/5 hover:bg-fg/10 border border-subtle hover:border-normal text-normal',
  secondary: 'bg-fg/10 hover:bg-fg/15 text-strong',
  danger: 'bg-danger-strong hover:bg-danger-strong-hover text-white shadow-md shadow-danger/20',
  success: 'bg-success-strong hover:bg-success-strong-hover text-white shadow-md shadow-success/25'
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-8 px-3 text-ds-xs',
  md: 'min-h-10 px-4 text-ds-sm',
  lg: 'min-h-11 px-6 text-ds-md'
}

const ICON_SIZE: Record<ButtonSize, IconSize> = { sm: 16, md: 16, lg: 20 }

function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  className = '',
  children,
  ...props
}: ButtonProps): React.JSX.Element {
  return (
    <button
      className={`focus-ring inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
      // Depois do spread, mas a chave fica na posição de quem passou `disabled`.
      disabled={props.disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <Spinner /> : Icon && <Icon size={ICON_SIZE[size]} />}
      {children}
    </button>
  )
}

export default Button
