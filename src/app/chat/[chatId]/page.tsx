import ChatWindow from '@/components/chat/chat-window'

export default function ChatPage({ params }: { params: { chatId: string } }) {
  return <ChatWindow chatId={params.chatId} />
}
