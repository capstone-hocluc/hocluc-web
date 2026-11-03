import { useState } from 'react'
import { cn } from '../../../lib/cn'
import type { AiDraftQuestion } from '../../../services/aiAssistantService'
import Button from '../../console/button'
import Status from '../../console/status'
import { Check, GripVertical, Pencil, Trash2, X, type LucideIcon } from '../../console/icons'
import FormulaTextarea from '../../ui/math/FormulaTextarea'
import MathText from '../../ui/MathText'
import { optionColumns } from '../quiz/paper-layout'
import type { ExamPaperOption, ExamPaperQuestion } from './exam-format'
import ExamFigure from './ExamFigure'
import { chartAlt, chartImageSrc } from '../exam-doc/chart-svg'

const AI_TAG =
  'ml-1 inline-block rounded border border-[#1e3a8a]/30 px-1 align-middle font-sans text-[8pt] font-bold tracking-wider text-[#1e3a8a]'

const SOURCE_LABEL = {
  ai: 'AI',
  bank: 'Ngân hàng',
  manual: 'Tự soạn',
} as const

interface ExamQuestionCardProps {
  question: ExamPaperQuestion
  number: number
  focused: boolean
  editing: boolean
  onStartEdit: () => void
  onStopEdit: () => void
  onSave: (patch: Pick<AiDraftQuestion, 'text' | 'options' | 'explanation'>) => void
  onDelete: () => void
  onKeep: (kept: boolean) => void
  onMove: (sourceId: string, targetId: string) => void
}

