import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { colors, fontSize, MIN_TOUCH, radius, spacing } from '../../../../shared/theme/tokens'
import { IconButton } from '../../../../shared/ui/IconButton'
import { MAX_LINKS } from '../../../profile/lib/profileLinks'
import { charCount, MAX_BIO, MAX_PRONOUNS, MAX_STATUS_TEXT } from '../../../profile/lib/profileValidation'
import { ColorField, EditorSection } from './controls'

interface TextProps {
  value: string
  error?: string
  onChange: (value: string) => void
}

function CountedField({ label, hint, value, max, error, multiline, placeholder, onChange }: TextProps & { label: string; hint?: string; max: number; multiline?: boolean; placeholder?: string }) {
  return (
    <EditorSection title={label} description={hint}>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        style={[styles.input, multiline && styles.multiline]}
      />
      <View style={styles.meta}>
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : (
          <View />
        )}
        <Text style={styles.counter}>
          {charCount(value)}/{max}
        </Text>
      </View>
    </EditorSection>
  )
}

export const PronounsField = (p: TextProps) => <CountedField {...p} label="Pronomes" max={MAX_PRONOUNS} placeholder="Adicione seus pronomes" />
export const NoteField = (p: TextProps) => <CountedField {...p} label="Nota" hint="O balão que aparece ao lado da sua foto." max={MAX_STATUS_TEXT} placeholder="No que você está pensando?" />
export const BioField = (p: TextProps) => <CountedField {...p} label="Sobre mim" hint="Você pode usar links." max={MAX_BIO} multiline />

interface LinksProps {
  links: string[]
  error?: string
  linkErrors?: (string | null)[]
  onChange: (links: string[]) => void
}

/** Links do perfil (Steam, Twitch, GitHub... ou qualquer site), até 5. */
export function LinksField({ links, error, linkErrors, onChange }: LinksProps) {
  const full = links.length >= MAX_LINKS
  return (
    <EditorSection title="Links" description="Steam, Twitch, YouTube, X, Instagram, TikTok, GitHub, Spotify ou qualquer site.">
      {links.map((link, i) => (
        <View key={i}>
          <View style={styles.linkRow}>
            <TextInput
              accessibilityLabel={`Link ${i + 1}`}
              value={link}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="https://steamcommunity.com/id/voce"
              placeholderTextColor={colors.textFaint}
              onChangeText={(value) => onChange(links.map((l, j) => (j === i ? value : l)))}
              style={[styles.input, styles.linkInput]}
            />
            <IconButton icon="close" label={`Remover link ${i + 1}`} onPress={() => onChange(links.filter((_, j) => j !== i))} />
          </View>
          {linkErrors?.[i] ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {linkErrors[i]}
            </Text>
          ) : null}
        </View>
      ))}
      <Pressable accessibilityRole="button" accessibilityLabel="Adicionar link" accessibilityState={{ disabled: full }} disabled={full} onPress={() => onChange([...links, ''])} style={[styles.add, full && styles.addOff]}>
        <Text style={styles.addText}>+ Adicionar link</Text>
      </Pressable>
      {full ? <Text style={styles.counter}>Máximo de {MAX_LINKS} links.</Text> : null}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </EditorSection>
  )
}

interface BannerColorProps {
  value: string | null
  error?: string
  onChange: (color: string | null) => void
}

/** Cor do banner: aparece quando não há imagem de banner; dá para voltar ao degradê padrão. */
export function BannerColorField({ value, error, onChange }: BannerColorProps) {
  return (
    <EditorSection title="Cor do banner" description="A cor aparece quando não há imagem de banner.">
      <ColorField label="Cor do banner" value={value ?? '#5865f2'} onChange={onChange} />
      {value ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Usar a cor padrão" onPress={() => onChange(null)} style={styles.reset}>
          <Text style={styles.link}>Usar a cor padrão</Text>
        </Pressable>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </EditorSection>
  )
}

const styles = StyleSheet.create({
  input: { minHeight: MIN_TOUCH, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderNormal, backgroundColor: colors.bgInput, color: colors.textNormal, fontSize: fontSize.md, paddingHorizontal: spacing.md },
  multiline: { minHeight: 96, paddingTop: spacing.sm, textAlignVertical: 'top' },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  counter: { color: colors.textFaint, fontSize: fontSize.xs },
  error: { color: colors.textDanger, fontSize: fontSize.xs },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  linkInput: { flex: 1 },
  add: { minHeight: MIN_TOUCH, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.1)' },
  addOff: { opacity: 0.4 },
  addText: { color: colors.textStrong, fontSize: fontSize.sm, fontWeight: '500' },
  reset: { minHeight: MIN_TOUCH, justifyContent: 'center', alignSelf: 'flex-start' },
  link: { color: colors.textLink, fontSize: fontSize.sm }
})
