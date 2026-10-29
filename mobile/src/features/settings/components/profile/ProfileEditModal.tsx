import { useState, type ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, fontSize, spacing } from '../../../../shared/theme/tokens'
import { Button } from '../../../../shared/ui/Button'
import { Input } from '../../../../shared/ui/Input'
import { ModalSheet } from '../../../../shared/ui/ModalSheet'
import type { User } from '../../../auth/store/authStore'
import { ProfileCard } from '../../../profile/components/card/ProfileCard'
import { surpriseNameStyle } from '../../../profile/lib/nameStylePicker'
import { charCount, draftFromProfile, hasErrors, MAX_DISPLAY_NAME, type ProfileDraft } from '../../../profile/lib/profileValidation'
import { patchedDraft, patchErrors, type DraftPatch } from '../../lib/draftPatch'
import { previewProfile } from '../../lib/profilePreview'
import { BannerColorField, BioField, LinksField, NoteField, PronounsField } from './FieldEditors'
import { NameStyleEditor } from './NameStyleEditor'
import { ThemeEditor } from './ThemeEditor'

export type ProfileModalId = 'name' | 'pronouns' | 'note' | 'bio' | 'links' | 'banner_color' | 'theme'

const TITLES: Record<ProfileModalId, string> = {
  name: 'Nome de exibição',
  pronouns: 'Pronomes',
  note: 'Nota',
  bio: 'Sobre mim',
  links: 'Links',
  banner_color: 'Cor do banner',
  theme: 'Tema do perfil'
}

/** Quais campos do rascunho cada modal edita. */
const KEYS: Record<ProfileModalId, (keyof DraftPatch)[]> = {
  name: ['display_name', 'name_style'],
  pronouns: ['pronouns'],
  note: ['status_text'],
  bio: ['bio'],
  links: ['links'],
  banner_color: ['banner_color'],
  theme: ['profile_theme']
}

interface FieldsProps {
  id: ProfileModalId
  value: ProfileDraft
  errors: ReturnType<typeof patchErrors>
  onChange: (patch: DraftPatch) => void
}

function NameFields({ value, errors, onChange }: Omit<FieldsProps, 'id'>) {
  return (
    <>
      <Input label="Nome de exibição" value={value.display_name} onChangeText={(display_name) => onChange({ display_name })} error={errors.display_name} />
      <Text style={styles.counter}>
        {charCount(value.display_name)}/{MAX_DISPLAY_NAME}
      </Text>
      <NameStyleEditor value={value.name_style} onChange={(name_style) => onChange({ name_style })} />
      <Button title="Surpreenda-me" variant="secondary" onPress={() => onChange({ name_style: surpriseNameStyle(value.name_style) })} />
    </>
  )
}

/** O editor do campo escolhido. */
function Fields({ id, value, errors, onChange }: FieldsProps): ReactNode {
  switch (id) {
    case 'name':
      return <NameFields value={value} errors={errors} onChange={onChange} />
    case 'pronouns':
      return <PronounsField value={value.pronouns} error={errors.pronouns} onChange={(pronouns) => onChange({ pronouns })} />
    case 'note':
      return <NoteField value={value.status_text} error={errors.status_text} onChange={(status_text) => onChange({ status_text })} />
    case 'bio':
      return <BioField value={value.bio} error={errors.bio} onChange={(bio) => onChange({ bio })} />
    case 'links':
      return <LinksField links={value.links} error={errors.links} linkErrors={errors.linkErrors} onChange={(links) => onChange({ links })} />
    case 'banner_color':
      return <BannerColorField value={value.banner_color} error={errors.banner_color} onChange={(banner_color) => onChange({ banner_color })} />
    case 'theme':
      return <ThemeEditor value={value.profile_theme} onChange={(profile_theme) => onChange({ profile_theme })} />
  }
}

interface ProfileEditModalProps {
  id: ProfileModalId
  user: User
  busy: boolean
  /** Devolve a mensagem de erro do servidor (null = salvou). */
  onApply: (patch: DraftPatch) => Promise<string | null>
  onClose: () => void
}

/**
 * Edita um campo do cartão com a prévia ao vivo no topo (no celular a prévia vem antes dos controles, como
 * no desktop). "Aplicar" já salva; "Cancelar" e o X descartam.
 */
export function ProfileEditModal({ id, user, busy, onApply, onClose }: ProfileEditModalProps) {
  const saved = draftFromProfile(user)
  const [patch, setPatch] = useState<DraftPatch>({})
  const [failure, setFailure] = useState<string | null>(null)
  const draft = patchedDraft(saved, patch)
  const errors = patchErrors(draft, KEYS[id])

  async function apply(): Promise<void> {
    const error = await onApply(patch)
    setFailure(error)
    if (!error) onClose()
  }

  return (
    <ModalSheet title={TITLES[id]} onClose={busy ? undefined : onClose}>
      <View accessibilityLabel="Prévia" style={styles.preview}>
        <ProfileCard profile={previewProfile(user, draft)} />
      </View>
      <Fields id={id} value={draft} errors={errors} onChange={(next) => setPatch((p) => ({ ...p, ...next }))} />
      {failure ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {failure}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button title="Cancelar" variant="secondary" onPress={onClose} disabled={busy} />
        <Button title={busy ? 'Salvando…' : 'Aplicar'} onPress={() => void apply()} disabled={busy || hasErrors(errors)} />
      </View>
    </ModalSheet>
  )
}

const styles = StyleSheet.create({
  preview: { maxHeight: 420, overflow: 'hidden' },
  counter: { color: colors.textFaint, fontSize: fontSize.xs, marginTop: -spacing.sm },
  error: { color: colors.textDanger, fontSize: fontSize.sm },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm }
})