export default function ExamQuestionCard({
  question,
  number,
  focused,
  editing,
  onStartEdit,
  onStopEdit,
  onSave,
  onDelete,
  onKeep,
  onMove,
}: ExamQuestionCardProps) {
  const pattern = question.patternName ?? question.patternCode
  const bankSource = question.source === 'bank' ? question.sourceTitle : null

  return (
    <div
      id={`exam-question-${question.id}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        const sourceId = event.dataTransfer.getData('text/plain')
        if (sourceId) onMove(sourceId, question.id)
      }}
      className={cn(
        'group/examq relative rounded-sm outline-offset-4',
        focused && 'outline outline-2 outline-primary-text/25'
      )}
    >
      <div className="quiz-paper-question">
        {editing ? (
          <QuestionFields
            number={number}
            question={question}
            onCancel={onStopEdit}
            onSave={onSave}
          />
        ) : (
          <>
            <p className="quiz-paper-stem">
              <strong>Câu {number}:</strong> <MathText>{question.prompt}</MathText>
              {question.source !== 'manual' && (
                <span className={AI_TAG} title={`Nguồn: ${SOURCE_LABEL[question.source]}`}>
                  {SOURCE_LABEL[question.source]}
                </span>
              )}
            </p>
            <ExamFigure src={question.imageUrl} alt={`Hình minh hoạ câu ${number}`} />
            {question.chart && <ExamFigure src={chartImageSrc(question.chart)} alt={chartAlt(question.chart)} />}
            {question.options.length > 0 && (
              <ol className="quiz-paper-options" data-columns={optionColumns(question.options)}>
                {question.options.map((option) => (
                  <li key={option.id}>
                    <strong>{option.label}.</strong> <MathText>{option.text}</MathText>
                  </li>
                ))}
              </ol>
            )}
            {question.needsReview && (
              <div className="mt-2 flex flex-wrap items-start gap-2 font-sans print:hidden">
                <Status tone="warning">Cần duyệt</Status>
                {question.reasons.length > 0 && (
                  <ul className="min-w-0 flex-1 space-y-0.5 text-xs leading-5 text-text-secondary">
                    {question.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {question.source !== 'manual' && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 font-sans text-text-secondary print:hidden">
                {bankSource && <Status tone="neutral">Từ ngân hàng: {bankSource}</Status>}
                {pattern && <Status tone="neutral">{pattern}</Status>}
                {question.kept ? (
                  <>
                    <Status tone="success">Đã giữ</Status>
                    <Button size="sm" appearance="ghost" onClick={() => onKeep(false)}>
                      <X size={13} />
                      Bỏ
                    </Button>
                  </>
                ) : (
                  <Button size="sm" appearance="outline" onClick={() => onKeep(true)}>
                    <Check size={13} />
                    Giữ
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {!editing && (
        <div className="z-10 mt-1 ml-auto flex w-fit items-center gap-0.5 rounded-lg border border-card-border bg-card-background p-0.5 font-sans shadow-sm print:hidden lg:absolute lg:-top-2 lg:right-0 lg:mt-0 lg:opacity-0 lg:transition-opacity lg:focus-within:opacity-100 lg:group-hover/examq:opacity-100">
          <QuestionAction icon={Pencil} label={`Sửa câu ${number}`} onClick={onStartEdit} />
          <QuestionAction icon={Trash2} label={`Xoá câu ${number}`} onClick={onDelete} />
          <button
            type="button"
            draggable
            aria-label={`Kéo câu ${number} để đổi chỗ`}
            title="Kéo để đổi chỗ"
            onDragStart={(event) => {
              event.dataTransfer.setData('text/plain', question.id)
              event.dataTransfer.effectAllowed = 'move'
            }}
            className="inline-flex size-7 cursor-grab items-center justify-center rounded-md text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary active:cursor-grabbing"
          >
            <GripVertical size={14} strokeWidth={1.8} />
          </button>
        </div>
      )}
    </div>
  )
}

function QuestionAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex size-7 items-center justify-center rounded-md text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border"
    >
      <Icon size={14} strokeWidth={1.8} />
    </button>
  )
}

function QuestionFields({
  number,
  question,
  onCancel,
  onSave,
}: {
  number: number
  question: ExamPaperQuestion
  onCancel: () => void
  onSave: (patch: Pick<AiDraftQuestion, 'text' | 'options' | 'explanation'>) => void
}) {
  const [prompt, setPrompt] = useState(question.prompt)
  const [options, setOptions] = useState<ExamPaperOption[]>(question.options)
  const [explanation, setExplanation] = useState(question.explanation)

  function markCorrect(id: string) {
    setOptions((previous) => previous.map((option) => ({ ...option, correct: option.id === id })))
  }

  function setOptionText(id: string, text: string) {
    setOptions((previous) => previous.map((option) => (option.id === id ? { ...option, text } : option)))
  }

  return (
    <div className="rounded-lg border border-card-border bg-card-background p-3 text-left font-sans text-sm text-text-primary">
      <p className="mb-2 text-xs font-semibold text-text-secondary">Sửa câu {number}</p>

      <label className="flex flex-col gap-1.5">
        Nội dung câu hỏi
        <FormulaTextarea
          ariaLabel={`Nội dung câu ${number}`}
          value={prompt}
          onValueChange={setPrompt}
          placeholder="Nhập nội dung câu hỏi"
        />
      </label>

      <div className="mt-3 flex flex-col gap-2">
        <span className="text-xs font-semibold text-text-secondary">Lựa chọn và đáp án đúng</span>
        {options.map((option) => (
          <div
            key={option.id}
            className="flex min-w-0 items-start gap-2 rounded-lg border border-card-border p-2"
          >
            <input
              type="radio"
              name={`correct-${question.id}`}
              checked={option.correct}
              onChange={() => markCorrect(option.id)}
              aria-label={`Đáp án đúng ${option.label}`}
              className="mt-2.5 size-4 shrink-0 accent-[#1e3a8a]"
            />
            <span className="mt-2 w-4 shrink-0 text-xs font-semibold text-text-secondary">
              {option.label}.
            </span>
            <div className="min-w-0 flex-1">
              <FormulaTextarea
                multiline={false}
                ariaLabel={`Lựa chọn ${option.label}`}
                value={option.text}
                onValueChange={(text) => setOptionText(option.id, text)}
                placeholder={`Lựa chọn ${option.label}`}
              />
            </div>
          </div>
        ))}
      </div>

      <label className="mt-3 flex flex-col gap-1.5">
        Giải thích
        <FormulaTextarea
          ariaLabel={`Giải thích câu ${number}`}
          value={explanation}
          onValueChange={setExplanation}
          placeholder="Giải thích vì sao đáp án này đúng"
        />
      </label>

      <div className="mt-3 flex justify-end gap-2">
        <Button appearance="outline" size="sm" onClick={onCancel}>
          Huỷ
        </Button>
        <Button
          size="sm"
          disabled={!prompt.trim()}
          onClick={() =>
            onSave({
              text: prompt.trim(),
              options: options.map(({ label, text, correct }) => ({ label, text, correct })),
              explanation,
            })
          }
        >
          Lưu
        </Button>
      </div>
    </div>
  )
}
