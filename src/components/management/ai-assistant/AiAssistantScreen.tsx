// The AI exam composer: chat on the left, the A4 paper in the middle, the
// outline on the right. The backend is not wired yet, so every turn says so.
import { useEffect, useMemo, useRef, useState } from 'react'
import type { AiAssistantMode } from '../../../services/aiAssistantService'
import { useAiChat } from '../../../hooks/useAiChat'
import { questionNumbers, useExamDraft } from '../../../hooks/useExamDraft'
import ThemeProvider from '../../common/ThemeProvider'
import { SheetContent, SheetOverlay, SheetTitle } from '../../tailgrids/core/sheet'
import ChatPanel from './ChatPanel'
import ExamOutline from './ExamOutline'
import ExamPaper from './ExamPaper'
import ExamTopBar from './ExamTopBar'
import { DEMO_EXAM_DRAFT } from './ai-assistant-demo'

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
  const exam = useExamDraft()
  const chat = useAiChat()
  const [chatOpen, setChatOpen] = useState(true)
  const [chatSheet, setChatSheet] = useState(false)
  const [outlineOpen, setOutlineOpen] = useState(true)
  const [outlineSheet, setOutlineSheet] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
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

  const numberOf = useMemo(() => questionNumbers(exam.draft), [exam.draft])

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

  function loadDemo() {
    exam.replace(DEMO_EXAM_DRAFT)
    chat.loadDemo()
    setEditingId(null)
  }

  function startNew() {
    exam.reset()
    chat.startNew()
    setEditingId(null)
    setFocusedId(null)
  }

  function pickPrompt(mode: AiAssistantMode, prompt: string) {
    chat.setMode(mode)
    chat.setValue(prompt)
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
    messages: chat.messages,
    mode: chat.mode,
    value: chat.value,
    pending: chat.pending,
    greeting,
    onModeChange: chat.setMode,
    onValueChange: chat.setValue,
    onSend: chat.send,
    onStop: chat.stop,
    onRegenerate: chat.regenerate,
    onLoadDemo: loadDemo,
    onStartNew: startNew,
    onPickPrompt: pickPrompt,
    onJumpToQuestion: jumpToQuestion,
  }

  return (
    <ThemeProvider>
      <div className="flex h-dvh w-full flex-col overflow-hidden bg-background-gray-secondary_alt_2 font-sans text-text-primary">
        <ExamTopBar
          title={exam.draft.title}
          dirty={exam.dirty}
          onTitleChange={exam.setTitle}
          onBack={onBack}
          backHref={backHref}
          chatOpen={chatOpen || chatSheet}
          onToggleChat={toggleChat}
          outlineOpen={outlineOpen || outlineSheet}
          onToggleOutline={toggleOutline}
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
              <ExamPaper
                draft={exam.draft}
                numberOf={numberOf}
                editingId={editingId}
                focusedId={focusedId}
                onStartEdit={setEditingId}
                onStopEdit={() => setEditingId(null)}
                onSave={(id, patch) => {
                  exam.updateQuestion(id, patch)
                  setEditingId(null)
                }}
                onDelete={(id) => {
                  exam.deleteQuestion(id)
                  if (editingId === id) setEditingId(null)
                }}
                onAccept={exam.acceptQuestion}
                onMove={exam.moveQuestion}
              />
            </div>
          </main>

          {outlineOpen && (
            <ExamOutline
              draft={exam.draft}
              numberOf={numberOf}
              onJump={jumpToQuestion}
              onCollapse={() => setOutlineOpen(false)}
              className="hidden w-[240px] shrink-0 border-l border-card-border xl:flex"
            />
          )}
        </div>

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
              draft={exam.draft}
              numberOf={numberOf}
              onJump={jumpToQuestion}
              onClose={() => setOutlineSheet(false)}
              className="flex h-full w-full"
            />
          </SheetContent>
        </SheetOverlay>
      </div>
    </ThemeProvider>
  )
}
