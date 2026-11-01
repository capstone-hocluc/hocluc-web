// The AI exam composer: chat on the left, the A4 paper in the middle, the outline on the right.
import { useEffect, useMemo, useRef, useState } from 'react'
import type { AiAssistantMode, AiConversation } from '../../../services/aiAssistantService'
import { useAiAssistant, type AiComposeSettings } from '../../../hooks/useAiAssistant'
import ThemeProvider from '../../common/ThemeProvider'
import ConfirmDialog from '../../console/confirm-dialog'
import { SheetContent, SheetOverlay, SheetTitle } from '../../tailgrids/core/sheet'
import { Skeleton } from '../../tailgrids/core/skeleton'
import { questionNumbers } from './exam-format'
import AiSidebar from './AiSidebar'
import ChatPanel from './ChatPanel'
import ExamOutline from './ExamOutline'
import ExamPaper from './ExamPaper'
import ExamTopBar from './ExamTopBar'

const GREETING_BUCKETS: Record<'morning' | 'afternoon' | 'evening' | 'night', string[]> = {
  morning: [
    'Chào buổi sáng.',
    'Buổi sáng tốt lành — cùng soạn đề nhé.',
    'Hôm nay bạn muốn soạn đề gì?',
  ],
  afternoon: [
    'Chào buổi chiều.',
    'Chiều nay bạn đang nghĩ về đề nào?',
    'Hôm nay bạn muốn soạn đề gì?',
  ],
  evening: [
    'Chào buổi tối.',
    'Buổi tối yên tĩnh — mình cùng soạn đề nhé.',
    'Hôm nay bạn muốn soạn đề gì?',
  ],
  night: [
    'Đã khuya rồi.',
    'Vẫn thức để soạn đề à?',
    'Hôm nay bạn muốn soạn đề gì?',
  ],
}

function greetingForHour(hour: number) {
  if (hour >= 5 && hour < 12) return GREETING_BUCKETS.morning
  if (hour >= 12 && hour < 17) return GREETING_BUCKETS.afternoon
  if (hour >= 17 && hour < 22) return GREETING_BUCKETS.evening
  return GREETING_BUCKETS.night
}

