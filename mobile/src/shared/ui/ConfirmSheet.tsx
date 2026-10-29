import { useState, type ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, fontSize, spacing } from '../theme/tokens'
import { Button } from './Button'
import { ModalSheet } from './ModalSheet'

interface ConfirmSheetProps {
  title: string
  confirmLabel: string
  children: ReactNode
  /** Roda ao confirmar; o modal fecha quando termina. */
  onConfirm: () => Promise<void>
  onClose: () => void
}

/** Confirmação de uma ação que já salva (o ConfirmModal do desktop). */
export function ConfirmSheet({ title, confirmLabel, children, onConfirm, onClose }: ConfirmSheetProps) {
  const [busy, setBusy] = useState(false)
  async function confirm(): Promise<void> {
    setBusy(true)
    await onConfirm()
    setBusy(false)
    onClose()
  }
  return (
    <ModalSheet title={title} onClose={busy ? undefined : onClose}>
      <Text style={styles.text}>{children}</Text>
      <View style={styles.actions}>
        <Button title="Cancelar" variant="secondary" onPress={onClose} disabled={busy} />
        <Button title={busy ? 'Aguarde…' : confirmLabel} variant="danger" onPress={() => void confirm()} disabled={busy} />
      </View>
    </ModalSheet>
  )
}

const styles = StyleSheet.create({
  text: { color: colors.textNormal, fontSize: fontSize.md },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm }
})
