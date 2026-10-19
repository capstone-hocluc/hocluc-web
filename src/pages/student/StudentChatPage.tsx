import ChatWorkspace, { type ChatWorkspaceProps } from '../../components/chat/ChatWorkspace'

export default function StudentChatPage(props: Omit<ChatWorkspaceProps, 'console'>) {
  return <ChatWorkspace {...props} />
}
