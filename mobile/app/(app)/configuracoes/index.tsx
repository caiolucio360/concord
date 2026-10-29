import { useRouter } from 'expo-router'
import { SettingsHome } from '../../../src/features/settings/components/SettingsHome'

export default function SettingsRoute() {
  const router = useRouter()
  return <SettingsHome onBack={() => router.back()} onOpenSection={(id) => router.push(`/configuracoes/${id}`)} />
}
