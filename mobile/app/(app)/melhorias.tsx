import { useRouter } from 'expo-router'
import { ImprovementsHub } from '../../src/features/ranking/components/ImprovementsHub'

export default function ImprovementsRoute() {
  const router = useRouter()
  return <ImprovementsHub onBack={() => router.back()} onOpenRanking={() => router.push('/ranking')} onOpenChangelog={() => router.push('/novidades')} />
}
