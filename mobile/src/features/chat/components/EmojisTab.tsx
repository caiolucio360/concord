import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { colors, MIN_TOUCH, radius, spacing } from '../../../shared/theme/tokens'
import { filterEmoteCategories } from '../lib/emotes'

/** Aba "Emojis" do seletor: categorias do desktop, 6 por linha. */
export function EmojisTab({ search, onSelect }: { search: string; onSelect: (emoji: string) => void }) {
  return (
    <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
      {filterEmoteCategories(search).map((category) => (
        <View key={category.id}>
          <Text style={styles.category}>{category.name.toUpperCase()}</Text>
          <View style={styles.grid}>
            {category.items.map((item) => (
              <Pressable key={item.emoji} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => onSelect(item.emoji)} style={styles.cell}>
                <Text style={styles.emoji}>{item.emoji}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  category: { color: colors.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '16.66%', height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  emoji: { fontSize: 24 }
})
