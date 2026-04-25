import ChatWindow from '@/components/chat/chat-window'

export default function ChatRootPage() {
  // Use "new" as the chatId to indicate a draft conversation
  return <ChatWindow chatId="new" />
}
