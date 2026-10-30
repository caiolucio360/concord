import IconButton, { type IconButtonProps } from './IconButton'
import { XIcon } from './icons'

type CloseButtonProps = Omit<IconButtonProps, 'icon' | 'label'> & {
  /** "Fechar" por padrão; "Remover anexo", "Dispensar aviso"... quando o X faz outra coisa. */
  label?: string
}

/** O X de fechar ou remover: um desenho só no app inteiro (modais, toasts, avisos, anexos). */
function CloseButton({ label = 'Fechar', ...props }: CloseButtonProps): React.JSX.Element {
  return <IconButton icon={XIcon} label={label} {...props} />
}

export default CloseButton
