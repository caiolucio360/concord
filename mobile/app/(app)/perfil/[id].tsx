import { useLocalSearchParams, useRouter } from 'expo-router'
import { ProfileScreen } from '../../../src/features/profile/components/ProfileScreen'
import { EffectsFocusProvider } from '../../../src/features/profile/components/EffectsFocus'

export default function ProfileRoute() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  return (
    <EffectsFocusProvider>
      <ProfileScreen userId={id} onBack={() => router.back()} />
    </EffectsFocusProvider>
  )
}
