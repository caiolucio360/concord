import { useLocalSearchParams, useRouter } from 'expo-router'
import { callController } from '../../../src/features/call/lib/callRuntime'
import { ChatScreen } from '../../../src/features/chat/components/ChatScreen'
import { useConversationsStore } from '../../../src/features/chat/store/conversationsStore'
import { useOpenProfile } from '../../../src/features/profile/hooks/useOpenProfile'

export default function ConversationRoute() {
  const router = useRouter()
  const { conversationId, name, type } = useLocalSearchParams<{ conversationId: string; name?: string; type?: string }>()
  const openProfile = useOpenProfile()
  const peerId = useConversationsStore((s) => s.conversations.find((c) => c.id === conversationId)?.other_user?.id)
  return (
    <ChatScreen
      variant={type === 'group' ? 'group' : 'dm'}
      id={conversationId}
      title={name ?? 'conversa'}
      peerId={type === 'group' ? undefined : peerId}
      onOpenProfile={openProfile}
      onCall={() => {
        void callController.callDm({ id: conversationId, name: name ?? 'conversa' })
        router.push('/chamada')
      }}
      onBack={() => router.back()}
    />
  )
}
