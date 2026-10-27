import { useEffect, useRef } from 'react'
import { cn } from '../../../lib/cn'
import type { ExtractedGroup, ExtractedSection } from '../../../services/aiExtractionService'
import MathText from '../../ui/MathText'
import PaperBrand from '../quiz/PaperBrand'
import { optionColumns, sharedHeading } from '../quiz/paper-layout'
import '../quiz/quiz-paper.css'

/** A question as the paper shows it: what the AI read, or is still writing. */
export interface PaperQuestion {
  number: number
  text: string
  options: { label: string; text: string; correct?: boolean }[]
  imageUrl?: string | null
  groupKey?: string | null
  writing: boolean
}

function QuestionBlock({ question, selected, onSelect }: { question: PaperQuestion; selected: boolean; onSelect: (n: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selected])
  // a formula half written would show as its source anyway: plain text until the question is complete
  const text = (value: string) => (question.writing ? value : <MathText>{value}</MathText>)
  const empty = !question.writing && question.text.trim() === '' && question.options.length === 0
  return (
    <div
      ref={ref}
      data-question={question.number}
      role="button"
      tabIndex={0}
      aria-label={`Câu ${question.number}`}
      aria-pressed={selected}
      onClick={() => onSelect(question.number)}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') onSelect(question.number)
      }}
      className={cn(
        'quiz-paper-question -mx-1.5 cursor-pointer rounded px-1.5 outline-none',
        selected && 'bg-sky-50 ring-2 ring-sky-500/60',
        question.writing && 'bg-sky-50/60'
      )}
    >
      <p className="quiz-paper-stem">
        <strong>Câu {question.number}:</strong>{' '}
        {empty ? <em className="text-slate-500">(AI chưa đọc được câu này)</em> : text(question.text)}
        {question.writing && <span aria-hidden className="ml-0.5 inline-block h-[0.9em] w-1.5 animate-pulse bg-sky-600 align-middle" />}
      </p>
      {question.imageUrl && <img src={question.imageUrl} alt={`Hình câu ${question.number}`} />}
      {question.options.length > 0 && (
        <ol className="quiz-paper-options" data-columns={optionColumns(question.options)}>
          {question.options.map(option => (
            <li key={option.label} className={cn(option.correct && 'font-semibold text-emerald-700')}>
              <strong>{option.label}.</strong> {text(option.text)}
              {option.correct ? ' ✓' : ''}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/** The questions of one range in order, a shared passage printed once above the questions it serves. */
function Questions({
  questions,
  groups,
  selected,
  onSelect,
}: {
  questions: PaperQuestion[]
  groups: ExtractedGroup[]
  selected: number | null
  onSelect: (n: number) => void
}) {
  const groupOf = (q: PaperQuestion) =>
    groups.find(g => g.key === q.groupKey) ??
    groups.find(g => g.fromQuestion !== null && g.toQuestion !== null && q.number >= g.fromQuestion && q.number <= g.toQuestion) ??
    null
  const blocks: { group: ExtractedGroup | null; questions: PaperQuestion[] }[] = []
  for (const question of questions) {
    const group = groupOf(question)
    const last = blocks[blocks.length - 1]
    if (last && group && last.group?.key === group.key) last.questions.push(question)
    else blocks.push({ group, questions: [question] })
  }
  return (
    <>
      {blocks.map((block, index) => {
        const items = block.questions.map(q => (
          <QuestionBlock key={q.number} question={q} selected={q.number === selected} onSelect={onSelect} />
        ))
        if (!block.group) return <div key={`loose-${index}`}>{items}</div>
        const g = block.group
        return (
          <div key={`${g.key}-${index}`} className="quiz-paper-group">
            <p className="quiz-paper-group-title">
              {g.instruction?.trim() || sharedHeading(g.fromQuestion ?? block.questions[0].number, g.toQuestion ?? block.questions[block.questions.length - 1].number)}
            </p>
            {g.passage && (
              <p className="quiz-paper-passage">
                <MathText>{g.passage}</MathText>
              </p>
            )}
            {g.imageUrl && <img src={g.imageUrl} alt={`Hình cho các câu ${g.fromQuestion}-${g.toQuestion}`} />}
            {items}
          </div>
        )
      })}
    </>
  )
}

const inRange = (s: ExtractedSection, n: number) => s.fromQuestion !== null && s.toQuestion !== null && n >= s.fromQuestion && n <= s.toQuestion

/**
 * The paper as the AI read it, laid out like the printed ĐGNL paper (parts in capitals, bold "Câu N:", passages above
 * their questions) - for a paper whose PDF was not kept, or to compare with it. Grows as the AI writes.
 */
export default function ReadingAsPaper({
  title,
  sections,
  groups,
  questions,
  selected,
  onSelect,
}: {
  title: string
  sections: ExtractedSection[]
  groups: ExtractedGroup[]
  questions: PaperQuestion[]
  selected: number | null
  onSelect: (n: number) => void
}) {
  const sorted = [...questions].sort((a, b) => a.number - b.number)
  const byStart = (a: ExtractedSection, b: ExtractedSection) => (a.fromQuestion ?? 0) - (b.fromQuestion ?? 0)
  const tops = sections.filter(s => !s.parentKey).sort(byStart)
  const childrenOf = (s: ExtractedSection) => sections.filter(c => c.parentKey === s.key).sort(byStart)
  const placed = new Set<number>()
  const take = (keep: (q: PaperQuestion) => boolean) =>
    sorted.filter(q => !placed.has(q.number) && keep(q)).map(q => {
      placed.add(q.number)
      return q
    })

  const parts = tops.map(top => {
    const children = childrenOf(top).map(child => ({ child, questions: take(q => inRange(child, q.number)) }))
    return { top, children, own: take(q => inRange(top, q.number)) }
  })
  const loose = take(() => true)

  return (
    <article className="quiz-paper" aria-label="Bản đề AI đọc được">
      <PaperBrand content="source" />
      <h1>{title}</h1>
      <p className="quiz-paper-meta">Bản dựng lại từ những gì AI đọc được · {sorted.filter(q => q.text.trim()).length} câu</p>
      {sorted.length === 0 && <p className="text-center text-slate-500 italic">AI chưa viết câu nào.</p>}
      {parts.map(({ top, children, own }) => (
        <section key={top.key}>
          <h2>{top.title}</h2>
          <Questions questions={own} groups={groups} selected={selected} onSelect={onSelect} />
          {children.map(({ child, questions: list }) => (
            <section key={child.key}>
              <h3>{child.title}</h3>
              <Questions questions={list} groups={groups} selected={selected} onSelect={onSelect} />
            </section>
          ))}
        </section>
      ))}
      {loose.length > 0 && <Questions questions={loose} groups={groups} selected={selected} onSelect={onSelect} />}
    </article>
  )
}
