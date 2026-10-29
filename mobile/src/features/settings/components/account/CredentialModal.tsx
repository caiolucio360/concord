import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, fontSize, spacing } from '../../../../shared/theme/tokens'
import { Button } from '../../../../shared/ui/Button'
import { Input } from '../../../../shared/ui/Input'
import { ModalSheet } from '../../../../shared/ui/ModalSheet'
import { submitAccountChange, type AccountField } from '../../../auth/lib/accountChange'
import { changeMyEmail, changeMyUsername } from '../../../auth/store/accountActions'

interface CredentialConfig {
  title: string
  label: string
  hint: string
  email: boolean
  send: (value: string, password: string) => Promise<void>
}

// Textos iguais aos do CredentialModal do desktop.
const CREDENTIALS: Record<AccountField, CredentialConfig> = {
  username: {
    title: 'Mudar o nome de usuário',
    label: 'Nome de usuário',
    hint: 'De 3 a 32 caracteres: letras, números ou _. É o seu @ no app e serve para entrar. Dá para trocar uma vez a cada 7 dias.',
    email: false,
    send: changeMyUsername
  },
  email: {
    title: 'Mudar o e-mail',
    label: 'E-mail',
    hint: 'Vamos mandar um link de confirmação para o novo endereço.',
    email: true,
    send: changeMyEmail
  }
}

interface CredentialModalProps {
  kind: AccountField
  current: string
  /** O @ ainda no prazo de 7 dias: mostra o aviso e trava tudo. */
  locked?: string | null
  onClose: () => void
  /** Chamado depois de salvar, com o aviso de sucesso. */
  onSaved?: (message: string) => void
}

const SUCCESS: Record<AccountField, string> = {
  username: 'Nome de usuário trocado!',
  email: 'E-mail trocado! Confira a caixa de entrada para confirmar.'
}

/** Troca o @ ou o e-mail: o valor novo e a senha atual (exigida pelo servidor). */
export function CredentialModal({ kind, current, locked = null, onClose, onSaved }: CredentialModalProps) {
  const config = CREDENTIALS[kind]
  const [value, setValue] = useState(current)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(): Promise<void> {
    setBusy(true)
    const failure = await submitAccountChange({ kind, value, password, current, send: config.send })
    setBusy(false)
    setError(failure)
    if (!failure) {
      onSaved?.(SUCCESS[kind])
      onClose()
    }
  }

  return (
    <ModalSheet title={config.title} onClose={busy ? undefined : onClose}>
      <Input
        label={config.label}
        value={value}
        onChangeText={setValue}
        editable={!locked}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={config.email ? 'email-address' : 'default'}
        autoComplete={config.email ? 'email' : 'username'}
      />
      <Text style={styles.hint}>{config.hint}</Text>
      <Input label="Senha atual" value={password} onChangeText={setPassword} editable={!locked} secureTextEntry autoCapitalize="none" autoComplete="current-password" />
      {locked ? (
        <Text accessibilityRole="alert" style={styles.locked}>
          {locked}
        </Text>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button title="Cancelar" variant="secondary" onPress={onClose} disabled={busy} />
        <Button title={busy ? 'Salvando…' : 'Salvar'} onPress={() => void submit()} disabled={busy || Boolean(locked)} />
      </View>
    </ModalSheet>
  )
}

const styles = StyleSheet.create({
  hint: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: -spacing.sm },
  locked: { color: colors.textStrong, fontSize: fontSize.sm, padding: spacing.md, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.05)' },
  error: { color: colors.textDanger, fontSize: fontSize.sm },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm }
})
