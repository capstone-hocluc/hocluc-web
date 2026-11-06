import type { AiDraftQuestion } from '../../../services/aiAssistantService'
import MathText from '../../ui/MathText'
import PaperBrand from '../quiz/PaperBrand'
import { sharedHeading } from '../quiz/paper-layout'
import '../quiz/quiz-paper.css'
import ExamFigure from './ExamFigure'
import { chartAlt, chartImageSrc } from '../exam-doc/chart-svg'
import ExamQuestionCard from './ExamQuestionCard'
import type {
  ExamPaper as ExamPaperModel,
  ExamPaperGroup,
  ExamPaperPart,
  ExamPaperQuestion,
} from './exam-format'

interface ExamPaperProps {
  paper: ExamPaperModel
  numberOf: Map<string, number>
  editingId: string | null
  focusedId: string | null
  onStartEdit: (id: string) => void
  onStopEdit: () => void
  onSave: (id: string, patch: Pick<AiDraftQuestion, 'text' | 'options' | 'explanation'>) => void
  onDelete: (id: string) => void
  onKeep: (id: string, kept: boolean) => void
  onMove: (sourceId: string, targetId: string) => void
  onAdd: (partId: string) => void
  /** Each question's side in the question bank: saved there from this exam, or savable by the viewer. */
  bank?: ExamPaperBank
}

export interface ExamPaperBank {
  saved: (id: string) => boolean
  canSave: (id: string) => boolean
  saving: (id: string) => boolean
  onSave: (id: string) => void
}

export default function ExamPaper({
  paper,
  numberOf,
  editingId,
  focusedId,
  onStartEdit,
  onStopEdit,
  onSave,
  onDelete,
  onKeep,
  onMove,
  onAdd,
  bank,
}: ExamPaperProps) {
  const groups = new Map(paper.groups.map((group) => [group.id, group]))
  const meta = [
    paper.durationMinutes ? `Thời gian làm bài: ${paper.durationMinutes} phút` : null,
    `${paper.questions.length} câu`,
  ]
    .filter(Boolean)
    .join(' · ')

  const sections: Array<{ parentTitle: string | null; parts: ExamPaperPart[] }> = []
  for (const part of paper.parts) {
    const parentTitle = part.parentTitle ?? null
    const last = sections[sections.length - 1]
    if (last && last.parentTitle === parentTitle) last.parts.push(part)
    else sections.push({ parentTitle, parts: [part] })
  }

  function card(question: ExamPaperQuestion) {
    const number = numberOf.get(question.id) ?? 1
    return (
      <ExamQuestionCard
        key={question.id}
        question={question}
        number={number}
        focused={focusedId === question.id}
        editing={editingId === question.id}
        onStartEdit={() => onStartEdit(question.id)}
        onStopEdit={onStopEdit}
        onSave={(patch) => onSave(question.id, patch)}
        onDelete={() => onDelete(question.id)}
        onKeep={(kept) => onKeep(question.id, kept)}
        onMove={onMove}
        savedToBank={bank?.saved(question.id) ?? false}
        onSaveToBank={
          bank && !question.failure && bank.canSave(question.id) ? () => bank.onSave(question.id) : undefined
        }
        savingToBank={bank?.saving(question.id) ?? false}
      />
    )
  }

  return (
    <article className="quiz-paper" aria-label="Đề thi">
      <PaperBrand content="own" />
      <h1>{paper.title}</h1>
      <p className="quiz-paper-meta">{meta}</p>

      {sections.map((section) => (
        <section key={section.parentTitle ?? section.parts[0].id}>
          {section.parentTitle && <h2>{section.parentTitle}</h2>}
          {section.parts.map((part) => {
            const questions = paper.questions.filter((question) => question.partId === part.id)
            const blocks: Array<{ group: ExamPaperGroup | null; questions: ExamPaperQuestion[] }> = []
            for (const question of questions) {
              const group = question.groupId ? groups.get(question.groupId) ?? null : null
              const last = blocks[blocks.length - 1]
              if (last && group && last.group?.id === group.id) last.questions.push(question)
              else blocks.push({ group, questions: [question] })
            }
            const heading = part.code ? `${part.code}. ${part.title}` : part.title

            return (
              <div key={part.id}>
                <div className="flex items-end justify-between gap-3">
                  {section.parentTitle ? <h3>{heading}</h3> : <h2>{part.title}</h2>}
                  <button
                    type="button"
                    onClick={() => onAdd(part.id)}
                    className="mb-1 shrink-0 rounded-lg border border-card-border bg-card-background px-2 py-1 font-sans text-xs font-medium text-text-secondary transition-colors hover:text-text-primary print:hidden"
                  >
                    Thêm câu
                  </button>
                </div>
                {questions.length === 0 && (
                  <p className="text-[10pt] text-[#475569] italic">Chưa có câu hỏi.</p>
                )}
                {blocks.map((block) => {
                  if (!block.group) {
                    return <div key={`loose-${block.questions[0].id}`}>{block.questions.map(card)}</div>
                  }
                  const numbers = block.questions.map((question) => numberOf.get(question.id) ?? 1)
                  const title =
                    block.group.instruction?.trim() ||
                    sharedHeading(numbers[0], numbers[numbers.length - 1])
                  return (
                    <div key={block.group.id} className="quiz-paper-group">
                      <p className="quiz-paper-group-title">{title}</p>
                      {block.group.passage && (
                        <p className="quiz-paper-passage">
                          <MathText>{block.group.passage}</MathText>
                        </p>
                      )}
                      <ExamFigure
                        src={block.group.passageImageUrl}
                        alt={`Hình minh hoạ ngữ liệu câu ${numbers[0]}`}
                      />
                      {block.group.chart && (
                        <ExamFigure src={chartImageSrc(block.group.chart)} alt={chartAlt(block.group.chart)} />
                      )}
                      {block.questions.map(card)}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </section>
      ))}

      <p className="quiz-paper-end">--- HẾT ---</p>
    </article>
  )
}
