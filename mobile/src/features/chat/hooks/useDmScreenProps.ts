import { useRouter } from 'expo-router'
import { callController } from '../../call/lib/callRuntime'
import { useOpenProfile } from '../../profile/hooks/useOpenProfile'
import { useConversationsStore } from '../store/conversationsStore'
import type { ChatScreenProps } from '../components/ChatScreen'

interface DmParams {
  conversationId: string
  name?: string
  type?: string
}

/** Props do ChatScreen para uma conversa (DM 1 a 1 ou grupo): título, perfil, ligar e voltar. */
export function useDmScreenProps({ conversationId, name, type }: DmParams): ChatScreenProps {
  const router = useRouter()
  const openProfile = useOpenProfile()
  const isGroup = type === 'group'
  const title = name ?? 'conversa'
  const peerId = useConversationsStore((s) => s.conversations.find((c) => c.id === conversationId)?.other_user?.id)
  return {
    variant: isGroup ? 'group' : 'dm',
    id: conversationId,
    title,
    peerId: isGroup ? undefined : peerId,
    onOpenProfile: openProfile,
    onCall: () => {
      void callController.callDm({ id: conversationId, name: title })
      router.push('/chamada')
    },
    onBack: () => router.back()
  }
}
