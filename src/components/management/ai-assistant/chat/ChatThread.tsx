// The conversation with the assistant, on assistant-ui's thread and its Elements: its viewport keeps the newest turn in
// view, each turn is a message primitive, and copying and asking again are its action bar's. What a reply carries
// besides its words (the subjects to pick, the exam's files) and a run's progress are the page's own parts.
import { createContext, useContext, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import {
  ActionBarPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
  type DataMessagePartProps,
  type TextMessagePartProps,
} from '@assistant-ui/react'
import { FileFormatPdf } from '@tailgrids/icons'
import { runStagesOf, runTraceOf, type AiRunStore } from '../../../../hooks/useAiAssistant'
import { cn } from '../../../../lib/cn'
import { useStoreValue } from '../../../../lib/value-store'
import type { AiAssistantMode } from '../../../../services/aiAssistantService'
import { ArtifactCard } from '../../../assistant-ui/elements/artifact-card'
import { ErrorState } from '../../../assistant-ui/elements/error-state'
import { CopySwap, MessageAction } from '../../../assistant-ui/elements/message-actions'
import { field, fieldInteractive, floating, paper, pressable } from '../../../assistant-ui/elements/surfaces'
import { ThinkingIndicator } from '../../../assistant-ui/elements/thinking-indicator'
import { ArrowDown, ChevronDown, FileText, ListChecks, RotateCcw, Square } from '../../../console/icons'
import { Skeleton } from '../../../tailgrids/core/skeleton'
import { usePdfBusy, usePdfJob } from '../../exam-doc/export'
import AiMarkdown from '../AiMarkdown'
import AiOrb from '../AiOrb'
import StageTrace from '../StageTrace'
import type { AiChatMessage } from '../exam-format'
import { PROGRESS_ID, sourceOf } from './assistant-runtime'

export type ExamDownload = 'docx' | 'pdf' | 'docx-exam' | 'pdf-exam'

/** What a reply's own controls do, and the run the progress turn follows. */
export interface ChatActions {
  run: AiRunStore
  /** Word or PDF of the exam with its answer key, or of the exam alone. */
  onDownload: (format: ExamDownload) => void
  /** Writes the answer key after the exam again from the questions it holds now. */
  onAnswerKey: () => void
  /** Sends the words of a failed send again. */
  onRetry: (messageId: string) => void
  /** Answers the question "Bạn muốn soạn môn nào?" with a subject (null: the whole paper). */
  onChooseSubject: (messageId: string, subjectName: string | null) => void
}

const ChatActionsContext = createContext<ChatActions | null>(null)

export function ChatActionsProvider({ value, children }: { value: ChatActions; children: ReactNode }) {
  return <ChatActionsContext.Provider value={value}>{children}</ChatActionsContext.Provider>
}

function useChatActions() {
  const actions = useContext(ChatActionsContext)
  if (!actions) throw new Error('The chat turns need a ChatActionsProvider.')
  return actions
}

const MODE_LABEL: Record<AiAssistantMode, string> = {
  ask: 'Hỏi đáp',
  compose: 'Soạn câu hỏi',
  'mock-exam': 'Mô phỏng đề',
  revise: 'Sửa câu hỏi',
}

/** The reply this turn shows (null for the progress turn). */
function useReply(): AiChatMessage | null {
  return useAuiState(({ message }) => sourceOf(message.metadata.custom))
}

/**
 * A turn's actions show while the pointer or the focus is on it, and always where nothing hovers (a touch screen);
 * `shown` keeps them in view (the last reply's).
 */
const actionsOf = (shown: boolean) =>
  cn(
    'flex h-8 items-center gap-0.5 transition-opacity duration-150 motion-reduce:transition-none',
    !shown &&
      'opacity-0 group-hover/turn:opacity-100 group-focus-within/turn:opacity-100 [@media(hover:none)]:opacity-100'
  )

/* ---------- The teacher's turn ---------- */

function UserText({ text }: TextMessagePartProps) {
  return <div className="whitespace-pre-wrap">{text}</div>
}

const USER_PARTS = { Text: UserText }

function UserTurn() {
  const copied = useAuiState(({ message }) => message.isCopied)
  return (
    <MessagePrimitive.Root className="group/turn aui-enter flex justify-end">
      <div className="flex max-w-[85%] flex-col items-end gap-1">
        <div className={cn(field, 'rounded-2xl px-3.5 py-2 text-sm leading-relaxed text-text-primary')}>
          <MessagePrimitive.Parts components={USER_PARTS} />
        </div>
        <ActionBarPrimitive.Root className={actionsOf(false)}>
          <ActionBarPrimitive.Copy copiedDuration={1500} asChild>
            <MessageAction label={copied ? 'Đã sao chép' : 'Sao chép tin nhắn'}>
              <CopySwap copied={copied} />
            </MessageAction>
          </ActionBarPrimitive.Copy>
        </ActionBarPrimitive.Root>
      </div>
    </MessagePrimitive.Root>
  )
}

/* ---------- The assistant's turn ---------- */

function ReplyText({ text }: TextMessagePartProps) {
  // A failed reply's words are the detail of its error card, in the card's colours.
  const error = useReply()?.error
  return (
    <div className={cn(!error && 'text-[15px] leading-[1.7] text-text-primary')}>
      <AiMarkdown content={text} />
    </div>
  )
}

function SubjectChoices(_: DataMessagePartProps) {
  const reply = useReply()
  const { onChooseSubject } = useChatActions()
  const choices = reply?.subjectChoices
  if (!reply || !choices) return null
  return (
    <ul aria-label="Chọn môn" className="mt-3 flex flex-wrap gap-2">
      {[
        ...(choices.whole ? [{ id: 'whole', name: 'Cả đề', value: null }] : []),
        ...choices.subjects.map((subject) => ({ ...subject, value: subject.name })),
      ].map((choice, index) => (
        <li key={choice.id}>
          <button
            type="button"
            onClick={() => onChooseSubject(reply.id, choice.value)}
            style={{ animationDelay: `${index * 50}ms` }}
            className={cn(
              paper,
              pressable,
              'aui-enter rounded-full px-3.5 py-1.5 text-[13px] font-medium text-text-primary outline-none hover:-translate-y-px focus-visible:ring-1 focus-visible:ring-text-primary/25'
            )}
          >
            {choice.name}
          </button>
        </li>
      ))}
    </ul>
  )
}

/** The chip a stopped run ends on (Elements' `StoppedRun`). */
function StoppedChip({ children }: { children: ReactNode }) {
  return (
    <span
      className={cn(
        field,
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-text-tertiary'
      )}
    >
      <Square size={10} strokeWidth={0} fill="currentColor" aria-hidden className="shrink-0" />
      {children}
    </span>
  )
}

function Stopped(_: DataMessagePartProps) {
  return (
    <div className="mt-3">
      <StoppedChip>Đã dừng</StoppedChip>
    </div>
  )
}

/** An action of the exam card: a filled field, or `quiet` (no fill until hovered). */
function CardAction({ quiet = false, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { quiet?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        quiet
          ? 'text-text-secondary transition-colors hover:bg-text-primary/[0.06] dark:hover:bg-text-primary/[0.09]'
          : cn(fieldInteractive, 'text-text-primary'),
        pressable,
        'flex h-9 min-w-0 items-center gap-2 rounded-xl px-3 text-left text-[13px] font-medium outline-none focus-visible:ring-1 focus-visible:ring-text-primary/25 disabled:pointer-events-none disabled:opacity-50 [&>svg]:size-[15px] [&>svg]:shrink-0 [&>svg]:text-text-tertiary',
        className
      )}
      {...props}
    />
  )
}

