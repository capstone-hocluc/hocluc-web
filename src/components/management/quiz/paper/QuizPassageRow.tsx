import MathText from '../../../ui/MathText'
import type { ExamPaperGroup } from '../../ai-assistant/exam-format'
import { sharedHeading } from '../paper-layout'

/** A shared passage in the dense list, once above the questions it serves; folded so the questions stay close together. */
export default function QuizPassageRow({ group, numbers }: { group: ExamPaperGroup; numbers: number[] }) {
  const first = numbers[0]
  const last = numbers[numbers.length - 1]
  return (
    <details>
      <summary className="cursor-pointer font-medium text-text-primary">{group.instruction?.trim() || sharedHeading(first, last)}</summary>
      {group.passage && <p className="mt-1 mb-0 whitespace-pre-wrap break-words text-text-secondary"><MathText>{group.passage}</MathText></p>}
      {group.passageImageUrl && <img src={group.passageImageUrl} alt={`Hình cho các câu ${first}-${last}`} className="mt-1 max-h-60 max-w-full object-contain" />}
    </details>
  )
}
