import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { Linking } from 'react-native'
import { CallScreen } from '../../src/features/call/components/CallScreen'
import { callController } from '../../src/features/call/lib/callRuntime'
import { LiveCamera } from '../../src/features/call/lib/livekitCamera'
import { LiveScreen } from '../../src/features/call/lib/livekitScreen'
import { useAuthStore } from '../../src/features/auth/store/authStore'
import { useCallSessionStore } from '../../src/features/call/store/callSessionStore'

export default function CallRoute() {
  const router = useRouter()
  const idle = useCallSessionStore((s) => s.phase === 'idle')
  const meId = useAuthStore((s) => s.user?.id)

  // A chamada acabou (ou nunca existiu): não deixa uma tela vazia aberta.
  useEffect(() => {
    if (idle) router.back()
  }, [idle, router])

  return (
    <CallScreen
      onBack={() => router.back()}
      onLeave={() => void callController.leave()}
      onOpenSettings={() => void Linking.openSettings()}
      onToggleShare={() => void callController.toggleScreenShare()}
      onWatch={(userId) => callController.watchScreen(userId)}
      renderScreen={(userId) => <LiveScreen userId={userId} />}
      onToggleCamera={() => void callController.toggleCamera()}
      onFlipCamera={() => void callController.flipCamera()}
      renderCamera={(userId) => <LiveCamera userId={userId} mirror={userId === meId} />}
    />
  )
}
