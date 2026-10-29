import { useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, fontSize, MIN_TOUCH, radius, spacing } from '../../../../shared/theme/tokens'
import { maskEmail } from '../../../auth/lib/account'

/** Uma linha de Minha conta: rótulo, valor e (se der para mudar) o "Editar". */
export function AccountRow({ label, value, onEdit }: { label: string; value: ReactNode; onEdit?: () => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.texts}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value} numberOfLines={2}>
          {value}
        </Text>
      </View>
      {onEdit ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${label.toLowerCase()}`} onPress={onEdit} style={styles.edit}>
          <Text style={styles.editText}>Editar</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

/** E-mail mascarado ("*****@gmail.com"), com o "Mostrar", como no Discord. */
export function MaskedEmail({ email }: { email: string }) {
  const [show, setShow] = useState(false)
  return (
    <>
      {show ? email : maskEmail(email)}{' '}
      <Text accessibilityRole="button" onPress={() => setShow((v) => !v)} style={styles.link}>
        {show ? 'Ocultar' : 'Mostrar'}
      </Text>
    </>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.md },
  texts: { flex: 1, gap: 2 },
  label: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: '500' },
  value: { color: colors.textStrong, fontSize: fontSize.md },
  edit: { minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.1)' },
  editText: { color: colors.textStrong, fontSize: fontSize.sm, fontWeight: '500' },
  link: { color: colors.textLink }
})
