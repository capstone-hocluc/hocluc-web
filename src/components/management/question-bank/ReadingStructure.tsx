import { useMemo, useState, type ReactNode } from 'react'
import { cn } from '../../../lib/cn'
import type { ExtractedGroup, ExtractedSection, QuestionReviewStatus } from '../../../services/aiExtractionService'
import { ChevronDown, ChevronRight } from '../../console/icons'
import MathText from '../../ui/MathText'
import type { PaperQuestion } from './ReadingAsPaper'
import { ACTIVITY_FRAME, ACTIVITY_LABEL } from './question-activity'

const inRange = (section: ExtractedSection, number: number) =>
  section.fromQuestion !== null && section.toQuestion !== null && number >= section.fromQuestion && number <= section.toQuestion

const byStart = (a: ExtractedSection, b: ExtractedSection) => (a.fromQuestion ?? 0) - (b.fromQuestion ?? 0)

interface Node {
  section: ExtractedSection
  /** Questions of this section that no child section holds. */
  own: PaperQuestion[]
  children: { section: ExtractedSection; questions: PaperQuestion[] }[]
}

// what the second model's check says of a question, in a word or two
const REVIEW_LABEL: Record<QuestionReviewStatus, string> = {
  PENDING: 'Chờ soát',
  AGREED: 'Khớp',
  REREAD: 'Đang đọc lại',
  ACCEPTED: 'Giữ theo đáp án chính thức',
  NEEDS_HUMAN: 'Cần người duyệt',
  SKIPPED: 'Chưa soát',
}
const REVIEW_TONE: Record<QuestionReviewStatus, string> = {
  PENDING: 'text-text-tertiary',
  AGREED: 'text-badge-success-text',
  REREAD: 'text-badge-warning-text',
  ACCEPTED: 'text-badge-blue-text',
  NEEDS_HUMAN: 'text-badge-error-text',
  SKIPPED: 'text-text-tertiary',
}

const readCount = (questions: PaperQuestion[]) => questions.filter((q) => q.text.trim() !== '').length

function rangeText(section: ExtractedSection, questions: PaperQuestion[]) {
  const read = readCount(questions)
  const total =
    section.fromQuestion !== null && section.toQuestion !== null ? section.toQuestion - section.fromQuestion + 1 : null
  const span =
    section.fromQuestion !== null && section.toQuestion !== null ? `Câu ${section.fromQuestion}–${section.toQuestion}` : ''
  const done = total ? `${read}/${total}` : `${read} câu`
  return span ? `${span} · ${done}` : done
}

function QuestionRow({
  question,
  selected,
  onSelect,
}: {
  question: PaperQuestion
  selected: boolean
  onSelect: (number: number) => void
}) {
  const empty = !question.writing && question.text.trim() === ''
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => onSelect(question.number)}
        className={cn(
          'flex w-full cursor-pointer items-start gap-2 rounded-lg border bg-transparent px-3 py-2 text-left text-sm',
          selected ? 'border-brand-500 bg-badge-blue-background' : 'border-card-border hover:border-brand-500',
          question.activity && ['border-transparent', ACTIVITY_FRAME[question.activity]]
        )}
        title={question.activity ? ACTIVITY_LABEL[question.activity] : undefined}
      >
        <span className="flex shrink-0 flex-col items-start">
          <span className="font-semibold text-text-primary">Câu {question.number}</span>
          {question.review && (
            <span className={cn('text-xs', REVIEW_TONE[question.review.status])} title={question.review.note ?? undefined}>
              {REVIEW_LABEL[question.review.status]}
              {question.review.rereads > 0 && ` · đọc lại ${question.review.rereads}`}
            </span>
          )}
        </span>
        <span className="line-clamp-2 min-w-0 break-words text-text-secondary">
          {empty ? (
            <em className="text-text-tertiary">Chưa đọc được</em>
          ) : question.writing ? (
            question.text
          ) : (
            <MathText>{question.text}</MathText>
          )}
          {question.writing && (
            <span aria-hidden className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-brand-500 align-middle" />
          )}
        </span>
      </button>
    </li>
  )
}

