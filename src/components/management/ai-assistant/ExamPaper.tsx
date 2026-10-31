import type { AiExamDraft, AiExamGroup, AiExamQuestion } from '../../../services/aiAssistantService'
import MathText from '../../ui/MathText'
import PaperBrand from '../quiz/PaperBrand'
import { sharedHeading } from '../quiz/paper-layout'
import '../quiz/quiz-paper.css'
import ExamQuestionCard from './ExamQuestionCard'

interface ExamPaperProps {
  draft: AiExamDraft
  numberOf: Map<string, number>
  editingId: string | null
  focusedId: string | null
  onStartEdit: (id: string) => void
  onStopEdit: () => void
  onSave: (id: string, patch: Pick<AiExamQuestion, 'prompt' | 'options' | 'explanation'>) => void
  onDelete: (id: string) => void
  onAccept: (id: string) => void
  onMove: (sourceId: string, targetId: string) => void
}

export default function ExamPaper({
  draft,
  numberOf,
  editingId,
  focusedId,
  onStartEdit,
  onStopEdit,
  onSave,
  onDelete,
  onAccept,
  onMove,
}: ExamPaperProps) {
  const groups = new Map(draft.groups.map((group) => [group.id, group]))
  const meta = [
    draft.durationMinutes ? `Thời gian làm bài: ${draft.durationMinutes} phút` : null,
    `${draft.questions.length} câu`,
  ]
    .filter(Boolean)
    .join(' · ')

  function card(question: AiExamQuestion) {
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
        onAccept={() => onAccept(question.id)}
        onMove={onMove}
      />
    )
  }

  return (
    <article className="quiz-paper" aria-label="Đề thi">
      <PaperBrand content="own" />
      <h1>{draft.title}</h1>
      <p className="quiz-paper-meta">{meta}</p>

      {draft.parts.map((part) => {
        const questions = draft.questions.filter((question) => question.partId === part.id)
        const blocks: Array<{ group: AiExamGroup | null; questions: AiExamQuestion[] }> = []
        for (const question of questions) {
          const group = question.groupId ? groups.get(question.groupId) ?? null : null
          const last = blocks[blocks.length - 1]
          if (last && group && last.group?.id === group.id) last.questions.push(question)
          else blocks.push({ group, questions: [question] })
        }

        return (
          <section key={part.id}>
            <h2>{part.title}</h2>
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
                  {block.questions.map(card)}
                </div>
              )
            })}
          </section>
        )
      })}

      <p className="quiz-paper-end">--- HẾT ---</p>
    </article>
  )
}
