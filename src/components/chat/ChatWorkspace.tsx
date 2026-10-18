import SelectField from '../console/select-field'
import { useEffect, useRef, useState, useCallback, type ComponentProps } from 'react'
import ConsoleButton from '../console/button'
import ConsoleNotice from '../console/notice'
import StudentButton from '../ui/Button'
import StudentNotice from '../ui/Notice'
import ConsoleDialog from '../console/dialog'
import ConsoleSelect from '../console/select-field'
import ConsoleStatus from '../console/status'
import { fieldControlClass, textareaControlClass } from '../console/form-field'
import { ChatAvatar, ChatInboxRow, ChatMessageBubble } from '../console/chat-presentation'
import { chatDay } from '../console/chat-format'
import Modal from '../ui/Modal'
import { ArrowLeft, Send, Search, RefreshCw, FileText, Check, Plus } from '../console/icons'
import { chatService } from '../../services/chatService'
import { chatError, chatIdentity, mergeMessages, useChatWorkspace } from '../../hooks/useChatWorkspace'
import { useUnsavedActionGuard } from '../../hooks/useUnsavedActionGuard'
import type { ChatAttachment, ChatStatus, SendChatMessage } from '../../types/chat'
import MentorHoursEditor from './MentorHoursEditor'
export interface ChatWorkspaceProps {
  conversationId?: string
  onSelectConversation: (id?: string) => void
  console?: boolean
}
const statusLabels: Record<ChatStatus, string> = { OPEN: 'Chờ hỗ trợ', IN_PROGRESS: 'Đang hỗ trợ', RESOLVED: 'Đã hoàn tất' }
const studentStatusChip: Record<ChatStatus, string> = {
  OPEN: 'bg-badge-warning-bg text-badge-warning-text',
  IN_PROGRESS: 'bg-primary-soft text-primary-text',
  RESOLVED: 'bg-badge-success-bg text-badge-success-text',
}

