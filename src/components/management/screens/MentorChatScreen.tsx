import ChatWorkspace, { type ChatWorkspaceProps } from '../../chat/ChatWorkspace'

export default function MentorChatScreen(props: Omit<ChatWorkspaceProps, 'console'>) {
  return <ChatWorkspace {...props} console />
}
