import { StyleSheet, Switch, Text, View } from 'react-native'
import { colors, fontSize, MIN_TOUCH, spacing } from '../theme/tokens'

interface SwitchRowProps {
  title: string
  description?: string
  value: boolean
  onChange: (value: boolean) => void
}

/** Linha de configuração com interruptor (igual ao Toggle das configurações do desktop). */
export function SwitchRow({ title, description, value, onChange }: SwitchRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      <Switch accessibilityLabel={title} value={value} onValueChange={onChange} trackColor={{ true: colors.brand, false: colors.interactiveMuted }} thumbColor={colors.white} />
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: MIN_TOUCH },
  texts: { flex: 1, gap: 2 },
  title: { color: colors.textNormal, fontSize: fontSize.md, fontWeight: '500' },
  description: { color: colors.textMuted, fontSize: fontSize.xs }
})