/**
 * A finished exam is one step from the teacher's hands: the questions are already on the sheet beside, so the card
 * offers the files rather than a jump to them.
 */
function ExamCard(_: DataMessagePartProps) {
  const reply = useReply()
  const { onDownload, onAnswerKey } = useChatActions()
  const pdfBusy = usePdfBusy()
  const pdfJob = usePdfJob()
  if (!reply) return null
  const added = reply.addedItemIds?.length ?? 0
  const title = reply.stopped
    ? added > 0
      ? `Đã dừng · giữ ${added} câu đã soạn`
      : 'Đã dừng'
    : added > 0
      ? reply.mode === 'revise'
        ? `Đã sửa ${added} câu trong đề`
        : `Đã thêm ${added} câu vào đề`
      : 'Đề thi'
  return (
    <ArtifactCard
      className="mt-4"
      icon={reply.stopped ? <Square size={14} strokeWidth={0} fill="currentColor" /> : <FileText size={16} />}
      title={title}
    >
      {/* Two by two (the exam with its key, then the exam alone) where the names fit side by side; one above the
          other in a narrow panel. */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-1.5">
        <CardAction onClick={() => onDownload('docx')}>
          <FileText aria-hidden />
          <span className="truncate">Tải Word</span>
        </CardAction>
        <CardAction disabled={pdfBusy} onClick={() => onDownload('pdf')}>
          <FileFormatPdf aria-hidden />
          <span className="truncate">{pdfJob === 'full' ? 'Đang tạo PDF…' : 'Tải PDF'}</span>
        </CardAction>
        <CardAction onClick={() => onDownload('docx-exam')}>
          <FileText aria-hidden />
          <span className="truncate">Word không đáp án</span>
        </CardAction>
        <CardAction disabled={pdfBusy} onClick={() => onDownload('pdf-exam')}>
          <FileFormatPdf aria-hidden />
          <span className="truncate">{pdfJob === 'examOnly' ? 'Đang tạo PDF…' : 'PDF không đáp án'}</span>
        </CardAction>
      </div>
      <CardAction quiet className="self-start px-2" onClick={onAnswerKey}>
        <ListChecks aria-hidden />
        Cập nhật đáp án
      </CardAction>
    </ArtifactCard>
  )
}

const REPLY_PARTS = {
  Text: ReplyText,
  data: { by_name: { subjects: SubjectChoices, stopped: Stopped, exam: ExamCard } },
}

const STATUS = 'flex items-center gap-2.5 text-sm leading-none font-semibold text-text-tertiary'

/**
 * The steps a reply took, folded under one line: who answered and in which mode. A reply with no steps has no line;
 * a failed one says so in its error card, so its line only heads the steps.
 */
function ReplySteps({ reply }: { reply: AiChatMessage }) {
  const [traceOpen, setTraceOpen] = useState(false)
  const stages = reply.stages ?? []
  const trace = reply.trace ?? []
  if (stages.length === 0 && trace.length === 0) {
    // Still told to a screen reader, as the error card is.
    return reply.error ? null : (
      <span role="status" aria-live="polite" className="sr-only">
        Trợ lý AI đã phản hồi
      </span>
    )
  }
  const inner = (
    <>
      <AiOrb />
      <span>{reply.error ? 'Các bước đã chạy' : 'Trợ lý AI đã phản hồi'}</span>
      {reply.mode && reply.mode !== 'ask' && (
        <span className="text-xs font-medium text-text-tertiary/80">· {MODE_LABEL[reply.mode]}</span>
      )}
      {stages.length === 0 && (
        <>
          <span className="text-xs font-medium text-text-tertiary/80">· {trace.length} bước</span>
          <ChevronDown size={14} aria-hidden className={cn('transition-transform', traceOpen && 'rotate-180')} />
        </>
      )}
    </>
  )

  // The stages hang under the line they belong to, which folds them.
  if (stages.length > 0) {
    return (
      <div className="mb-3">
        <StageTrace stages={stages} header={inner} />
      </div>
    )
  }
  return (
    <>
      <button
        type="button"
        aria-expanded={traceOpen}
        onClick={() => setTraceOpen((open) => !open)}
        className={cn(STATUS, 'mb-3 w-full rounded-lg text-left transition-colors hover:text-text-primary')}
      >
        {inner}
      </button>
      {traceOpen && <TraceSteps steps={trace} className="mb-4" />}
    </>
  )
}

function TraceSteps({ steps, className }: { steps: readonly string[]; className?: string }) {
  return (
    <ol className={cn('ml-[7px] space-y-1.5 border-l border-card-border pl-3', className)}>
      {steps.map((step, index) => (
        <li key={`${index}-${step}`} className="flex gap-2 text-xs leading-5 text-text-tertiary">
          <span className="text-text-secondary">{index + 1}.</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  )
}

function ReplyTurn() {
  const reply = useReply()
  const isLast = useAuiState(({ message }) => message.isLast)
  const copied = useAuiState(({ message }) => message.isCopied)
  const { onRetry } = useChatActions()
  if (!reply) return null
  const asking = Boolean(reply.subjectChoices)
  // Asking again sends the teacher's last words once more, so it sits under the last reply only.
  const canRegenerate = isLast && !reply.error && !asking
  return (
    <MessagePrimitive.Root className="group/turn aui-enter min-w-0">
      <article className="min-w-0">
        <ReplySteps reply={reply} />
        {reply.error ? (
          <ErrorState
            title="Trợ lý AI báo lỗi"
            onRetry={reply.retryText ? () => onRetry(reply.id) : undefined}
          >
            <MessagePrimitive.Parts components={REPLY_PARTS} />
          </ErrorState>
        ) : (
          <>
            <MessagePrimitive.Parts components={REPLY_PARTS} />
            {(reply.body || canRegenerate) && (
              <ActionBarPrimitive.Root className={cn(actionsOf(isLast), 'mt-1.5 -ml-1.5')}>
                {reply.body && (
                  <ActionBarPrimitive.Copy copiedDuration={1500} asChild>
                    <MessageAction label={copied ? 'Đã sao chép' : 'Sao chép câu trả lời'}>
                      <CopySwap copied={copied} />
                    </MessageAction>
                  </ActionBarPrimitive.Copy>
                )}
                {canRegenerate && (
                  <ActionBarPrimitive.Reload asChild>
                    <MessageAction label="Tạo lại câu trả lời">
                      <RotateCcw aria-hidden />
                    </MessageAction>
                  </ActionBarPrimitive.Reload>
                )}
              </ActionBarPrimitive.Root>
            )}
          </>
        )}
      </article>
    </MessagePrimitive.Root>
  )
}

/* ---------- A run going on ---------- */

const PENDING_LABEL = 'Trợ lý AI đang xử lý'

/** The run's stages and steps as they come in; it reads the run itself, so nothing else re-renders with it. */
function ProgressTurn() {
  const { run } = useChatActions()
  const stages = useStoreValue(run, runStagesOf)
  const trace = useStoreValue(run, runTraceOf)
  return (
    <MessagePrimitive.Root className="aui-enter min-w-0">
      <div role="status" aria-live="polite" aria-busy className="min-w-0">
        {stages.length > 0 ? (
          <StageTrace stages={stages} header={<ThinkingIndicator label={PENDING_LABEL} />} />
        ) : (
          <ThinkingIndicator label={PENDING_LABEL} />
        )}
        {trace.length > 0 && <TraceSteps steps={trace} className="mt-4" />}
        {stages.length === 0 && trace.length === 0 && (
          <div className="mt-4 space-y-2.5">
            <Skeleton className="h-3 w-11/12" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        )}
      </div>
    </MessagePrimitive.Root>
  )
}

function AssistantTurn() {
  const progress = useAuiState(({ message }) => message.id === PROGRESS_ID)
  return progress ? <ProgressTurn /> : <ReplyTurn />
}

/** How the thread draws each turn. */
const TURNS = { UserMessage: UserTurn, AssistantMessage: AssistantTurn }

/** One turn of the thread shown alone, as the bar shows its last answer; nothing until the thread holds it. */
export function ChatTurn({ messageId }: { messageId: string }) {
  return <ThreadPrimitive.Unstable_MessageById messageId={messageId} components={TURNS} />
}

/* ---------- The thread ---------- */

function ThreadSkeleton() {
  return (
    <div role="status" aria-label="Đang tải cuộc trò chuyện" className="space-y-7">
      <div className="flex justify-end">
        <Skeleton className="h-16 w-3/5 rounded-2xl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-11/12" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-24 w-full rounded-[20px]" />
      </div>
    </div>
  )
}

/**
 * The turns of the open conversation, the newest kept in view while the assistant answers. The button back to it sits
 * over the viewport rather than in it, clear of the fade at its edge; the provider around both lets it reach the
 * viewport.
 */
export default function ChatThread({ loading }: { loading: boolean }) {
  return (
    <ThreadPrimitive.ViewportProvider>
      <div className="relative flex min-h-0 w-full flex-1 flex-col">
        <ThreadPrimitive.Viewport className="app-scroll w-full min-h-0 flex-1 overflow-y-auto pt-4 pb-10 [scrollbar-gutter:stable_both-edges] [mask-image:linear-gradient(to_bottom,transparent_0px,#000_24px,#000_calc(100%_-_32px),transparent_100%)]">
          <div className="mx-auto w-full max-w-[960px] space-y-5 px-4">
            {loading ? <ThreadSkeleton /> : <ThreadPrimitive.Messages components={TURNS} />}
            <div className="h-px w-full shrink-0" />
          </div>
        </ThreadPrimitive.Viewport>
        <ThreadPrimitive.ScrollToBottom
          aria-label="Cuộn xuống tin mới nhất"
          title="Cuộn xuống tin mới nhất"
          className={cn(
            floating,
            'absolute bottom-3 left-1/2 grid size-9 -translate-x-1/2 place-items-center rounded-full text-text-secondary transition-[opacity,translate] duration-200 hover:-translate-y-px hover:text-text-primary disabled:pointer-events-none disabled:opacity-0 motion-reduce:transition-none'
          )}
        >
          <ArrowDown size={16} aria-hidden />
        </ThreadPrimitive.ScrollToBottom>
      </div>
    </ThreadPrimitive.ViewportProvider>
  )
}
