import { useLocalSearchParams, useRouter } from 'expo-router'
import { EffectsFocusProvider } from '../../../src/features/profile/components/EffectsFocus'
import { SettingsSectionScreen } from '../../../src/features/settings/components/SettingsSectionScreen'

export default function SettingsSectionRoute() {
  const router = useRouter()
  const { secao } = useLocalSearchParams<{ secao: string }>()
  return (
    <EffectsFocusProvider>
      <SettingsSectionScreen id={secao} onBack={() => router.back()} />
    </EffectsFocusProvider>
  )
}
