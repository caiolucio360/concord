import { useRouter } from 'expo-router'
import { useOpenProfile } from '../../src/features/profile/hooks/useOpenProfile'
import { RankingScreen } from '../../src/features/ranking/components/RankingScreen'

export default function RankingRoute() {
  const router = useRouter()
  const openProfile = useOpenProfile()
  return <RankingScreen onBack={() => router.back()} onOpenProfile={openProfile} />
}
