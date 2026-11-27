import { cn } from '../../../lib/cn'
import { LIVE_CLASS_TONE_CLASS, LIVE_CLASS_TONE_LABEL } from './live-class-tones'

export default function LiveClassLegend({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-4 text-xs text-text-tertiary', className)}>
      {(Object.keys(LIVE_CLASS_TONE_LABEL) as (keyof typeof LIVE_CLASS_TONE_LABEL)[]).map((tone) => (
        <span key={tone} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={cn('size-3 rounded-xs', LIVE_CLASS_TONE_CLASS[tone])} />
          {LIVE_CLASS_TONE_LABEL[tone]}
        </span>
      ))}
    </div>
  )
}
