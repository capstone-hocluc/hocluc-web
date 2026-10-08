import { BookOpen, Trophy } from 'lucide-react'

interface CourseMiniCardProps {
  title: string
  category: string
  /** Text bottom-left, e.g. "Đã học 2/6 bài học". */
  progress: string
  /** Value next to the trophy. */
  score: string
  onOpen: () => void
}

// Compact course card of the dashboard carousel: blue cover + progress row.
function CourseMiniCard({ title, category, progress, score, onOpen }: CourseMiniCardProps) {
  return (
    <button
      type="button"
      className="flex h-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-[14px] border border-line-card bg-surface text-left transition duration-200 hover:-translate-y-0.5 hover:border-line-brand hover:shadow-card-hover"
      onClick={onOpen}
    >
      <div className="relative min-h-[142px] overflow-hidden bg-[linear-gradient(135deg,var(--color-link),var(--color-link))] p-[22px] text-surface after:absolute after:-right-7 after:-bottom-[42px] after:size-40 after:rounded-full after:border-2 after:border-white/42 after:content-['']">
        <span className="relative z-1 mb-[5px] block max-w-[145px] text-xs font-extrabold uppercase">
          {category}
        </span>
        <strong className="relative z-1 block max-w-[145px] text-[15px] leading-[1.22] uppercase">
          {title}
        </strong>
        <BookOpen size={26} className="absolute top-[34px] right-7 z-1" />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h4 className="mb-5 text-[15px] leading-[1.35] font-extrabold text-text-heading">
          {title}
        </h4>
        <div className="mt-auto flex items-center justify-between gap-3 text-[13px] font-bold text-text-secondary">
          <span className="min-w-0">{progress}</span>
          <strong className="inline-flex items-center gap-[5px] text-text-body">
            <Trophy size={17} className="fill-accent text-accent" /> {score}
          </strong>
        </div>
      </div>
    </button>
  )
}

export default CourseMiniCard
