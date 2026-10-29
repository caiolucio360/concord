import { useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { colors, fontSize, MIN_TOUCH, radius, spacing } from '../../../../shared/theme/tokens'

/** Bloco do editor com título (e explicação) e o conteúdo embaixo. */
export function EditorSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {children}
    </View>
  )
}

export function SubLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.subLabel}>{children}</Text>
}

export interface ChipOption {
  id: string
  label: string
}

/** Escolha de uma opção entre várias, em fichas que quebram de linha (o "ChipGroup" do desktop). */
export function ChipGroup({ label, options, value, onPick }: { label: string; options: readonly ChipOption[]; value: string; onPick: (id: string) => void }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.chips}>
      {options.map((o) => (
        <Pressable
          key={o.id}
          accessibilityRole="radio"
          accessibilityLabel={o.label}
          accessibilityState={{ selected: value === o.id }}
          onPress={() => onPick(o.id)}
          style={[styles.chip, value === o.id && styles.chipOn]}
        >
          <Text style={styles.chipText}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  )
}

const HEX = /^#[0-9a-fA-F]{6}$/

/** Cores prontas para um toque (no lugar do seletor de cor do navegador, que o celular não tem). */
export const PALETTE = ['#5865f2', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#334155', '#111827', '#ffffff', '#f97316', '#34d399', '#60a5fa', '#c084fc', '#f472b6']

/** Uma cor: amostra, paleta e campo para o código hexadecimal (#rrggbb). */
export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (color: string) => void }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(value)
  const set = (color: string): void => {
    setText(color)
    onChange(color)
  }
  return (
    <View style={styles.colorField}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded: open }} onPress={() => setOpen((o) => !o)} style={styles.swatchRow}>
        <View style={[styles.swatch, { backgroundColor: value }]} />
        <Text style={styles.swatchText}>{label}</Text>
      </Pressable>
      {open ? (
        <View style={styles.palette}>
          <View style={styles.paletteGrid}>
            {PALETTE.map((c) => (
              <Pressable key={c} accessibilityRole="button" accessibilityLabel={`${label}: ${c}`} onPress={() => set(c)} style={[styles.paletteItem, { backgroundColor: c }, value === c && styles.paletteOn]} />
            ))}
          </View>
          <TextInput
            accessibilityLabel={`${label} (código)`}
            value={text}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={7}
            placeholder="#5865f2"
            placeholderTextColor={colors.textFaint}
            onChangeText={(t) => {
              setText(t)
              if (HEX.test(t)) onChange(t.toLowerCase())
            }}
            style={styles.hex}
          />
        </View>
      ) : null}
    </View>
  )
}

/** Valor numérico em passos (no lugar do controle deslizante, que o celular não traz de fábrica). */
export function RangeField({ label, value, min, max, step = 5, display, onChange }: { label: string; value: number; min: number; max: number; step?: number; display: string; onChange: (value: number) => void }) {
  const clamp = (n: number): number => Math.min(max, Math.max(min, n))
  return (
    <View style={styles.range}>
      <Text style={styles.subLabel}>{label}</Text>
      <View style={styles.rangeRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Diminuir ${label.toLowerCase()}`} disabled={value <= min} onPress={() => onChange(clamp(value - step))} style={[styles.step, value <= min && styles.stepOff]}>
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text accessibilityLabel={`${label}: ${display}`} style={styles.rangeValue}>
          {display}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Aumentar ${label.toLowerCase()}`} disabled={value >= max} onPress={() => onChange(clamp(value + step))} style={[styles.step, value >= max && styles.stepOff]}>
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  sectionTitle: { color: colors.textStrong, fontSize: fontSize.md, fontWeight: '700' },
  description: { color: colors.textMuted, fontSize: fontSize.xs },
  subLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: 'rgba(255,255,255,0.05)' },
  chipOn: { borderColor: colors.brand, backgroundColor: 'rgba(88,101,242,0.15)' },
  chipText: { color: colors.textStrong, fontSize: fontSize.sm },
  colorField: { gap: spacing.sm },
  swatchRow: { minHeight: MIN_TOUCH, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  swatch: { width: 32, height: 32, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderNormal },
  swatchText: { color: colors.textNormal, fontSize: fontSize.sm },
  palette: { gap: spacing.sm },
  paletteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  paletteItem: { width: MIN_TOUCH - 4, height: MIN_TOUCH - 4, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderNormal },
  paletteOn: { borderWidth: 2, borderColor: colors.white },
  hex: { minHeight: MIN_TOUCH, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderNormal, backgroundColor: colors.bgInput, color: colors.textNormal, fontSize: fontSize.md, paddingHorizontal: spacing.md },
  range: { gap: spacing.xs },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  step: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.1)' },
  stepOff: { opacity: 0.4 },
  stepText: { color: colors.textStrong, fontSize: fontSize.lg, fontWeight: '700' },
  rangeValue: { flex: 1, color: colors.textNormal, fontSize: fontSize.sm, textAlign: 'center' }
})
