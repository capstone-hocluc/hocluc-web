import { useRef, useState, type ReactNode } from 'react'
import type { AssistantRuntime } from '@assistant-ui/react'
import { useAiAssistant } from '../../../hooks/useAiAssistant'
import { getErrorMessage } from '../../../lib/errors'
import { exportAiDraftToQuiz } from '../../../services/aiAssistantService'
import Button from '../../console/button'
import ConfirmDialog from '../../console/confirm-dialog'
import { SheetContent, SheetOverlay, SheetTitle } from '../../tailgrids/core/sheet'
import ChatPanel from '../ai-assistant/ChatPanel'
import { AssistantChatProvider } from '../ai-assistant/chat/AssistantChatProvider'
import { ChatActionsProvider } from '../ai-assistant/chat/reply-parts'
import type { ExamPaper } from '../ai-assistant/exam-format'
import { quizAssistantSheet, writtenRunItemIds } from './quiz-assistant-draft'

interface Props {
  quizId: string
  open: boolean
  docked: boolean
  busy: boolean
  blockedReason: string
  readPaper: () => ExamPaper
  onClose: () => void
  onBusyChange: (busy: boolean) => void
  onAppended: (message: string) => void
}

export default function QuizAssistantDock({
  quizId, open, docked, busy, blockedReason, readPaper, onClose, onBusyChange, onAppended,
}: Props) {
  const chat = useAiAssistant(undefined, undefined, { quizId, readSheet: () => quizAssistantSheet(readPaper()) })
  const runtimeRef = useRef<AssistantRuntime | null>(null)
  const appending = useRef(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const loading = chat.conversationsLoading || chat.draftLoading
  const ids = writtenRunItemIds(chat.messages, chat.paper.questions)

  function giveBack(text: string | null) {
    const composer = runtimeRef.current?.thread.composer
    if (text && composer && !composer.getState().text) composer.setText(text)
  }

  function startNew() {
    chat.startNew()
    setHistoryOpen(false)
    runtimeRef.current?.thread.composer.setText('')
  }

  async function append() {
    if (!chat.activeId || ids.length === 0 || blockedReason || busy || appending.current || chat.running) return
    appending.current = true
    onBusyChange(true)
    chat.setNotice(null)
    try {
      const result = await exportAiDraftToQuiz(chat.activeId, { quizId, itemIds: ids })
      onAppended(`Đã thêm ${result.questionCount} câu vào bài. Bỏ qua ${result.skipped.length} câu.`)
    } catch (error) {
      chat.setNotice(getErrorMessage(error))
    } finally {
      appending.current = false
      onBusyChange(false)
    }
  }

  function history(): ReactNode {
    if (!historyOpen || loading) return null
    return (
      <div aria-label="Cuộc trò chuyện" className="max-h-36 shrink-0 overflow-y-auto border-y border-card-border p-2">
        {chat.conversationsError ? (
          <Button size="sm" appearance="outline" onClick={() => void chat.reloadConversations()}>Tải lại cuộc trò chuyện</Button>
        ) : chat.conversations.length === 0 ? (
          <p className="m-0 p-2 text-sm text-text-tertiary">Chưa có cuộc trò chuyện.</p>
        ) : chat.conversations.map((conversation) => (
          <Button key={conversation.id} size="sm" appearance="ghost" className="w-full justify-start" aria-pressed={conversation.id === chat.activeId}
            onClick={() => { chat.selectConversation(conversation.id); setHistoryOpen(false) }}>
            <span className="truncate">{conversation.title}</span>
          </Button>
        ))}
      </div>
    )
  }

  const request = chat.confirmRequest
  const canConfirm = request?.action === 'compose' || request?.action === 'mock'
  const panel = (
    <ChatPanel messages={chat.messages} mode="compose" countFromPrompt pending={chat.running} loading={loading}
      greeting="Bạn muốn thêm câu hỏi nào?" notice={chat.notice} onDismissNotice={() => chat.setNotice(null)}
      settings={chat.settings} onSettingsChange={(patch) => chat.setSettings((previous) => ({ ...previous, ...patch }))}
      papers={chat.papers} papersLoading={chat.papersLoading} papersError={chat.papersError} onReloadPapers={chat.reloadPapers}
      onStartNew={startNew} onStop={chat.cancel} onClose={onClose}
      conversationsOpen={historyOpen} onOpenConversations={() => setHistoryOpen((shown) => !shown)} history={history()}
      onPickPrompt={(_mode, prompt) => runtimeRef.current?.thread.composer.setText(prompt)}
      className={docked ? 'flex w-[var(--console-docked-sheet-width,min(460px,36vw))] shrink-0 border-l border-card-border' : 'flex h-full w-full'}
      footer={ids.length > 0 && !chat.running && !loading && (
        <div className="flex shrink-0 flex-col gap-1 border-t border-card-border px-3 py-2">
          <Button disabled={busy || Boolean(blockedReason)} onClick={() => void append()}>
            Thêm {ids.length} câu vào bài
          </Button>
          {blockedReason && <p className="m-0 text-xs text-text-tertiary">{blockedReason}</p>}
        </div>
      )}
    />
  )

  return (
    <AssistantChatProvider run={chat.runStore} runtimeRef={runtimeRef} conversationId={chat.activeId}
      messages={chat.messages} allMessages={chat.allMessages} running={chat.running} loading={loading}
      sendBlocked={loading || chat.conversationsError || busy}
      onSend={(text) => chat.send(text, { mode: 'compose' })} onCancel={chat.cancel} examCard={false}
      onRegenerate={() => {
        const last = chat.messages.at(-1)
        if (last?.role === 'assistant' && last.error && last.retryText) void chat.retry(last.id).then(giveBack)
        else chat.regenerate()
      }}
      onShowBranch={chat.showBranch} onEdit={(text, after) => chat.send(text, { mode: 'compose', after })}>
      <ChatActionsProvider value={{
        onRetry: (id) => void chat.retry(id).then(giveBack),
        onChooseSubject: (id, subject) => void chat.chooseSubject(id, subject).then(giveBack),
      }}>
        {docked ? (open && panel) : (
          <SheetOverlay isOpen={open} onOpenChange={(shown) => { if (!shown) onClose() }}>
            <SheetContent side="right" showCloseButton={false} className="gap-0 p-0 sm:max-w-md">
              <SheetTitle className="sr-only">Trợ lý AI</SheetTitle>
              {panel}
            </SheetContent>
          </SheetOverlay>
        )}
        {open && canConfirm && (
          <ConfirmDialog title={request.action === 'mock' ? `Soạn câu hỏi theo ${request.name}?` : 'Soạn loạt câu hỏi mới?'}
            description="Bạn có thể thêm câu hỏi đã soạn vào bài sau khi hoàn tất."
            cancelLabel="Hủy" confirmLabel="Soạn câu hỏi" onCancel={chat.dismissConfirm}
            onConfirm={() => {
              chat.dismissConfirm()
              void chat.send(request.content, {
                mode: request.action === 'mock' ? 'mock-exam' : 'compose',
                compose: { confirmed: true, agreed: true, ...(request.action === 'mock' ? { bankSourceId: request.sourceId } : {}) },
              })
            }} />
        )}
      </ChatActionsProvider>
    </AssistantChatProvider>
  )
}
