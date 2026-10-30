import { Canvas, Group, Path } from '@shopify/react-native-skia'

interface PathIconProps {
  /** Traços SVG num viewBox 24x24 (shared/ui/icons/hubIcons.ts). */
  paths: string[]
  color: string
  size?: number
  /** Sem rótulo o ícone fica escondido do leitor de tela (o nome acessível fica no botão). */
  label?: string
  testID?: string
}

/** Ícone preenchido desenhado pelo Skia (que o app já usa): o mesmo desenho do desktop e da web. */
export function PathIcon({ paths, color, size = 24, label, testID }: PathIconProps) {
  const accessibility = label ? { accessible: true, accessibilityLabel: label } : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const }
  return (
    <Canvas testID={testID} style={{ width: size, height: size, flexShrink: 0 }} {...accessibility}>
      <Group transform={[{ scale: size / 24 }]}>
        {paths.map((d, i) => (
          <Path key={i} path={d} color={color} />
        ))}
      </Group>
    </Canvas>
  )
}
