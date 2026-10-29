import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, fontSize, MIN_TOUCH, radius, spacing } from '../../../../shared/theme/tokens'
import { Avatar } from '../../../../shared/ui/Avatar'
import { Banner } from '../../../../shared/ui/Banner'
import { ConfirmSheet } from '../../../../shared/ui/ConfirmSheet'
import { ProfileCard } from '../../../profile/components/card/ProfileCard'
import { useCardPresence } from '../../../profile/hooks/useCardPresence'
import type { ProfileImageKind } from '../../../profile/api/profileImages'
import { SPOT_PLACEHOLDER } from '../../../profile/lib/cardSpots'
import { draftFromProfile } from '../../../profile/lib/profileValidation'
import { useProfileApply } from '../../hooks/useProfileApply'
import { linksSummary, nameStyleSummary, textSummary, themeName } from '../../lib/profileTiles'
import { ProfileEditModal, type ProfileModalId } from './ProfileEditModal'

interface MediaTilesProps {
  user: { display_name: string; username: string; avatar_url?: string | null; banner_url?: string | null; banner_color?: string | null }
  busy: boolean
  onPick: (kind: ProfileImageKind) => void
  onRemove: (kind: ProfileImageKind) => void
}

/** Avatar e banner lado a lado: tocar abre o seletor de imagem; "Remover" só aparece quando há imagem. */
function MediaTiles({ user, busy, onPick, onRemove }: MediaTilesProps) {
  return (
    <View style={styles.tileGroup}>
      <Text style={styles.tileTitle}>Avatar e banner</Text>
      <View style={styles.media}>
        <Pressable accessibilityRole="button" accessibilityLabel="Alterar avatar" disabled={busy} onPress={() => onPick('avatar')} style={styles.avatarTile}>
          <Avatar name={user.display_name || user.username} uri={user.avatar_url} size={56} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Alterar banner" disabled={busy} onPress={() => onPick('banner')} style={[styles.bannerTile, { backgroundColor: user.banner_color ?? colors.brand }]}>
          <Text style={styles.bannerText}>Alterar banner</Text>
        </Pressable>
      </View>
      <View style={styles.removeRow}>
        {(['avatar', 'banner'] as const).map((kind) =>
          user[`${kind}_url`] ? (
            <Pressable key={kind} accessibilityRole="button" accessibilityLabel={`Remover ${kind}`} disabled={busy} onPress={() => onRemove(kind)} style={styles.remove}>
              <Text style={styles.removeText}>Remover {kind}</Text>
            </Pressable>
          ) : null
        )}
      </View>
    </View>
  )
}

function Tile({ title, value, empty, onPress, label }: { title: string; value: string | null; empty?: string; onPress: () => void; label: string }) {
  return (
    <View style={styles.tileGroup}>
      <Text style={styles.tileTitle}>{title}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.tile}>
        <Text style={[styles.tileText, !value && styles.tileEmpty]} numberOfLines={2}>
          {value ?? empty ?? ''}
        </Text>
        <Text style={styles.pencil}>✎</Text>
      </Pressable>
    </View>
  )
}

const REMOVE_TEXT: Record<ProfileImageKind, string> = {
  avatar: 'Seu perfil volta a mostrar a inicial do seu nome.',
  banner: 'O banner volta a mostrar a cor escolhida (ou o degradê padrão).'
}

/**
 * Configurações → Perfis, como a tela "Perfis" do Discord: o cartão como os outros veem e, embaixo, os blocos
 * de personalização. Cada bloco abre o editor dele (folha de baixo com prévia ao vivo e "Aplicar", que já
 * salva); avatar e banner abrem o seletor de imagem do aparelho (com recorte).
 */
export function ProfilesSection() {
  const profile = useProfileApply()
  const presence = useCardPresence(profile.user?.id ?? '')
  const [modal, setModal] = useState<ProfileModalId | null>(null)
  const [removing, setRemoving] = useState<ProfileImageKind | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { user } = profile
  if (!user) return null

  const draft = draftFromProfile(user)
  const open = (id: ProfileModalId) => () => setModal(id)
  const pick = async (kind: ProfileImageKind): Promise<void> => setError(await profile.pickImage(kind))

  return (
    <View style={styles.section}>
      <ProfileCard profile={user} status={presence} />
      {profile.saving ? (
        <Text accessibilityRole="progressbar" style={styles.saving}>
          {profile.progress === null ? 'Salvando…' : `Enviando… ${Math.round(profile.progress * 100)}%`}
        </Text>
      ) : null}
      {error ? <Banner message={error} /> : null}

      <MediaTiles user={user} busy={profile.saving} onPick={(kind) => void pick(kind)} onRemove={setRemoving} />

      <Tile title="Cor do banner" value={draft.banner_color ?? 'Padrão'} onPress={open('banner_color')} label="Mudar a cor do banner" />
      <Tile title="Tema do perfil" value={themeName(draft.profile_theme)} onPress={open('theme')} label="Mudar o tema do perfil" />
      <Tile title="Nome de exibição" value={`${draft.display_name || user.username} · ${nameStyleSummary(draft.name_style)}`} onPress={open('name')} label="Editar nome de exibição e estilo" />
      <Tile title="Pronomes" value={textSummary(draft.pronouns)} empty={SPOT_PLACEHOLDER.pronouns} onPress={open('pronouns')} label="Editar pronomes" />
      <Tile title="Nota" value={textSummary(draft.status_text)} empty={SPOT_PLACEHOLDER.note} onPress={open('note')} label="Editar nota" />
      <Tile title="Sobre mim" value={textSummary(draft.bio)} empty={SPOT_PLACEHOLDER.bio} onPress={open('bio')} label="Editar Sobre mim" />
      <Tile title="Links" value={linksSummary(draft.links)} empty={SPOT_PLACEHOLDER.links} onPress={open('links')} label="Editar links" />

      {modal ? <ProfileEditModal key={modal} id={modal} user={user} busy={profile.saving} onApply={profile.apply} onClose={() => setModal(null)} /> : null}
      {removing ? (
        <ConfirmSheet
          title={`Remover ${removing === 'avatar' ? 'avatar' : 'banner'}?`}
          confirmLabel={`Remover ${removing === 'avatar' ? 'avatar' : 'banner'}`}
          onConfirm={async () => setError(await profile.removeImage(removing))}
          onClose={() => setRemoving(null)}
        >
          {REMOVE_TEXT[removing]}
        </ConfirmSheet>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: spacing.lg },
  saving: { color: colors.textMuted, fontSize: fontSize.sm },
  tileGroup: { gap: spacing.xs },
  tileTitle: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase' },
  tile: { minHeight: MIN_TOUCH, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: 'rgba(255,255,255,0.05)' },
  tileText: { flex: 1, color: colors.textStrong, fontSize: fontSize.md },
  tileEmpty: { color: colors.textFaint },
  pencil: { color: colors.textMuted, fontSize: fontSize.md },
  media: { flexDirection: 'row', gap: spacing.sm },
  avatarTile: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: 'rgba(255,255,255,0.05)' },
  bannerTile: { flex: 1, height: 80, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  bannerText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  removeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  remove: { minHeight: MIN_TOUCH, justifyContent: 'center' },
  removeText: { color: colors.textLink, fontSize: fontSize.sm }
})