/** The questions of one range, a shared passage's heading printed once above the questions it serves. */
function QuestionList({
  questions,
  groups,
  selected,
  onSelect,
}: {
  questions: PaperQuestion[]
  groups: ExtractedGroup[]
  selected: number | null
  onSelect: (number: number) => void
}) {
  const blocks = useMemo(() => {
    const groupOf = (q: PaperQuestion) =>
      groups.find((g) => g.key === q.groupKey) ??
      groups.find(
        (g) => g.fromQuestion !== null && g.toQuestion !== null && q.number >= g.fromQuestion && q.number <= g.toQuestion
      ) ??
      null
    const list: { group: ExtractedGroup | null; questions: PaperQuestion[] }[] = []
    for (const question of questions) {
      const group = groupOf(question)
      const last = list[list.length - 1]
      if (last && group && last.group?.key === group.key) last.questions.push(question)
      else list.push({ group, questions: [question] })
    }
    return list
  }, [questions, groups])

  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, index) => (
        <div key={`${block.group?.key ?? 'loose'}-${index}`} className="flex flex-col gap-1.5">
          {block.group && (
            <p className="m-0 text-xs font-medium text-text-tertiary">
              {block.group.instruction?.trim() ||
                `Câu ${block.group.fromQuestion ?? block.questions[0].number}–${block.group.toQuestion ?? block.questions[block.questions.length - 1].number}`}
            </p>
          )}
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {block.questions.map((question) => (
              <QuestionRow
                key={question.number}
                question={question}
                selected={question.number === selected}
                onSelect={onSelect}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function Fold({
  title,
  detail,
  open,
  onToggle,
  level,
  children,
}: {
  title: string
  detail: string
  open: boolean
  onToggle: () => void
  level: 'part' | 'section'
  children: ReactNode
}) {
  const Chevron = open ? ChevronDown : ChevronRight
  return (
    <section
      className={cn(
        'rounded-xl border border-card-border',
        level === 'part' ? 'bg-card-background' : 'bg-background-gray-secondary'
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-2 rounded-xl border-0 bg-transparent px-3 py-2.5 text-left"
      >
        <Chevron size={16} aria-hidden className="shrink-0 text-text-tertiary" />
        <span className="min-w-0 flex-1">
          <span className={cn('block break-words text-text-primary', level === 'part' ? 'font-semibold' : 'text-sm font-medium')}>
            {title}
          </span>
          <span className="block text-xs text-text-tertiary">{detail}</span>
        </span>
      </button>
      {open && <div className="flex flex-col gap-2 px-3 pb-3">{children}</div>}
    </section>
  )
}

/**
 * The questions grouped the way the paper is built: each part opens into its sections, each section into its
 * questions. The part holding the selected question opens by itself, until the viewer opens or closes it.
 */
export default function ReadingStructure({
  sections,
  groups,
  questions,
  selected,
  onSelect,
}: {
  sections: ExtractedSection[]
  groups: ExtractedGroup[]
  questions: PaperQuestion[]
  selected: number | null
  onSelect: (number: number) => void
}) {
  // what the viewer opened or closed; a section not listed follows the selected question
  const [manual, setManual] = useState<Record<string, boolean>>({})

  const { nodes, loose } = useMemo(() => {
    const sorted = [...questions].sort((a, b) => a.number - b.number)
    const placed = new Set<number>()
    const take = (keep: (q: PaperQuestion) => boolean) =>
      sorted
        .filter((q) => !placed.has(q.number) && keep(q))
        .map((q) => {
          placed.add(q.number)
          return q
        })
    const tops = sections.filter((s) => !s.parentKey).sort(byStart)
    const built: Node[] = tops.map((top) => {
      const children = sections
        .filter((c) => c.parentKey === top.key)
        .sort(byStart)
        .map((child) => ({ section: child, questions: take((q) => inRange(child, q.number)) }))
      return { section: top, children, own: take((q) => inRange(top, q.number)) }
    })
    return { nodes: built, loose: take(() => true) }
  }, [sections, questions])

  const holds = (section: ExtractedSection) => selected !== null && inRange(section, selected)
  const isOpen = (section: ExtractedSection) => manual[section.key] ?? (holds(section) || (nodes.length === 1 && !section.parentKey))
  const toggle = (section: ExtractedSection) => setManual((old) => ({ ...old, [section.key]: !isOpen(section) }))

  if (nodes.length === 0 && loose.length === 0) {
    return <p className="m-0 text-sm text-text-tertiary">Chưa có câu nào được đọc.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {nodes.map(({ section, own, children }) => (
        <Fold
          key={section.key}
          level="part"
          title={section.title}
          detail={rangeText(section, [...own, ...children.flatMap((c) => c.questions)])}
          open={isOpen(section)}
          onToggle={() => toggle(section)}
        >
          {own.length > 0 && (
            <QuestionList questions={own} groups={groups} selected={selected} onSelect={onSelect} />
          )}
          {children.map((child) => (
            <Fold
              key={child.section.key}
              level="section"
              title={child.section.title}
              detail={rangeText(child.section, child.questions)}
              open={isOpen(child.section)}
              onToggle={() => toggle(child.section)}
            >
              <QuestionList questions={child.questions} groups={groups} selected={selected} onSelect={onSelect} />
            </Fold>
          ))}
        </Fold>
      ))}
      {loose.length > 0 && (
        <QuestionList questions={loose} groups={groups} selected={selected} onSelect={onSelect} />
      )}
    </div>
  )
}
