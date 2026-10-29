import { Canvas, LinearGradient, RoundedRect, vec } from '@shopify/react-native-skia'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import { NonInteractive } from '../../profile/components/card/NonInteractive'
import { prideStops } from '../../profile/lib/cardGradient'
import { levelBadgeStyle } from '../lib/levelBadgeStyle'
import { levelTier } from '../lib/levels'
import { useLevelStore } from '../store/levelStore'

const RADIUS = 6

/** O fundo do selo: degradê na diagonal (135 graus) ou, no orgulho, faixas duras de cima para baixo. */
function Fill({ colors, stripes, width, height }: { colors: string[]; stripes: boolean; width: number; height: number }) {
  const stops = stripes ? prideStops(colors) : { colors, positions: undefined }
  const end = stripes ? vec(0, height) : vec(width, height)
  return (
    <NonInteractive testID="level-fill">
      <Canvas style={StyleSheet.absoluteFill}>
        <RoundedRect x={0} y={0} width={width} height={height} r={RADIUS}>
          <LinearGradient start={vec(0, 0)} end={end} colors={stops.colors} positions={stops.positions} />
        </RoundedRect>
      </Canvas>
    </NonInteractive>
  )
}

/** Selo "Nv 12" já com o nível conhecido. */
export function LevelPill({ level, size = 'sm' }: { level: number; size?: 'sm' | 'md' }) {
  const [box, setBox] = useState({ width: 0, height: 0 })
  const look = levelBadgeStyle(level)
  const tier = levelTier(level)
  const font = size === 'md' ? 11 : 9
  const onLayout = ({ nativeEvent: { layout } }: LayoutChangeEvent): void => setBox({ width: layout.width, height: layout.height })
  return (
    <View
      accessible
      accessibilityLabel={`Nível ${level} · ${tier.name}`}
      onLayout={onLayout}
      style={[styles.pill, { backgroundColor: look.colors[0], paddingHorizontal: size === 'md' ? 6 : 4, paddingVertical: size === 'md' ? 2 : 1 }]}
    >
      {box.width > 0 ? <Fill colors={look.colors} stripes={look.stripes} width={box.width} height={box.height} /> : null}
      <Text style={[styles.text, { color: look.text, fontSize: font }, look.halo ? { textShadowColor: look.halo, textShadowRadius: 2, textShadowOffset: { width: 0, height: 0 } } : null]}>
        <Text style={{ opacity: look.dimLabel ? 0.7 : 0.9 }}>Nv </Text>
        {level}
      </Text>
    </View>
  )
}

/** Selo de nível de uma pessoa: busca o nível (em lote) e não mostra nada enquanto não tem. */
export function LevelBadge({ userId, size }: { userId: string; size?: 'sm' | 'md' }) {
  const level = useLevelStore((s) => s.levels[userId])
  const ensureLevels = useLevelStore((s) => s.ensureLevels)
  useEffect(() => {
    ensureLevels([userId])
  }, [userId, ensureLevels])
  if (level === undefined) return null
  return <LevelPill level={level} size={size} />
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', borderRadius: RADIUS, overflow: 'hidden' },
  text: { fontWeight: '800', letterSpacing: 0.5 }
})
