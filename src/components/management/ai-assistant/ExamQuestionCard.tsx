import { useState } from 'react'
import { cn } from '../../../lib/cn'
import type { AiExamOption, AiExamQuestion } from '../../../services/aiAssistantService'
import Button from '../../console/button'
import { Check, GripVertical, Pencil, Trash2, X, type LucideIcon } from '../../console/icons'
import FormulaTextarea from '../../ui/math/FormulaTextarea'
import MathText from '../../ui/MathText'
import { optionColumns } from '../quiz/paper-layout'

const AI_TAG =
  'ml-1 inline-block rounded border border-[#1e3a8a]/30 px-1 align-middle font-sans text-[8pt] font-bold tracking-wider text-[#1e3a8a]'

interface ExamQuestionCardProps {
  question: AiExamQuestion
  number: number
  focused: boolean
  editing: boolean
  onStartEdit: () => void
  onStopEdit: () => void
  onSave: (patch: Pick<AiExamQuestion, 'prompt' | 'options' | 'explanation'>) => void
  onDelete: () => void
  onAccept: () => void
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
  onAccept,
  onMove,
}: ExamQuestionCardProps) {
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
              {question.source === 'ai' && (
                <span className={AI_TAG} title="Câu do AI soạn">
                  AI
                </span>
              )}
            </p>
            {question.options.length > 0 && (
              <ol className="quiz-paper-options" data-columns={optionColumns(question.options)}>
                {question.options.map((option) => (
                  <li key={option.id}>
                    <strong>{option.label}.</strong> <MathText>{option.text}</MathText>
                  </li>
                ))}
              </ol>
            )}
            {question.source === 'ai' && !question.accepted && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 font-sans text-text-secondary print:hidden">
                <Button size="sm" appearance="outline" onClick={onAccept}>
                  <Check size={13} />
                  Giữ
                </Button>
                <Button size="sm" appearance="ghost" variant="danger" onClick={onDelete}>
                  <X size={13} />
                  Bỏ
                </Button>
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
  question: AiExamQuestion
  onCancel: () => void
  onSave: (patch: Pick<AiExamQuestion, 'prompt' | 'options' | 'explanation'>) => void
}) {
  const [prompt, setPrompt] = useState(question.prompt)
  const [options, setOptions] = useState(question.options)
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
        {options.map((option: AiExamOption) => (
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
          onClick={() => onSave({ prompt: prompt.trim(), options, explanation })}
        >
          Lưu
        </Button>
      </div>
    </div>
  )
}
