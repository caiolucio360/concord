import { Ionicons } from '@expo/vector-icons'
import { Image, StyleSheet, View } from 'react-native'
import type { BadgeRarity } from '../api/badges'
import { badgeArt } from '../lib/badgeArt'
import { rarityMeta } from '../lib/badges'

interface BadgeIconProps {
  category: string
  tier: number
  /** Lado em dp. */
  size: number
  rarity?: BadgeRarity
  /** Ainda não conquistado: apagado. */
  locked?: boolean
}

/** A arte de um tier (ou uma estrela na cor da raridade, se faltar arte). */
export function BadgeIcon({ category, tier, size, rarity, locked = false }: BadgeIconProps) {
  const art = badgeArt(category, tier)
  if (art === undefined) {
    return (
      <View accessibilityElementsHidden style={[styles.box, { width: size, height: size, opacity: locked ? 0.4 : 1 }]}>
        <Ionicons name="star" size={size * 0.8} color={rarityMeta(rarity).color} />
      </View>
    )
  }
  return <Image accessibilityElementsHidden source={art} style={{ width: size, height: size, opacity: locked ? 0.4 : 1 }} resizeMode="contain" />
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' }
})