export default function ChatWorkspace({ conversationId, onSelectConversation, console: isConsole = false }: ChatWorkspaceProps) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ChatStatus | ''>('')
  const [unread, setUnread] = useState(false)
  const chat = useChatWorkspace(conversationId, { search: query, status: status || undefined, unread: unread || undefined })
  const [draft, setDraft] = useState('')
  const [attachments, setAttachments] = useState<ChatAttachment[]>([])
  const [pendingSend, setPendingSend] = useState<SendChatMessage | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [composerError, setComposerError] = useState('')
  const [newRequest, setNewRequest] = useState(false)
  const [hoursOpen, setHoursOpen] = useState(false)
  const [newMessages, setNewMessages] = useState(false)
  const scroll = useRef<HTMLDivElement>(null)
  const previousMessageCount = useRef(0)
  const nearBottom = useRef(true)
  const scrollToEnd = useRef(false)
  const prepending = useRef(false)
  const pendingPrepend = useRef<{ top: number; height: number } | null>(null)
  const readSequence = useRef(0)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const activeSelection = useRef(conversationId)
  useEffect(() => { activeSelection.current = conversationId }, [conversationId])
  const guard = useUnsavedActionGuard(Boolean(draft.trim() || attachments.length || newRequest), busy || uploading)
  // A capability-level send block (account restriction) applies on top of the per-conversation flag.
  const canSend = chat.capabilities?.canSend !== false && Boolean(chat.detail?.canSend)
  const Button = isConsole ? ConsoleButton : StudentButton
  const Notice = isConsole ? ConsoleNotice : StudentNotice
  const surface = isConsole ? 'border-card-border bg-card-background text-text-primary' : 'border-line-card bg-surface text-text-heading'
  const muted = isConsole ? 'text-text-tertiary' : 'text-text-body'
  const line = isConsole ? 'border-card-border' : 'border-line'
  const secondary = isConsole ? 'bg-background-gray-secondary' : 'bg-surface-brand'
  const control = isConsole ? 'border-card-border bg-input-background text-text-primary placeholder:text-input-placeholder-text focus:ring-input-primary-focus-border' : 'border-line bg-surface text-text-heading placeholder:text-text-faint focus:border-primary focus:ring-primary/20'
  const field = isConsole ? fieldControlClass : `w-full rounded-xl border-2 px-3.5 py-2.5 text-[15px] font-semibold outline-none focus:ring-4 disabled:opacity-50 ${control}`
  const currentUserId = chat.identity.split(':')[0]
  function discardDraft() { setDraft(''); setAttachments([]); setPendingSend(null); setComposerError(''); setNewRequest(false) }
  function select(id?: string) { onSelectConversation(id) }
  useEffect(() => {
    // Account and route changes must purge editor data before new conversation use.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(''); setAttachments([]); setPendingSend(null); setComposerError(''); setBusy(false); setUploading(false); setNewRequest(false)
    nearBottom.current = true; previousMessageCount.current = 0; setNewMessages(false)
    readSequence.current = 0
  }, [conversationId, chat.identity])
  useEffect(() => {
    // A missing detail means access was revoked or the request is gone: drop the
    // composer so a purged transcript can never be replayed into a new send.
    if (chat.detail || chat.detailLoading) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(''); setAttachments([]); setPendingSend(null)
  }, [chat.detail, chat.detailLoading])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (createdId && !newRequest) { setCreatedId(null); onSelectConversation(createdId) }
  }, [createdId, newRequest, onSelectConversation])
  const { messages: visibleMessages, readableSequence, refreshInbox } = chat
  const markVisibleRead = useCallback(() => {
    // A confirmed POST can render above unseen messages. Never acknowledge
    // past the contiguous REST batch that has actually committed to the UI.
    const latest = Math.min(visibleMessages.at(-1)?.sequence ?? 0, readableSequence)
    if (!conversationId || !nearBottom.current || document.visibilityState !== 'visible' || !document.hasFocus() || latest <= readSequence.current) return
    const id = conversationId, scope = chatIdentity()
    readSequence.current = latest
    void chatService.markRead(id, latest).then(() => {
      if (scope === chatIdentity() && activeSelection.current === id) void refreshInbox(undefined, true)
    }).catch(() => { if (scope === chatIdentity() && activeSelection.current === id) readSequence.current = 0 })
  }, [visibleMessages, readableSequence, refreshInbox, conversationId])
  useEffect(() => {
    const count = chat.messages.length
    const container = scroll.current
    const prepend = pendingPrepend.current
    if (container && prepend) {
      // Restore the reading position after older messages were prepended; this
      // runs after React committed the new articles, so scrollHeight is final.
      container.scrollTop = prepend.top + (container.scrollHeight - prepend.height)
      pendingPrepend.current = null
      prepending.current = false
    } else if (container && count > previousMessageCount.current && !prepending.current) {
      if (nearBottom.current || scrollToEnd.current || previousMessageCount.current === 0) {
        container.scrollTop = container.scrollHeight; setNewMessages(false)
      } else setNewMessages(true)
    }
    scrollToEnd.current = false
    previousMessageCount.current = count
    if (!prepending.current && !pendingPrepend.current) markVisibleRead()
  }, [chat.messages, markVisibleRead])
  useEffect(() => {
    window.addEventListener('focus', markVisibleRead)
    document.addEventListener('visibilitychange', markVisibleRead)
    return () => { window.removeEventListener('focus', markVisibleRead); document.removeEventListener('visibilitychange', markVisibleRead) }
  }, [markVisibleRead])
  async function send() {
    if (!conversationId || !canSend || busy || uploading || (!draft.trim() && !attachments.length)) return
    const id = conversationId, scope = chatIdentity()
    const payload = pendingSend ?? { body: draft.trim(), clientMessageId: crypto.randomUUID(), attachmentIds: attachments.map(file => file.id) }
    // Freeze the payload on failure so retry always reuses the same key and content.
    setPendingSend(payload); setBusy(true); setComposerError('')
    try {
      const response = await chatService.sendMessage(id, payload)
      // A response that lands after access was revoked must not repaint the purge.
      if (scope !== chatIdentity() || activeSelection.current !== id || chat.isAccessRevoked()) return
      if (!response.data) throw new Error('Máy chủ chưa xác nhận tin nhắn.')
      scrollToEnd.current = true
      chat.setMessages(previous => mergeMessages(previous, [response.data!]))
      setDraft(''); setAttachments([]); setPendingSend(null)
      void chat.refreshDetail(); void chat.refreshInbox()
    } catch (cause) {
      if (scope === chatIdentity() && activeSelection.current === id && !chat.isAccessRevoked()) { setComposerError(chatError(cause)); void chat.refreshDetail() }
    } finally { if (scope === chatIdentity() && activeSelection.current === id) setBusy(false) }
  }
  async function attach(files: FileList | null) {
    if (!files?.length || !conversationId || !canSend || uploading || busy || pendingSend) return
    const id = conversationId, scope = chatIdentity()
    const chosen = [...files]
    const max = chat.capabilities?.maxAttachments ?? 3
    if (chosen.length + attachments.length > max) { setComposerError(`Mỗi tin nhắn tối đa ${max} tệp.`); return }
    const maxBytes = chat.capabilities?.maxFileBytes ?? 10 * 1024 * 1024
    if (chosen.some(file => !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type) || file.size > maxBytes)) {
      setComposerError('Chỉ nhận ảnh JPEG, PNG, WebP hoặc PDF trong giới hạn dung lượng.'); return
    }
    setUploading(true); setComposerError('')
    try {
      for (const file of chosen) {
        const reservation = await chatService.reserveAttachment(id, { name: file.name, mimeType: file.type, sizeBytes: file.size })
        if (scope !== chatIdentity() || activeSelection.current !== id) return
        if (!reservation.data) throw new Error('Không nhận được đường dẫn tải tệp.')
        await chatService.uploadAttachment(reservation.data, file)
        if (scope !== chatIdentity() || activeSelection.current !== id) return
        const complete = await chatService.completeAttachment(id, reservation.data.attachmentId)
        if (scope !== chatIdentity() || activeSelection.current !== id) return
        if (!complete.data) throw new Error('Tệp chưa được xác minh.')
        setAttachments(previous => [...previous, complete.data!])
      }
    } catch (cause) { if (scope === chatIdentity() && activeSelection.current === id) setComposerError(chatError(cause)) }
    finally { if (scope === chatIdentity() && activeSelection.current === id) setUploading(false) }
  }
  async function download(attachmentId: string, fileName: string) {
    if (!conversationId) return
    const scope = chatIdentity(), id = conversationId
    const preview = window.open('about:blank', '_blank')
    if (preview) preview.opener = null
    try {
      const content = await chatService.downloadAttachmentContent(id, attachmentId)
      if (scope !== chatIdentity() || activeSelection.current !== id) { preview?.close(); return }
      const objectUrl = URL.createObjectURL(content)
      if (preview && !preview.closed) preview.location.replace(objectUrl)
      else {
        const link = document.createElement('a')
        link.href = objectUrl
        link.download = fileName
        link.click()
      }
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
    } catch (cause) {
      preview?.close()
      if (scope === chatIdentity() && activeSelection.current === id) setComposerError(chatError(cause))
    }
  }
  async function resolve() {
    if (!conversationId || busy || !canSend) return
    const scope = chatIdentity(), id = conversationId
    setBusy(true)
    try { await chatService.resolve(id); if (scope === chatIdentity() && activeSelection.current === id) { await chat.refreshDetail(); void chat.refreshInbox() } }
    catch (cause) { if (scope === chatIdentity() && activeSelection.current === id) setComposerError(chatError(cause)) }
    finally { if (scope === chatIdentity() && activeSelection.current === id) setBusy(false) }
  }
  function actionButton(props: ComponentProps<typeof StudentButton>) { return <Button {...props} /> }
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className={isConsole ? 'text-2xl font-semibold text-text-primary' : 'text-2xl font-black tracking-[-0.4px] text-text-heading'}>{isConsole ? 'Hỗ trợ học sinh' : 'Hỏi Mentor'}</h1>
      <div className="flex gap-2">
        {isConsole && <Button appearance="outline" onClick={() => setHoursOpen(true)}>Giờ hỗ trợ</Button>}
        {!isConsole && <Button disabled={!chat.capabilities?.canCreate} onClick={() => guard.requestAction(() => { discardDraft(); setNewRequest(true) })}><Plus size={16} />Yêu cầu mới</Button>}
        <Button appearance="outline" size={isConsole ? undefined : 'icon'} aria-label="Tải lại chat" onClick={() => { void chat.refreshInbox(); void chat.refreshDetail() }}><RefreshCw size={16} /></Button>
      </div>
    </div>
    {chat.error && <Notice tone="danger">{chat.error}</Notice>}
    {chat.capabilities && !chat.capabilities.canCreate && !isConsole && <Notice tone="warning">{chat.capabilities.reason || 'Bạn cần khóa đã mua còn hiệu lực để gửi yêu cầu. Lịch sử vẫn có thể xem.'}</Notice>}
    {chat.socketState !== 'connected' && <Notice tone="info">{chat.socketState === 'connecting' ? 'Đang kết nối chat…' : 'Chat đang ngoại tuyến. Tin nhắn đã lưu vẫn tải được; nhấn tải lại để cập nhật.'}</Notice>}
    <div className={`grid min-h-[560px] overflow-hidden ${isConsole ? 'rounded-xl border' : 'rounded-3xl border-[1.5px] shadow-card'} md:h-[min(720px,calc(100dvh-210px))] ${isConsole ? 'md:grid-cols-[320px_minmax(0,1fr)]' : 'md:grid-cols-[300px_minmax(0,1fr)]'} ${surface}`}>
      <aside aria-label="Danh sách hội thoại" className={`flex min-h-0 flex-col border-r ${line} ${conversationId ? 'hidden md:flex' : 'flex'}`}>
        <div className={`space-y-3 border-b p-4 ${line}`}>
          <label className="relative block"><Search size={16} className={`absolute left-3 ${isConsole ? 'top-3' : 'top-3.5'} ${muted}`} /><input aria-label="Tìm hội thoại" className={`${field} pl-9`} value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm hội thoại" /></label>
          {isConsole ? <>
            <ConsoleSelect ariaLabel="Trạng thái hội thoại" className="w-full" triggerClassName="w-full" value={status || 'all'} onChange={value => setStatus(value === 'all' ? '' : value as ChatStatus)} options={[{ id: 'all', label: 'Tất cả trạng thái' }, ...Object.entries(statusLabels).map(([id, label]) => ({ id, label }))]} />
            <div className="flex gap-2" aria-label="Lọc hội thoại">
              <Button appearance="ghost" size="sm" aria-pressed={!unread} className={`min-h-11 flex-1 ${!unread ? 'bg-background-gray-secondary text-text-primary' : ''}`} onClick={() => setUnread(false)}>Tất cả</Button>
              <Button appearance="ghost" size="sm" aria-pressed={unread} className={`min-h-11 flex-1 ${unread ? 'bg-background-gray-secondary text-text-primary' : ''}`} onClick={() => setUnread(true)}>Chưa đọc</Button>
            </div>
          </> : <>
            <SelectField
              ariaLabel="Trạng thái hội thoại"
              triggerClassName={field}
              value={status}
              onChange={(nextValue) => setStatus(nextValue as ChatStatus | '')}
              options={[
                { id: '', label: 'Tất cả trạng thái' },
                ...Object.entries(statusLabels).map(([key, label]) => ({ id: String(key), label })),
              ]}
            />
            <label className="flex min-h-11 items-center gap-2 text-[15px] font-bold text-text-heading"><input type="checkbox" className="size-4 accent-primary" checked={unread} onChange={event => setUnread(event.target.checked)} />Chưa đọc</label>
          </>}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {chat.loading && !chat.inbox.length && <p role="status" className={`p-5 text-sm ${muted}`}>Đang tải hội thoại…</p>}
          {!chat.loading && !chat.inbox.length && !chat.error && <p className={`p-5 text-sm ${muted}`}>Chưa có hội thoại phù hợp.</p>}
          {chat.inbox.map(item => isConsole ? <ChatInboxRow key={item.id} item={item} active={item.id === conversationId} statusLabel={statusLabels[item.status]} onSelect={() => select(item.id)} /> : <button type="button" key={item.id} onClick={() => select(item.id)} aria-current={item.id === conversationId ? 'true' : undefined} className={`block w-full border-b p-4 text-left transition-colors hover:bg-surface-brand focus-visible:-outline-offset-3 focus-visible:outline-3 focus-visible:outline-[#174fbd] ${line} ${item.id === conversationId ? `${secondary} shadow-[inset_4px_0_0_#1cb0f6]` : ''}`}>
            <div className="flex items-start justify-between gap-2"><span className="font-extrabold break-words text-text-heading">{item.title}</span>{item.unreadCount > 0 && <span aria-label={`${item.unreadCount} tin chưa đọc`} className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-extrabold text-white">{item.unreadCount}</span>}</div>
            <p className={`mt-1 text-xs ${muted}`}>{isConsole ? item.student.displayName : item.mentor?.displayName || 'Đang chờ Mentor'} · {item.subjectName || 'Môn học'}</p>
            <p className={`mt-2 line-clamp-2 text-sm ${muted}`}>{item.lastMessagePreview || statusLabels[item.status]}</p>
            <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-extrabold ${studentStatusChip[item.status]}`}>{statusLabels[item.status]}</span>
          </button>)}
          {chat.cursor && <div className="p-4"><Button appearance="outline" disabled={chat.loading} onClick={() => void chat.refreshInbox(chat.cursor!)}>Tải thêm hội thoại</Button></div>}
        </div>
      </aside>
      <section aria-label="Hội thoại" className={`flex min-h-0 min-w-0 flex-col ${conversationId ? 'flex' : 'hidden md:flex'}`}>
        {!conversationId ? <div className={`flex flex-1 items-center justify-center p-8 text-center ${muted}`}>Chọn một hội thoại để xem tin nhắn.</div> : <>
          <div className={`flex items-start justify-between gap-3 border-b p-4 ${line} ${isConsole ? '' : 'bg-surface-brand'}`}>
            <div className="flex min-w-0 items-start gap-2"><Button appearance="ghost" size="icon" aria-label="Quay lại danh sách hội thoại" className="md:hidden" onClick={() => select()}><ArrowLeft size={18} /></Button>{isConsole && chat.detail && <ChatAvatar name={chat.detail.student.displayName} />}<div className="min-w-0"><h2 className={isConsole ? 'font-semibold break-words' : 'text-lg font-black tracking-[-0.3px] break-words text-text-heading'}>{chat.detail?.title || 'Hội thoại'}</h2>{isConsole && chat.detail && <ConsoleStatus tone={chat.detail.status === 'RESOLVED' ? 'success' : 'info'} className="mt-2 text-xs">{statusLabels[chat.detail.status]}</ConsoleStatus>}{chat.detail && <><p className={`mt-1 text-xs ${muted}`}>{isConsole ? chat.detail.student.displayName : `${chat.detail.mentor?.displayName || 'Đang chờ phân công Mentor'} · ${statusLabels[chat.detail.status]}`}</p><p className={`mt-1 text-xs ${muted}`}>{chat.detail.mentorAvailability?.label || 'Chưa thiết lập lịch hỗ trợ'}</p></>}</div></div>
            {canSend && chat.detail && chat.detail.status !== 'RESOLVED' && <Button appearance="outline" size="sm" disabled={busy || Boolean(draft.trim()) || attachments.length > 0} onClick={() => void resolve()}><Check size={14} />Hoàn tất</Button>}
          </div>
          {chat.detailError && <div className="p-4"><Notice tone="danger">{chat.detailError}</Notice></div>}
          {chat.detail?.contextSnapshot && <details className={`border-b p-4 text-sm ${line}`}><summary className={isConsole ? 'cursor-pointer font-medium' : 'cursor-pointer font-extrabold text-text-heading'}>Ngữ cảnh bài toán</summary><p className={`mt-2 text-xs ${muted}`}>Nguồn: {chat.detail.contextSnapshot.source} · Nội dung do người gửi cung cấp</p>{[chat.detail.contextSnapshot.problem, chat.detail.contextSnapshot.solution, chat.detail.contextSnapshot.conversationExcerpt].filter(Boolean).map((text, index) => <p key={index} className="mt-3 whitespace-pre-wrap break-words">{text}</p>)}</details>}
          <div ref={scroll} onScroll={() => { const el = scroll.current; if (el) { nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90; if (nearBottom.current) { setNewMessages(false); markVisibleRead() } } }} className={`min-h-[240px] flex-1 space-y-4 overflow-y-auto p-4 md:min-h-0 ${isConsole ? '' : 'bg-surface-soft'}`} aria-live="polite" aria-busy={chat.detailLoading}>
            {chat.detailLoading && <p className={`text-sm ${muted}`}>Đang tải tin nhắn…</p>}
            {chat.hasOlder && <Button appearance="outline" size="sm" onClick={async () => { const el = scroll.current; if (!el || pendingPrepend.current) return; pendingPrepend.current = { top: el.scrollTop, height: el.scrollHeight }; prepending.current = true; const loaded = await chat.loadOlder(); if (!loaded) { pendingPrepend.current = null; prepending.current = false } }}>Tải tin nhắn cũ</Button>}
            {chat.messages.map((message, index) => isConsole ? <ChatMessageBubble key={message.id} message={message} outgoing={message.senderId === currentUserId} showDay={index === 0 || chatDay(message.createdAt) !== chatDay(chat.messages[index - 1].createdAt)} onDownload={(id, name) => { void download(id, name) }} /> : <article key={message.id} className={`max-w-[85%] rounded-2xl border-[1.5px] px-4 py-3 ${message.senderId === currentUserId ? 'ml-auto rounded-br-md border-primary bg-primary text-white shadow-[0_3px_0_#0797d6]' : 'rounded-bl-md border-line-card bg-surface text-text-heading shadow-card-soft'}`}><p className="text-[13px] font-extrabold">{message.senderName}</p><p className="mt-1.5 whitespace-pre-wrap break-words text-[15px]">{message.body}</p>{message.attachments.map(file => <button type="button" key={file.id} className="mt-2 flex max-w-full items-center gap-2 text-left text-sm underline" onClick={() => void download(file.id, file.name)}><FileText size={16} className="shrink-0" /><span className="break-all">{file.name}</span></button>)}<p className={`mt-2 text-xs ${message.senderId === currentUserId ? 'text-white/85' : muted}`}>{new Date(message.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</p></article>)}
            {!chat.detailLoading && chat.detail && !chat.messages.length && <p className={`text-sm ${muted}`}>Chưa có tin nhắn.</p>}
          </div>
          {newMessages && <div className="px-4 pb-2"><Button size="sm" appearance="outline" onClick={() => { if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; nearBottom.current = true; setNewMessages(false); markVisibleRead() }}>Tin nhắn mới ↓</Button></div>}
          {chat.detail && <form className={`space-y-3 border-t p-4 ${line}`} onSubmit={event => { event.preventDefault(); void send() }}>
            {!canSend && <Notice tone="warning">{chat.detail.sendDisabledReason || (chat.capabilities?.canSend === false ? chat.capabilities.reason : '') || (chat.detail.status === 'RESOLVED' ? 'Yêu cầu đã hoàn tất. Bạn có thể đọc lịch sử.' : 'Bạn hiện không có quyền gửi tin mới. Lịch sử vẫn được giữ.')} </Notice>}
            {composerError && <Notice tone="danger">{composerError}</Notice>}
            {attachments.length > 0 && <ul className="space-y-1 text-sm">{attachments.map(file => <li key={file.id} className="flex items-center justify-between gap-2"><span className="truncate">{file.name}</span><button type="button" className={isConsole ? undefined : 'cursor-pointer font-extrabold text-primary-text underline'} disabled={busy || Boolean(pendingSend)} onClick={() => setAttachments(previous => previous.filter(item => item.id !== file.id))}>Bỏ tệp</button></li>)}</ul>}
            <textarea aria-label="Tin nhắn" rows={3} className={isConsole ? `${textareaControlClass} min-h-24 resize-y text-base` : field} placeholder="Viết tin nhắn…" value={draft} disabled={!canSend || busy || Boolean(pendingSend)} onChange={event => { setDraft(event.target.value); chat.sendTyping() }} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send() } }} />
            {isConsole && <p className="text-xs text-text-tertiary">Enter để gửi · Shift+Enter để xuống dòng</p>}
            <div className={`flex flex-wrap items-center justify-between gap-3 ${isConsole ? 'border-t border-card-border pt-3' : ''}`}><div className={`text-xs ${muted}`}>{chat.capabilities?.attachmentsEnabled ? <label className={isConsole ? `inline-flex min-h-11 items-center gap-2 rounded-lg border border-card-border px-3 text-sm text-text-secondary focus-within:ring-2 focus-within:ring-input-primary-focus-border ${!canSend || uploading || busy || pendingSend ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-background-gray-secondary'}` : 'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border-2 border-line px-3 text-sm font-extrabold text-primary-text transition-colors hover:bg-surface-brand focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-[#174fbd]'}><FileText size={18} aria-hidden="true" />{uploading ? 'Đang tải tệp…' : 'Đính kèm ảnh / PDF'}<input aria-label="Đính kèm ảnh hoặc PDF" className="sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" disabled={!canSend || uploading || busy || Boolean(pendingSend)} onChange={event => { void attach(event.target.files); event.target.value = '' }} /></label> : 'Tệp đính kèm chưa khả dụng'}</div><Button type="submit" disabled={!canSend || busy || uploading || (!draft.trim() && !attachments.length)}><Send size={16} />{busy ? 'Đang gửi…' : pendingSend ? 'Thử gửi lại' : 'Gửi'}</Button></div>
            {pendingSend && !busy && <p className={`text-xs ${muted}`}>Tin chưa được xác nhận. Thử gửi lại sẽ dùng cùng mã tin để tránh gửi trùng. <button type="button" className="underline" onClick={() => { setPendingSend(null); setDraft(''); setAttachments([]); setComposerError('') }}>Hủy tin chưa gửi</button></p>}
          </form>}
        </>}
      </section>
    </div>
    {newRequest && <NewRequest field={field} onCancel={() => guard.requestAction(() => setNewRequest(false))} onCreated={id => { setNewRequest(false); void chat.refreshInbox(); setCreatedId(id) }} renderButton={actionButton} />}
    {hoursOpen && <MentorHoursEditor isConsole={isConsole} onClose={() => setHoursOpen(false)} />}
    {guard.hasPendingAction && (isConsole ? <ConsoleDialog open title="Bỏ bản nháp chưa gửi?" onClose={guard.cancelDiscard}><p className="text-sm text-text-tertiary">Nội dung và tệp chưa gửi sẽ bị bỏ khi rời hội thoại.</p><div className="mt-5 flex justify-end gap-3"><Button appearance="outline" onClick={guard.cancelDiscard}>Tiếp tục viết</Button><Button onClick={() => { discardDraft(); guard.confirmDiscard() }}>Bỏ bản nháp</Button></div></ConsoleDialog> : <Modal open title="Bỏ bản nháp chưa gửi?" onClose={guard.cancelDiscard}><p>Nội dung và tệp chưa gửi sẽ bị bỏ khi rời hội thoại.</p><div className="mt-5 flex justify-end gap-3"><Button appearance="outline" onClick={guard.cancelDiscard}>Tiếp tục viết</Button><Button onClick={() => { discardDraft(); guard.confirmDiscard() }}>Bỏ bản nháp</Button></div></Modal>)}
  </div>
}

function NewRequest({ field, onCancel, onCreated, renderButton }: { field: string; onCancel: () => void; onCreated: (id: string) => void; renderButton: (props: ComponentProps<typeof StudentButton>) => React.ReactNode }) {
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([])
  const [subject, setSubject] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useUnsavedActionGuard(false, busy)
  const [locked, setLocked] = useState(false)
  const requestId = useRef(crypto.randomUUID())
  const lockedPayload = useRef<{ title: string; subjectCategoryId: string; initialMessage: string; clientRequestId: string } | null>(null)
  const alive = useRef(true)
  const scope = useRef(chatIdentity())
  useEffect(() => { alive.current = true; void chatService.listSubjects().then(result => { if (alive.current && scope.current === chatIdentity()) setSubjects(result.data ?? []) }).catch(cause => { if (alive.current && scope.current === chatIdentity()) setError(chatError(cause)) }); return () => { alive.current = false } }, [])
  async function create() {
    if (busy || !subject || !title.trim() || !body.trim()) return
    const payload = lockedPayload.current ?? { title: title.trim(), subjectCategoryId: subject, initialMessage: body.trim(), clientRequestId: requestId.current }
    lockedPayload.current = payload; setLocked(true); setBusy(true); setError('')
    try { const result = await chatService.createConversation(payload); if (alive.current && scope.current === chatIdentity()) { if (!result.data) throw new Error('Yêu cầu chưa được xác nhận.'); onCreated(result.data.id) } }
    catch (cause) { if (alive.current && scope.current === chatIdentity()) setError(chatError(cause)) }
    finally { if (alive.current && scope.current === chatIdentity()) setBusy(false) }
  }
  return <Modal open title="Tạo yêu cầu hỗ trợ" maxWidth={560} onClose={() => { if (!busy) onCancel() }}><form onSubmit={event => { event.preventDefault(); void create() }} className="space-y-4">{error && <p role="alert" className="text-danger">{error}</p>}<label className="block text-sm font-extrabold text-text-heading">Môn học<SelectField
    required
    ariaLabel="Môn học"
    triggerClassName={`mt-1 ${field}`}
    value={subject}
    disabled={busy || locked}
    onChange={(nextValue) => setSubject(nextValue)}
    options={[
      { id: '', label: 'Chọn môn học' },
      ...subjects.map((item) => ({ id: String(item.id), label: item.name })),
    ]}
  /></label><label className="block text-sm font-extrabold text-text-heading">Tiêu đề<input required aria-label="Tiêu đề yêu cầu" maxLength={200} className={`mt-1 ${field}`} value={title} disabled={busy || locked} onChange={event => setTitle(event.target.value)} /></label><label className="block text-sm font-extrabold text-text-heading">Bài toán hoặc câu hỏi<textarea required aria-label="Nội dung yêu cầu" rows={5} className={`mt-1 ${field}`} value={body} disabled={busy || locked} onChange={event => setBody(event.target.value)} /></label><p className="text-[13px] text-text-body">Bạn có thể đính kèm ảnh hoặc PDF sau khi tạo hội thoại.</p><div className="flex justify-end gap-3">{renderButton({ appearance: 'outline', disabled: busy, onClick: onCancel, children: 'Hủy' })}{renderButton({ type: 'submit', disabled: busy || !subject || !title.trim() || !body.trim(), children: busy ? 'Đang tạo…' : locked ? 'Thử tạo lại' : 'Tạo yêu cầu' })}</div></form></Modal>
}
