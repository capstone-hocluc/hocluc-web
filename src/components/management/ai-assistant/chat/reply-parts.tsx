// What a reply carries besides its words, as data parts of assistant-ui's thread: the subjects to choose from, the
// chip of a stopped run, the exam's files, and each file the teacher asked the assistant for. Each is registered under
// its name and reads the reply it belongs to.
import { createContext, useContext, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { makeAssistantDataUI, useAuiState, type DataMessagePartProps } from '@assistant-ui/react'
import { cn } from '../../../../lib/cn'
import { ArtifactCard } from '../../../assistant-ui/elements/artifact-card'
import { field, fieldInteractive, paper, pressable } from '../../../assistant-ui/elements/console-surfaces'
import { FileText, ListChecks, Square } from '../../../console/icons'
import { ExamFileIcon } from './exam-file-icon'
import { usePdfBusy, usePdfJob } from '../../exam-doc/export'
import { examFileName } from '../../../../hooks/ai-run-stages'
import type { AiExamFile } from '../../../../services/aiAssistantService'
import type { AiChatMessage } from '../exam-format'
import { sourceOf } from './assistant-runtime'
import ReadingPart from './ReadingPart'

export type ExamDownload = 'docx' | 'pdf' | 'docx-exam' | 'pdf-exam'

/** What a reply's own controls do. */
export interface ChatActions {
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

/** The reply this turn shows (null for the progress turn). */
function useReply(): AiChatMessage | null {
  return useAuiState(({ message }) => sourceOf(message.metadata.custom))
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
  const kept = useReply()?.addedItemIds?.length ?? 0
  return (
    <div className="mt-3">
      <StoppedChip>{kept > 0 ? `Đã dừng · giữ ${kept} câu đã soạn` : 'Đã dừng'}</StoppedChip>
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
          <ExamFileIcon format="word" />
          <span className="truncate">Tải Word</span>
        </CardAction>
        <CardAction disabled={pdfBusy} onClick={() => onDownload('pdf')}>
          <ExamFileIcon format="pdf" />
          <span className="truncate">{pdfJob === 'full' ? 'Đang tạo PDF…' : 'Tải PDF'}</span>
        </CardAction>
        <CardAction onClick={() => onDownload('docx-exam')}>
          <ExamFileIcon format="word" />
          <span className="truncate">Word không đáp án</span>
        </CardAction>
        <CardAction disabled={pdfBusy} onClick={() => onDownload('pdf-exam')}>
          <ExamFileIcon format="pdf" />
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

/**
 * A file of the exam the teacher asked the assistant for, as a file is shown: its icon and its name, a click away from
 * the download. It is made from the sheet as it is when downloaded.
 */
function FileCard({ data }: DataMessagePartProps<AiExamFile>) {
  const { onDownload } = useChatActions()
  const pdfBusy = usePdfBusy()
  const pdfJob = usePdfJob()
  const pdf = data.format === 'pdf'
  const download: ExamDownload = `${pdf ? 'pdf' : 'docx'}${data.answers ? '' : '-exam'}` as ExamDownload
  const making = pdf && pdfJob === (data.answers ? 'full' : 'examOnly')
  return (
    <button
      type="button"
      disabled={pdf && pdfBusy}
      onClick={() => onDownload(download)}
      title={`Tải ${examFileName(data)}`}
      aria-label={making ? 'Đang tạo PDF…' : `Đề thi ${data.answers ? 'có' : 'không'} đáp án, tệp ${pdf ? 'PDF' : 'Word'}`}
      className={cn(
        fieldInteractive,
        pressable,
        'mt-3 flex max-w-full items-center gap-2.5 rounded-xl py-2 pr-3.5 pl-2.5 text-left text-[13px] font-medium text-text-primary outline-none focus-visible:ring-1 focus-visible:ring-text-primary/25 disabled:pointer-events-none disabled:opacity-60'
      )}
    >
      <ExamFileIcon format={data.format} label className="w-6" />
      <span className="truncate">
        {making ? 'Đang tạo PDF…' : `Đề thi ${data.answers ? 'có' : 'không'} đáp án`}
      </span>
    </button>
  )
}

const SubjectsUI = makeAssistantDataUI({ name: 'subjects', render: SubjectChoices })
const StoppedUI = makeAssistantDataUI({ name: 'stopped', render: Stopped })
const ExamUI = makeAssistantDataUI({ name: 'exam', render: ExamCard })
const FileUI = makeAssistantDataUI({ name: 'file', render: FileCard })
const ReadingUI = makeAssistantDataUI({ name: 'reading', render: ReadingPart })

/** Registers the reply's data parts with the thread; rendered once inside the chat's runtime. */
export function ReplyDataUIs() {
  return (
    <>
      <SubjectsUI />
      <StoppedUI />
      <ExamUI />
      <FileUI />
      <ReadingUI />
    </>
  )
}
