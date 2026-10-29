import { StyleSheet, View } from 'react-native'
import { spacing } from '../../../../shared/theme/tokens'
import { NAME_EFFECTS, NAME_FONTS, type NameStyle } from '../../../profile/lib/nameStyle'
import { withEffect } from '../../../profile/lib/nameStylePicker'
import { ChipGroup, ColorField, SubLabel } from './controls'

/** Fonte, efeito e cores do nome (a prévia fica com quem usa, ex.: o modal do nome). */
export function NameStyleEditor({ value, onChange }: { value: NameStyle; onChange: (next: NameStyle) => void }) {
  const effect = NAME_EFFECTS.find((e) => e.id === value.effect) ?? NAME_EFFECTS[0]
  return (
    <View style={styles.editor}>
      <SubLabel>Fonte</SubLabel>
      <ChipGroup label="Fonte" options={NAME_FONTS} value={value.font} onPick={(font) => onChange({ ...value, font })} />
      <SubLabel>Efeito</SubLabel>
      <ChipGroup label="Efeito do nome" options={NAME_EFFECTS} value={value.effect} onPick={(id) => onChange(withEffect(value, id))} />
      {Array.from({ length: effect.maxColors }, (_, i) => (
        <ColorField
          key={i}
          label={effect.maxColors > 1 ? `Cor ${i + 1}` : 'Cor'}
          value={value.colors[i] ?? '#5865f2'}
          onChange={(c) => {
            const colors = [...value.colors]
            colors[i] = c
            onChange({ ...value, colors })
          }}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  editor: { gap: spacing.sm }
})