export default function AiAssistantScreen({
  onBack,
  backHref,
}: {
  onBack: () => void
  backHref: string
}) {
  const ai = useAiAssistant()
  const [conversationsOpen, setConversationsOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(true)
  const [chatSheet, setChatSheet] = useState(false)
  const [outlineOpen, setOutlineOpen] = useState(true)
  const [outlineSheet, setOutlineSheet] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<AiConversation | null>(null)
  const [greeting] = useState(() => {
    const bucket = greetingForHour(new Date().getHours())
    return bucket[Math.floor(Math.random() * bucket.length)]
  })
  const highlight = useRef<number | null>(null)

  // The console shell owns this flag on its own pages; the assistant renders
  // outside it, so it carries the console font and token overrides itself.
  useEffect(() => {
    document.documentElement.dataset.console = ''
    return () => {
      delete document.documentElement.dataset.console
    }
  }, [])

  useEffect(
    () => () => {
      if (highlight.current !== null) window.clearTimeout(highlight.current)
    },
    []
  )

  const numberOf = useMemo(() => questionNumbers(ai.paper), [ai.paper])

  function jumpToQuestion(id: string) {
    setChatSheet(false)
    setOutlineSheet(false)
    setFocusedId(id)
    if (highlight.current !== null) window.clearTimeout(highlight.current)
    highlight.current = window.setTimeout(() => setFocusedId(null), 2200)
    window.setTimeout(() => {
      document
        .getElementById(`exam-question-${id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)
  }

  function startNew() {
    ai.startNew()
    setConversationsOpen(false)
    setEditingId(null)
    setFocusedId(null)
  }

  async function addQuestion(partId: string) {
    const id = await ai.addManual(partId)
    if (!id) return
    setEditingId(id)
    jumpToQuestion(id)
  }

  function pickPrompt(mode: AiAssistantMode, prompt: string) {
    ai.setMode(mode)
    ai.setValue(prompt)
  }

  function toggleChat() {
    if (window.matchMedia('(min-width: 1024px)').matches) setChatOpen((open) => !open)
    else setChatSheet((open) => !open)
  }

  function toggleOutline() {
    if (window.matchMedia('(min-width: 1280px)').matches) setOutlineOpen((open) => !open)
    else setOutlineSheet((open) => !open)
  }

  const chatPanelProps = {
    messages: ai.messages,
    mode: ai.mode,
    value: ai.value,
    pending: ai.running,
    stages: ai.stages,
    trace: ai.trace,
    loading: ai.draftLoading,
    greeting,
    notice: ai.notice,
    onDismissNotice: () => ai.setNotice(null),
    settings: ai.settings,
    onSettingsChange: (patch: Partial<AiComposeSettings>) =>
      ai.setSettings((previous) => ({ ...previous, ...patch })),
    subjects: ai.subjects,
    subjectsLoading: ai.subjectsLoading,
    subjectsError: ai.subjectsError,
    onReloadSubjects: ai.reloadSubjects,
    papers: ai.papers,
    papersLoading: ai.papersLoading,
    papersError: ai.papersError,
    onReloadPapers: ai.reloadPapers,
    subjectLocked: ai.subjectLocked,
    onModeChange: ai.setMode,
    onValueChange: ai.setValue,
    onSend: ai.send,
    onStop: ai.cancel,
    onRegenerate: ai.regenerate,
    onStartNew: startNew,
    onPickPrompt: pickPrompt,
    onJumpToQuestion: jumpToQuestion,
  }

  return (
    <ThemeProvider>
      <div className="flex h-dvh w-full flex-col overflow-hidden bg-background-gray-secondary_alt_2 font-sans text-text-primary">
        <ExamTopBar
          title={ai.activeConversation?.title ?? ''}
          editable={Boolean(ai.activeConversation)}
          onTitleChange={(title) => {
            if (ai.activeConversation) void ai.renameConversation(ai.activeConversation.id, title)
          }}
          onBack={onBack}
          backHref={backHref}
          conversationsOpen={conversationsOpen}
          onToggleConversations={() => setConversationsOpen((open) => !open)}
          chatOpen={chatOpen || chatSheet}
          onToggleChat={toggleChat}
          outlineOpen={outlineOpen || outlineSheet}
          onToggleOutline={toggleOutline}
          onNew={startNew}
        />

        <div className="flex min-h-0 flex-1">
          {chatOpen && (
            <ChatPanel
              {...chatPanelProps}
              onCollapse={() => setChatOpen(false)}
              className="hidden w-[380px] shrink-0 border-r border-card-border lg:flex"
            />
          )}

          <main className="relative min-h-0 flex-1 overflow-y-auto bg-background-gray-secondary">
            <div className="mx-auto w-full max-w-[794px] px-3 py-5 sm:px-6 sm:py-8">
              {ai.draftLoading ? (
                <PaperSkeleton />
              ) : (
                <ExamPaper
                  paper={ai.paper}
                  numberOf={numberOf}
                  editingId={editingId}
                  focusedId={focusedId}
                  onStartEdit={setEditingId}
                  onStopEdit={() => setEditingId(null)}
                  onSave={(id, patch) => {
                    void ai.updateQuestion(id, patch).then(() => setEditingId(null))
                  }}
                  onDelete={(id) => {
                    void ai.deleteItem(id)
                    if (editingId === id) setEditingId(null)
                  }}
                  onKeep={(id, kept) => void ai.toggleKeep(id, kept)}
                  onMove={(sourceId, targetId) => void ai.moveItem(sourceId, targetId)}
                  onAdd={(partId) => void addQuestion(partId)}
                />
              )}
            </div>
          </main>

          {outlineOpen && (
            <ExamOutline
              paper={ai.paper}
              numberOf={numberOf}
              onJump={jumpToQuestion}
              onCollapse={() => setOutlineOpen(false)}
              className="hidden w-[240px] shrink-0 border-l border-card-border xl:flex"
            />
          )}
        </div>

        <SheetOverlay isOpen={conversationsOpen} onOpenChange={setConversationsOpen}>
          <SheetContent
            side="right"
            showCloseButton={false}
            className="w-[min(340px,90vw)]! min-w-0! max-w-[90vw]! gap-0 border-l border-card-border bg-card-background p-0 sm:max-w-[90vw]!"
          >
            <SheetTitle className="sr-only">Cuộc trò chuyện</SheetTitle>
            <AiSidebar
              conversations={ai.conversations}
              activeId={ai.activeId}
              loading={ai.conversationsLoading}
              onSelect={(id) => {
                ai.selectConversation(id)
                setConversationsOpen(false)
                setEditingId(null)
                setFocusedId(null)
              }}
              onNew={startNew}
              onRename={(id, title) => void ai.renameConversation(id, title)}
              onDelete={(id) =>
                setPendingDelete(ai.conversations.find((item) => item.id === id) ?? null)
              }
              onClose={() => setConversationsOpen(false)}
              className="flex h-full w-full"
            />
          </SheetContent>
        </SheetOverlay>

        <SheetOverlay isOpen={chatSheet} onOpenChange={setChatSheet}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-[min(380px,92vw)]! min-w-0! max-w-[92vw]! gap-0 border-r border-card-border bg-card-background p-0 sm:max-w-[92vw]!"
          >
            <SheetTitle className="sr-only">Trợ lý AI</SheetTitle>
            <ChatPanel
              {...chatPanelProps}
              onClose={() => setChatSheet(false)}
              className="flex h-full w-full"
            />
          </SheetContent>
        </SheetOverlay>

        <SheetOverlay isOpen={outlineSheet} onOpenChange={setOutlineSheet}>
          <SheetContent
            side="right"
            showCloseButton={false}
            className="w-[min(280px,85vw)]! min-w-0! max-w-[85vw]! gap-0 border-l border-card-border bg-card-background p-0 sm:max-w-[85vw]!"
          >
            <SheetTitle className="sr-only">Mục lục đề thi</SheetTitle>
            <ExamOutline
              paper={ai.paper}
              numberOf={numberOf}
              onJump={jumpToQuestion}
              onClose={() => setOutlineSheet(false)}
              className="flex h-full w-full"
            />
          </SheetContent>
        </SheetOverlay>

        {pendingDelete && (
          <ConfirmDialog
            title="Xoá cuộc trò chuyện"
            description={`Xoá "${pendingDelete.title}" cùng toàn bộ đề nháp của cuộc trò chuyện này?`}
            cancelLabel="Huỷ"
            confirmLabel="Xoá"
            variant="danger"
            onCancel={() => setPendingDelete(null)}
            onConfirm={() => {
              const id = pendingDelete.id
              setPendingDelete(null)
              void ai.deleteConversation(id)
            }}
          />
        )}
      </div>
    </ThemeProvider>
  )
}

function PaperSkeleton() {
  return (
    <div aria-hidden className="quiz-paper min-h-[420px] border border-card-border">
      <Skeleton className="mx-auto mt-2 h-5 w-1/2" />
      <Skeleton className="mx-auto mt-3 h-3 w-1/3" />
      <div className="mt-8 space-y-6">
        {[0, 1, 2].map((index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}
