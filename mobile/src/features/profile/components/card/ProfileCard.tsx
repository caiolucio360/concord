import { useState } from 'react'
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native'
import { radius, spacing } from '../../../../shared/theme/tokens'
import type { PresenceStatus } from '../../../friends/lib/presenceStatus'
import { cardLook, needsFrame, type CardLook } from '../../lib/cardLook'
import type { ProfileData } from '../../lib/profileTypes'
import { CardFrame } from './CardFrame'
import { EffectCanvas } from './EffectCanvas'
import { CardAvatar } from './CardAvatar'
import { CardBanner } from './CardBanner'
import { CardBio } from './CardBio'
import { CardLinks, openExternal } from './CardLinks'
import { CardNames } from './CardNames'
import { CardSection } from './CardSection'

/** Largura máxima do cartão: em tela larga fica centrado em vez de esticar. */
const MAX_CARD_WIDTH = 480

interface ProfileCardProps {
  profile: ProfileData
  /** Status ao vivo para a bolinha; sem ele, sem bolinha. */
  status?: PresenceStatus
  onOpenLink?: (url: string) => void
}

const NO_SIZE = { width: 0, height: 0 }

/**
 * Fundo e borda do React Native. Quando o quadro do Skia (degradê, arco-íris) desenha, a borda é dele e o
 * fundo também, menos no fundo sólido, que continua daqui.
 */
function surfaceStyle(look: CardLook, framed: boolean) {
  if (!framed) return { backgroundColor: look.backgroundColor, borderColor: look.borderColor, borderWidth: look.borderWidth }
  // O padding ocupa o lugar da borda do React Native: sem ele o conteúdo cresceria 2 a 12 dp ao medir.
  return {
    backgroundColor: look.background.kind === 'solid' ? look.backgroundColor : 'transparent',
    borderWidth: 0,
    padding: look.border.width
  }
}

/** O cartão do perfil como os outros o veem, com o fundo, a borda e o efeito animado do tema. */
export function ProfileCard({ profile, status, onOpenLink = openExternal }: ProfileCardProps) {
  const [size, setSize] = useState(NO_SIZE)
  const look = cardLook(profile.profile_theme)
  const bio = profile.bio?.trim() ?? ''
  const links = profile.links ?? []
  // O desenho do Skia precisa do tamanho real do cartão: antes de medir, valem os estilos do React Native.
  const measured = size.width > 0 && size.height > 0
  const framed = measured && needsFrame(look)
  const onLayout = ({ nativeEvent: { layout } }: LayoutChangeEvent): void =>
    setSize((prev) => (prev.width === layout.width && prev.height === layout.height ? prev : { width: layout.width, height: layout.height }))
  return (
    <View testID="profile-card" onLayout={onLayout} style={[styles.card, surfaceStyle(look, framed)]}>
      {framed ? <CardFrame look={look} layer="background" width={size.width} height={size.height} /> : null}
      <CardBanner url={profile.banner_url} color={profile.banner_color} />
      <View style={styles.avatar}>
        <CardAvatar name={profile.display_name} uri={profile.avatar_url} status={status} cutout={look.backgroundColor} />
      </View>
      <View style={styles.body}>
        <CardNames
          displayName={profile.display_name}
          username={profile.username}
          nameStyle={profile.name_style}
          pronouns={profile.pronouns}
          statusText={profile.status_text}
          look={look}
        />
        {bio ? (
          <CardSection title="Sobre mim" look={look}>
            <CardBio text={bio} look={look} onOpen={onOpenLink} />
          </CardSection>
        ) : null}
        {links.length > 0 ? (
          <CardSection title="Links" look={look}>
            <CardLinks links={links} look={look} onOpen={onOpenLink} />
          </CardSection>
        ) : null}
      </View>
      {framed ? <CardFrame look={look} layer="border" width={size.width} height={size.height} /> : null}
      {measured && look.effect ? <EffectCanvas effect={look.effect.id} params={look.effect.params} width={size.width} height={size.height} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { width: '100%', maxWidth: MAX_CARD_WIDTH, alignSelf: 'center', borderRadius: radius.lg, overflow: 'hidden' },
  avatar: { marginTop: -44, paddingHorizontal: spacing.lg },
  body: { gap: spacing.lg, padding: spacing.lg }
})
