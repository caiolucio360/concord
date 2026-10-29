import { useLocalSearchParams } from 'expo-router'
import { ChatScreen } from '../../../src/features/chat/components/ChatScreen'
import { useDmScreenProps } from '../../../src/features/chat/hooks/useDmScreenProps'

export default function ConversationRoute() {
  const params = useLocalSearchParams<{ conversationId: string; name?: string; type?: string }>()
  return <ChatScreen {...useDmScreenProps(params)} />
}
