import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, fontSize, MIN_TOUCH, radius, spacing } from '../../../shared/theme/tokens'
import { slashSuggestions, type SlashSuggestion } from '../lib/music'

/** Lista dos comandos do Maestro ao digitar "/" no chat de um canal; tocar completa o comando. */
export function SlashSuggestions({ input, commands, onPick }: { input: string; commands?: SlashSuggestion[]; onPick: (command: string) => void }) {
  const items = slashSuggestions(input, commands)
  if (items.length === 0) return null
  return (
    <View style={styles.box}>
      {items.map((s) => (
        <Pressable key={s.command} accessibilityRole="button" accessibilityLabel={s.usage} onPress={() => onPick(`${s.command} `)} style={styles.row}>
          <Text style={styles.usage}>{s.usage}</Text>
          <Text style={styles.desc} numberOfLines={1}>
            {s.description ?? s.aliases.join(' · ')}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  box: { marginBottom: spacing.xs, padding: 4, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.bgFloating },
  row: { minHeight: MIN_TOUCH, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: 4 },
  usage: { color: colors.textStrong, fontSize: fontSize.sm, fontWeight: '600' },
  desc: { flex: 1, color: colors.textFaint, fontSize: fontSize.xs }
})
