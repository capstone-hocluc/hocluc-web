import type { CSSProperties } from 'react'
import { cn } from '../../../lib/cn'
import { ChevronLeft, X } from '../../console/icons'
import ScrollArea from '../../ui/ScrollArea'
import type { ExamPaper as ExamPaperModel, ExamPaperPart } from './exam-format'

interface ExamOutlineProps {
  paper: ExamPaperModel
  numberOf: Map<string, number>
  onJump: (questionId: string) => void
  onCollapse?: () => void
  onClose?: () => void
  className?: string
  style?: CSSProperties
}

export default function ExamOutline({
  paper,
  numberOf,
  onJump,
  onCollapse,
  onClose,
  className = '',
  style,
}: ExamOutlineProps) {
  const sections: Array<{ parentTitle: string | null; parts: ExamPaperPart[] }> = []
  for (const part of paper.parts) {
    const parentTitle = part.parentTitle ?? null
    const last = sections[sections.length - 1]
    if (last && last.parentTitle === parentTitle) last.parts.push(part)
    else sections.push({ parentTitle, parts: [part] })
  }

  return (
    <aside aria-label="Mục lục đề thi" className={cn('flex-col bg-card-background', className)} style={style}>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border-secondary px-3">
        <span className="text-sm font-semibold text-text-primary">Mục lục</span>
        <div className="ml-auto flex shrink-0 items-center">
          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Thu gọn mục lục"
              title="Thu gọn mục lục"
              className="inline-flex size-8 items-center justify-center rounded-lg text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border"
            >
              <ChevronLeft size={17} strokeWidth={1.7} />
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng mục lục"
              title="Đóng mục lục"
              className="inline-flex size-8 items-center justify-center rounded-lg text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border"
            >
              <X size={17} strokeWidth={1.7} />
            </button>
          )}
        </div>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-5 px-3 py-4">
          {sections.map((section) => (
            <section
              key={section.parentTitle ?? section.parts[0].id}
              aria-label={section.parentTitle ?? section.parts[0].title}
            >
              {section.parentTitle && (
                <h2 className="text-[11px] leading-5 font-semibold tracking-wide text-text-tertiary uppercase">
                  {section.parentTitle}
                </h2>
              )}
              <div className={cn(section.parentTitle && 'mt-2 space-y-3')}>
                {section.parts.map((part) => {
                  const questions = paper.questions.filter((question) => question.partId === part.id)
                  return (
                    <div key={part.id}>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="min-w-0 text-xs leading-5 font-semibold text-text-primary">
                          {part.title}
                        </h3>
                        <span className="shrink-0 text-[11px] leading-5 tabular-nums text-text-tertiary">
                          {part.targetCount !== null
                            ? `${questions.length}/${part.targetCount}`
                            : questions.length}
                        </span>
                      </div>
                      {questions.length === 0 ? (
                        <p className="mt-1.5 text-[11px] text-text-tertiary">Chưa có câu</p>
                      ) : (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {questions.map((question) => (
                            <button
                              key={question.id}
                              type="button"
                              onClick={() => onJump(question.id)}
                              aria-label={`Tới câu ${numberOf.get(question.id)}`}
                              className="inline-flex size-7 items-center justify-center rounded-md border border-card-border bg-card-background text-[11px] font-medium tabular-nums text-text-secondary transition-colors hover:border-input-primary-focus-border hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border"
                            >
                              {numberOf.get(question.id)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </ScrollArea>
    </aside>
  )
}
