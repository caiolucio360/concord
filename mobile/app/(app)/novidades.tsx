import { useRouter } from 'expo-router'
import { ChangelogScreen } from '../../src/features/changelog/components/ChangelogScreen'

export default function ChangelogRoute() {
  const router = useRouter()
  return <ChangelogScreen onBack={() => router.back()} />
}
