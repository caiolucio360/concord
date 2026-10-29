import { Canvas, LinearGradient, RoundedRect, vec } from '@shopify/react-native-skia'
import { StyleSheet } from 'react-native'
import { radius } from '../../../shared/theme/tokens'
import { gradientLine, prideStops } from '../lib/cardGradient'
import type { CardBackground, CardBorder, CardLook } from '../lib/cardLook'

interface Size {
  width: number
  height: number
}

/** Degradê na linha do ângulo do tema; o pride vira faixas duras. */
function Fill({ kind, colors, angle, width, height }: { kind: CardBackground['kind']; colors: string[]; angle: number } & Size) {
  const line = gradientLine(angle, width, height)
  const stops = kind === 'pride' ? prideStops(colors) : { colors, positions: undefined }
  return <LinearGradient start={vec(line.x0, line.y0)} end={vec(line.x1, line.y1)} colors={stops.colors} positions={stops.positions} />
}

function Background({ background, width, height }: { background: CardBackground } & Size) {
  return (
    <RoundedRect x={0} y={0} width={width} height={height} r={radius.lg}>
      <Fill kind={background.kind} colors={background.colors} angle={background.angle} width={width} height={height} />
    </RoundedRect>
  )
}

/** O traço é centrado na linha: o retângulo entra metade da espessura para a borda não vazar do cartão. */
function Border({ border, width, height }: { border: CardBorder } & Size) {
  const w = border.width
  const common = {
    style: 'stroke',
    strokeWidth: w,
    x: w / 2,
    y: w / 2,
    width: width - w,
    height: height - w,
    r: Math.max(0, radius.lg - w / 2)
  } as const
  if (border.kind === 'gradient' || border.kind === 'rainbow') {
    return (
      <RoundedRect {...common}>
        <Fill kind="gradient" colors={border.colors} angle={135} width={width} height={height} />
      </RoundedRect>
    )
  }
  return <RoundedRect {...common} color={border.colors[0]} />
}

interface CardFrameProps extends Size {
  look: CardLook
}

/**
 * Fundo em degradê (ou pride) e borda do tema, desenhados atrás do conteúdo do cartão. Só existe quando o
 * tema pede (needsFrame) e o cartão já tem tamanho. O brilho neon e a animação da borda são do PR 2c.
 */
export function CardFrame({ look, width, height }: CardFrameProps) {
  if (width <= 0 || height <= 0) return null
  const { background, border } = look
  return (
    <Canvas testID="card-frame" pointerEvents="none" style={StyleSheet.absoluteFill}>
      {background.kind !== 'solid' ? <Background background={background} width={width} height={height} /> : null}
      {border.kind !== 'none' && border.width > 0 ? <Border border={border} width={width} height={height} /> : null}
    </Canvas>
  )
}
