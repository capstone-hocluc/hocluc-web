import Button from '../../console/button'
import Panel from '../../console/panel'
import { AlertCircle, CheckCircle2, Circle } from '../../console/icons'
import type { ReadinessItem, ReadinessTab } from './course-readiness'

// What is still missing before the course can be sent for review or put on sale.
export default function CourseReadinessChecklist({
  items,
  onGo,
}: {
  items: ReadinessItem[]
  onGo: (tab: ReadinessTab) => void
}) {
  const required = items.filter((item) => !item.optional)
  const done = required.filter((item) => item.state === 'ok').length
  return (
    <Panel
      title="Sẵn sàng để bán"
      action={
        <span className="text-sm text-text-tertiary">
          {done}/{required.length} yêu cầu
        </span>
      }
    >
      <ul className="flex flex-col divide-y divide-card-border">
        {items.map((item) => {
          const Icon = item.state === 'ok' ? CheckCircle2 : item.optional ? AlertCircle : Circle
          const tone =
            item.state === 'ok'
              ? 'text-success'
              : item.optional
                ? 'text-badge-warning-text'
                : 'text-text-tertiary'
          return (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex min-w-0 items-start gap-3">
                <Icon size={18} className={`mt-0.5 shrink-0 ${tone}`} aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    {item.label}
                    <span className="sr-only">
                      {item.state === 'ok'
                        ? ' — đã đạt'
                        : item.optional
                          ? ' — khuyến nghị'
                          : ' — chưa đạt'}
                    </span>
                    {item.optional && item.state !== 'ok' && (
                      <span className="ml-2 text-xs font-normal text-text-tertiary">
                        Khuyến nghị
                      </span>
                    )}
                  </p>
                  {item.state === 'todo' && item.hint && (
                    <p className="mt-0.5 text-xs text-text-tertiary">{item.hint}</p>
                  )}
                </div>
              </div>
              {item.state === 'todo' && (
                <Button size="sm" appearance="ghost" onClick={() => onGo(item.tab)}>
                  Đi tới
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
