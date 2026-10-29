import { StyleSheet, View } from 'react-native'
import { spacing } from '../../../../shared/theme/tokens'
import { GRADIENT_DIRECTIONS, MAX_BORDER_WIDTH, PROFILE_BORDER_ANIMATIONS, PROFILE_TEXTURES } from '../../../profile/lib/profileThemeExtras'
import { PROFILE_PRESETS } from '../../../profile/lib/profilePresets'
import { PROFILE_BACKGROUNDS, PROFILE_BORDERS, PROFILE_EFFECTS, sameTheme, withBackground, withBorder, type ProfileTheme } from '../../../profile/lib/profileTheme'
import { BACKGROUND_COLOR_LABELS, BORDER_COLOR_LABELS, borderTunable, effectOptions, levelLabel, withEffect } from '../../lib/themeEditor'
import { ChipGroup, ColorField, EditorSection, RangeField, SubLabel } from './controls'

interface Props {
  value: ProfileTheme
  onChange: (next: ProfileTheme) => void
}

/** As cores de uma lista (borda ou fundo), uma por rótulo. */
function Swatches({ labels, colors, onChange }: { labels: string[]; colors: string[]; onChange: (colors: string[]) => void }) {
  return (
    <>
      {labels.map((label, i) => (
        <ColorField key={label} label={label} value={colors[i] ?? '#5865f2'} onChange={(c) => onChange(labels.map((_, j) => (j === i ? c : (colors[j] ?? '#5865f2'))))} />
      ))}
    </>
  )
}

function BorderControls({ value, onChange }: Props) {
  return (
    <>
      <ChipGroup label="Borda" options={PROFILE_BORDERS} value={value.border} onPick={(id) => onChange(withBorder(value, id))} />
      <Swatches labels={BORDER_COLOR_LABELS[value.border] ?? []} colors={value.border_colors} onChange={(border_colors) => onChange({ ...value, border_colors })} />
      {borderTunable(value) ? (
        <>
          <RangeField label="Espessura" value={value.border_width} min={1} max={MAX_BORDER_WIDTH} step={1} display={`${value.border_width} px`} onChange={(border_width) => onChange({ ...value, border_width })} />
          <SubLabel>Animação</SubLabel>
          <ChipGroup label="Animação da borda" options={PROFILE_BORDER_ANIMATIONS} value={value.border_animation} onPick={(border_animation) => onChange({ ...value, border_animation })} />
        </>
      ) : null}
    </>
  )
}

function BackgroundControls({ value, onChange }: Props) {
  const gradient = value.background === 'gradient' || value.background === 'pride'
  return (
    <>
      <ChipGroup label="Fundo do perfil" options={PROFILE_BACKGROUNDS} value={value.background} onPick={(id) => onChange(withBackground(value, id))} />
      <Swatches labels={BACKGROUND_COLOR_LABELS[value.background] ?? []} colors={value.background_colors} onChange={(background_colors) => onChange({ ...value, background_colors })} />
      {gradient ? (
        <>
          <SubLabel>Direção do degradê</SubLabel>
          <ChipGroup
            label="Direção do degradê"
            options={GRADIENT_DIRECTIONS.map((d) => ({ id: String(d.angle), label: d.label }))}
            value={String(value.background_angle)}
            onPick={(angle) => onChange({ ...value, background_angle: Number(angle) })}
          />
        </>
      ) : null}
      <SubLabel>Textura</SubLabel>
      <ChipGroup label="Textura do fundo" options={PROFILE_TEXTURES} value={value.texture} onPick={(texture) => onChange({ ...value, texture })} />
    </>
  )
}

function EffectControls({ value, onChange }: Props) {
  const { tunable, color } = effectOptions(value)
  return (
    <>
      <ChipGroup label="Efeito" options={PROFILE_EFFECTS} value={value.effect} onPick={(id) => onChange(withEffect(value, id))} />
      {tunable ? (
        <>
          <RangeField label="Quantidade" value={value.effect_density} min={1} max={100} display={levelLabel(value.effect_density)} onChange={(effect_density) => onChange({ ...value, effect_density })} />
          <RangeField label="Velocidade" value={value.effect_speed} min={1} max={100} display={levelLabel(value.effect_speed)} onChange={(effect_speed) => onChange({ ...value, effect_speed })} />
        </>
      ) : null}
      {color ? <ColorField label="Cor do efeito" value={color} onChange={(effect_color) => onChange({ ...value, effect_color })} /> : null}
    </>
  )
}

/** Tema do cartão de perfil em seções curtas: predefinições, borda, fundo e efeito (igual ao desktop). */
export function ThemeEditor({ value, onChange }: Props) {
  return (
    <View style={styles.editor}>
      <EditorSection title="Predefinições" description="Um toque muda o cartão inteiro; depois ajuste o que quiser.">
        <ChipGroup label="Predefinições" options={PROFILE_PRESETS} value={PROFILE_PRESETS.find((p) => sameTheme(p.theme, value))?.id ?? ''} onPick={(id) => onChange(PROFILE_PRESETS.find((p) => p.id === id)!.theme)} />
      </EditorSection>
      <EditorSection title="Borda">
        <BorderControls value={value} onChange={onChange} />
      </EditorSection>
      <EditorSection title="Fundo do perfil">
        <BackgroundControls value={value} onChange={onChange} />
      </EditorSection>
      <EditorSection title="Efeito" description="Animado por cima do cartão, para todo mundo que abrir seu perfil.">
        <EffectControls value={value} onChange={onChange} />
      </EditorSection>
    </View>
  )
}

const styles = StyleSheet.create({
  editor: { gap: spacing.xl }
})
