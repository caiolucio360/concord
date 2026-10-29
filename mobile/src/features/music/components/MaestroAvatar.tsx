import { StyleSheet, Text, View } from 'react-native'

/** Avatar do Maestro: círculo com o 🎻 (o desktop usa um GIF embutido; o app ainda não tem esse asset). */
export function MaestroAvatar({ size = 36 }: { size?: number }) {
  return (
    <View accessibilityLabel="Maestro" style={[styles.box, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ fontSize: size * 0.55 }}>🎻</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#323237' }
})
