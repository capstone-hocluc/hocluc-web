import { BookOpen, Trophy } from '../../console/icons'

interface CourseMiniCardProps {
  title: string
  category: string
  /** Text bottom-left, e.g. "Đã học 2/6 bài học". */
  progress: string
  /** Value next to the trophy. */
  score: string
  onOpen: () => void
}

// Compact course card of the dashboard carousel: pastel cover + title and progress row.
function CourseMiniCard({ title, category, progress, score, onOpen }: CourseMiniCardProps) {
  return (
    <button
      type="button"
      className="flex h-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-2xl border border-line-card bg-surface text-left shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      onClick={onOpen}
    >
      <div className="relative flex min-h-[120px] items-start justify-between overflow-hidden bg-primary-soft p-5 after:absolute after:-right-8 after:-bottom-12 after:size-36 after:rounded-full after:border-[10px] after:border-white/70 after:content-['']">
        <span className="relative z-1 max-w-[70%] rounded-full bg-surface px-3 py-1 text-xs font-extrabold text-primary-text uppercase">
          {category}
        </span>
        <span className="relative z-1 grid size-12 place-items-center rounded-2xl bg-primary text-white">
          <BookOpen size={24} />
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h4 className="mb-4 text-[17px] leading-[1.35] font-bold text-text-heading">{title}</h4>
        <div className="mt-auto flex items-center justify-between gap-3 text-sm font-bold text-text-secondary">
          <span className="min-w-0">{progress}</span>
          <strong className="inline-flex items-center gap-1.5 font-bold text-text-heading">
            <Trophy size={18} className="fill-accent text-accent" /> {score}
          </strong>
        </div>
      </div>
    </button>
  )
}

export default CourseMiniCard
