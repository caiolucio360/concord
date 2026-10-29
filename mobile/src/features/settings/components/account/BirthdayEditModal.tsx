import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, fontSize, MIN_TOUCH, radius, spacing } from '../../../../shared/theme/tokens'
import { Button } from '../../../../shared/ui/Button'
import { Input } from '../../../../shared/ui/Input'
import { ModalSheet } from '../../../../shared/ui/ModalSheet'
import { SwitchRow } from '../../../../shared/ui/SwitchRow'
import type { Birthday } from '../../../profile/api/birthdays'
import { birthdayError, daysInMonth, MONTHS, type BirthdayValue } from '../../../profile/lib/birthday'

const toNumber = (text: string): number | null => {
  const n = parseInt(text.replace(/\D/g, ''), 10)
  return Number.isNaN(n) ? null : n
}

/** Dia, mês (lista de nomes) e ano do aniversário; todos opcionais. */
function BirthdayFields({ value, onChange }: { value: BirthdayValue; onChange: (next: BirthdayValue) => void }) {
  const [monthsOpen, setMonthsOpen] = useState(false)
  const fit = (next: BirthdayValue): BirthdayValue => {
    const last = daysInMonth(next.month, next.year)
    return next.day && next.day > last ? { ...next, day: last } : next
  }
  return (
    <View style={styles.fields}>
      <Text style={styles.label}>Aniversário (opcional)</Text>
      <View style={styles.row}>
        <View style={styles.day}>
          <Input label="Dia do aniversário" value={value.day?.toString() ?? ''} keyboardType="number-pad" maxLength={2} onChangeText={(t) => onChange(fit({ ...value, day: toNumber(t) }))} />
        </View>
        <View style={styles.year}>
          <Input label="Ano do aniversário" value={value.year?.toString() ?? ''} keyboardType="number-pad" maxLength={4} onChangeText={(t) => onChange(fit({ ...value, year: toNumber(t) }))} />
        </View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Mês do aniversário" accessibilityState={{ expanded: monthsOpen }} onPress={() => setMonthsOpen((o) => !o)} style={styles.select}>
        <Text style={styles.selectText}>{value.month ? MONTHS[value.month - 1] : 'Mês'}</Text>
      </Pressable>
      {monthsOpen ? (
        <View style={styles.months}>
          {MONTHS.map((name, i) => (
            <Pressable
              key={name}
              accessibilityRole="button"
              accessibilityState={{ selected: value.month === i + 1 }}
              onPress={() => {
                onChange(fit({ ...value, month: i + 1 }))
                setMonthsOpen(false)
              }}
              style={[styles.month, value.month === i + 1 && styles.monthOn]}
            >
              <Text style={styles.monthText}>{name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  )
}

interface BirthdayEditModalProps {
  initial: Birthday
  /** Devolve a mensagem de erro (null = salvou). */
  onSave: (next: Birthday) => Promise<string | null>
  onClose: () => void
  onSaved?: (message: string) => void
}

/** Aniversário (opcional) e se os servidores podem anunciar. Salva em "Salvar". */
export function BirthdayEditModal({ initial, onSave, onClose, onSaved }: BirthdayEditModalProps) {
  const [value, setValue] = useState(initial)
  const [failure, setFailure] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const invalid = birthdayError(value)

  async function submit(): Promise<void> {
    setBusy(true)
    const error = await onSave(value)
    setBusy(false)
    setFailure(error)
    if (!error) {
      onSaved?.('Aniversário salvo!')
      onClose()
    }
  }

  return (
    <ModalSheet title="Aniversário" onClose={busy ? undefined : onClose}>
      <BirthdayFields value={value} onChange={(next) => setValue({ ...value, ...next })} />
      {invalid ? <Text style={styles.warn}>{invalid}</Text> : null}
      <Text style={styles.note}>Sua idade aparece só para você, no recado de feliz aniversário.</Text>
      <SwitchRow
        title="Anunciar meu aniversário nos servidores"
        description="No seu dia, os servidores mandam uma mensagem de parabéns no canal principal e você vê um recado ao abrir o app."
        value={value.announce}
        onChange={(announce) => setValue({ ...value, announce })}
      />
      {failure ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {failure}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button title="Cancelar" variant="secondary" onPress={onClose} disabled={busy} />
        <Button title={busy ? 'Salvando…' : 'Salvar'} onPress={() => void submit()} disabled={busy || Boolean(invalid)} />
      </View>
    </ModalSheet>
  )
}

const styles = StyleSheet.create({
  fields: { gap: spacing.sm },
  label: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '500' },
  row: { flexDirection: 'row', gap: spacing.sm },
  day: { width: 110 },
  year: { flex: 1 },
  select: { minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderNormal, backgroundColor: colors.bgInput },
  selectText: { color: colors.textNormal, fontSize: fontSize.md },
  months: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  month: { minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.06)' },
  monthOn: { backgroundColor: colors.brand },
  monthText: { color: colors.textNormal, fontSize: fontSize.sm },
  warn: { color: colors.textWarning, fontSize: fontSize.xs },
  note: { color: colors.textFaint, fontSize: fontSize.xs },
  error: { color: colors.textDanger, fontSize: fontSize.sm },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm }
})
