import { useState } from 'react'
import { resendVerification } from '../api/auth'
import { emailActionErrorMessage } from '../lib/loginError'
import { useAuthStore } from '../store/authStore'
import CloseButton from '../../../shared/ui/CloseButton'

type Status = 'idle' | 'sending' | 'sent' | 'error'

/**
 * Aviso no topo do app enquanto o e-mail não foi confirmado. Só aparece quando
 * o servidor diz explicitamente que não foi (contas antigas não trazem o campo).
 */
function EmailVerifyBanner(): React.JSX.Element | null {
  const user = useAuthStore((s) => s.user)
  const [dismissed, setDismissed] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string | null>(null)

  if (!user || user.email_verified !== false || dismissed) return null

  const resend = async (): Promise<void> => {
    setStatus('sending')
    setMessage(null)
    try {
      const { sent } = await resendVerification()
      setStatus('sent')
      setMessage(sent ? `Enviamos um novo e-mail para ${user.email}.` : 'Seu e-mail já está confirmado.')
    } catch (err) {
      setStatus('error')
      setMessage(emailActionErrorMessage(err))
    }
  }

  return (
    <div
      role="status"
      className="flex items-center gap-3 border-b border-warning/20 bg-warning/10 px-4 py-2 text-sm text-warning"
    >
      <span className="min-w-0 flex-1 truncate">
        {message ?? `Confirme seu e-mail (${user.email}) para liberar convites e entrada em servidores.`}
      </span>
      {status !== 'sent' && (
        <button
          type="button"
          onClick={resend}
          disabled={status === 'sending'}
          className="shrink-0 cursor-pointer font-semibold text-warning underline-offset-2 hover:underline disabled:opacity-50"
        >
          {status === 'sending' ? 'Enviando...' : 'Reenviar e-mail'}
        </button>
      )}
      <CloseButton label="Dispensar aviso" size="sm" onClick={() => setDismissed(true)} />
    </div>
  )
}

export default EmailVerifyBanner
