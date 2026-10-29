import { Image, StyleSheet } from 'react-native'

// O mesmo GIF do desktop e da web (frontend/src/renderer/src/assets/maestro.gif).
const MAESTRO_GIF = require('../../../../assets/music/maestro.gif')

/** Avatar do Maestro: o GIF embutido no app, sem imagem no banco. */
export function MaestroAvatar({ size = 36 }: { size?: number }) {
  return <Image accessibilityLabel="Maestro" source={MAESTRO_GIF} style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} />
}

const styles = StyleSheet.create({
  image: { backgroundColor: '#323237' }
})
