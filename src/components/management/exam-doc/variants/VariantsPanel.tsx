import { useState, type CSSProperties } from 'react'
import { cn } from '../../../../lib/cn'
import Button from '../../../console/button'
import ConfirmDialog from '../../../console/confirm-dialog'
import { ArrowRight, Check, Layers, X } from '../../../console/icons'
import ScrollArea from '../../../ui/ScrollArea'
import { scrollToPos } from '../doc-outline'
import { useExamDoc } from '../exam-doc-context'
import type { ExamQuestion } from './parse-exam'
import type { ExamVariants } from './use-exam-variants'
import { sameSettings, variantCodes } from './variant-settings'
import { CheckSkeleton, CheckStep, CodesStep, SettingsStep } from './VariantSteps'

type Step = 1 | 2 | 3

const STEPS: ReadonlyArray<{ step: Step; label: string }> = [
  { step: 1, label: 'Kiểm tra đề gốc' },
  { step: 2, label: 'Thiết lập' },
  { step: 3, label: 'Mã đề' },
]

const ICON_BUTTON =
  'inline-flex size-8 items-center justify-center rounded-lg text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border'

interface VariantsPanelProps {
  variants: ExamVariants
  onClose: () => void
  /** Called when "Đi tới" leaves for the sheet (a panel shown as an overlay closes then). */
  onNavigate?: () => void
  className?: string
  style?: CSSProperties
}

/** "Tạo mã đề": check the original, set the codes up, then view each code and its answer key. */
export default function VariantsPanel({ variants, onClose, onNavigate, className = '', style }: VariantsPanelProps) {
  const { sourceEditor } = useExamDoc()
  const { parsed, settings, applied, variantDocs, activeVariant, setActiveVariant } = variants
  const [chosen, setChosen] = useState<Step>(applied ? 3 : 1)
  const [confirmReshuffle, setConfirmReshuffle] = useState(false)
  const hasQuestions = Boolean(parsed && parsed.questions.length > 0)
  const reachable = (step: Step) => step === 1 || (step === 2 ? hasQuestions : hasQuestions && variantDocs.length > 0)
  const step: Step = reachable(chosen) ? chosen : 1

  // Shows the original and brings the question's line to the middle of the sheet.
  function goTo(question: ExamQuestion) {
    const editor = sourceEditor
    if (!editor || editor.isDestroyed) return
    setActiveVariant(null)
    onNavigate?.()
    window.setTimeout(() => {
      if (editor.isDestroyed) return
      const { doc } = editor.state
      if (question.blockIndex >= doc.childCount) return
      let pos = 0
      for (let index = 0; index < question.blockIndex; index += 1) pos += doc.child(index).nodeSize
      scrollToPos(editor, pos)
    }, 80)
  }

  function create() {
    variants.create()
    setChosen(3)
  }

  const changed = applied !== null && !sameSettings(applied, settings)

  return (
    <aside aria-label="Tạo mã đề" className={cn('flex-col bg-card-background', className)} style={style}>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border-secondary px-3">
        <Layers aria-hidden size={15} className="shrink-0 text-primary-text" />
        <h2 className="min-w-0 truncate text-sm font-semibold text-text-primary">Tạo mã đề</h2>
        <button type="button" onClick={onClose} aria-label="Đóng bảng mã đề" title="Đóng" className={cn(ICON_BUTTON, 'ml-auto')}>
          <X size={17} />
        </button>
      </header>

      <ol aria-label="Các bước" className="flex shrink-0 items-start px-3 pt-3 pb-2">
        {STEPS.map((item, index) => {
          const current = item.step === step
          const done = item.step < step
          return (
            <li key={item.step} className="flex min-w-0 flex-1 items-start">
              <button
                type="button"
                disabled={!reachable(item.step)}
                aria-current={current ? 'step' : undefined}
                onClick={() => setChosen(item.step)}
                aria-label={`Bước ${item.step}: ${item.label}`}
                title={item.label}
                className="group flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-input-primary-focus-border disabled:cursor-not-allowed"
              >
                <span
                  className={cn(
                    'grid size-6 place-items-center rounded-full border text-xs font-semibold tabular-nums transition-colors',
                    current
                      ? 'border-brand-500 bg-brand-500 text-white'
                      : done
                        ? 'border-brand-500 bg-badge-primary-background text-primary-text'
                        : 'border-card-border text-text-tertiary group-enabled:group-hover:border-primary-text/40'
                  )}
                >
                  {done ? <Check aria-hidden size={13} /> : item.step}
                </span>
                <span
                  className={cn(
                    'max-w-full truncate text-xs',
                    current ? 'font-medium text-text-primary' : done ? 'text-text-secondary' : 'text-text-tertiary'
                  )}
                >
                  {item.label}
                </span>
              </button>
              {index < STEPS.length - 1 && (
                <span aria-hidden className={cn('mt-3.5 h-px w-4 shrink-0', done ? 'bg-brand-500' : 'bg-card-border')} />
              )}
            </li>
          )
        })}
      </ol>

      <ScrollArea className="min-h-0 flex-1 px-3 pt-2 pb-4">
        {step === 1 && (parsed ? <CheckStep parsed={parsed} onGoTo={goTo} /> : <CheckSkeleton />)}
        {step === 2 && parsed && (
          <SettingsStep settings={settings} placement={parsed.codePlacement} onChange={variants.setSettings} />
        )}
        {step === 3 && (
          <CodesStep
            variants={variantDocs}
            active={activeVariant}
            onView={setActiveVariant}
            onReshuffle={() => setConfirmReshuffle(true)}
          />
        )}
      </ScrollArea>

      <footer className="flex shrink-0 items-center gap-2 border-t border-border-secondary px-3 py-2.5">
        <span className="min-w-0 flex-1 truncate text-xs text-text-tertiary">
          Bước {step}/3 · {step === 3 ? `${variantDocs.length} mã đề` : STEPS[step - 1].label}
        </span>
        {step === 1 && (
          <Button size="sm" disabled={!hasQuestions} onClick={() => setChosen(2)} aria-label="Tiếp tục" title="Tiếp tục">
            Tiếp tục
            <ArrowRight aria-hidden size={14} />
          </Button>
        )}
        {step === 2 &&
          (applied && !changed && variantDocs.length > 0 ? (
            <Button size="sm" onClick={() => setChosen(3)} aria-label="Xem mã đề" title="Xem mã đề">
              Xem mã đề
              <ArrowRight aria-hidden size={14} />
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={!hasQuestions}
              onClick={() => {
                create()
                setActiveVariant(variantCodes(settings)[0] ?? null)
              }}
              aria-label={`${applied ? 'Cập nhật' : 'Tạo'} ${settings.count} mã đề`}
              title={`${applied ? 'Cập nhật' : 'Tạo'} ${settings.count} mã đề`}
            >
              <Layers aria-hidden size={14} />
              {applied ? 'Cập nhật' : 'Tạo'} {settings.count} mã đề
            </Button>
          ))}
        {step === 3 && (
          <>
            <Button
              size="sm"
              appearance="ghost"
              onClick={() => {
                variants.clear()
                setChosen(2)
              }}
              aria-label="Xoá các mã đề"
              title="Xoá các mã đề"
            >
              Xoá mã đề
            </Button>
            <Button size="sm" appearance="outline" onClick={() => setChosen(2)} aria-label="Sửa thiết lập" title="Sửa thiết lập">
              Thiết lập
            </Button>
          </>
        )}
      </footer>

      {confirmReshuffle && (
        <ConfirmDialog
          title="Trộn lại các mã đề?"
          description="Mọi mã sẽ có thứ tự câu và phương án mới; đề đã in theo thứ tự cũ sẽ không còn khớp."
          cancelLabel="Huỷ"
          confirmLabel="Trộn lại"
          onCancel={() => setConfirmReshuffle(false)}
          onConfirm={() => {
            setConfirmReshuffle(false)
            variants.reshuffle()
          }}
        />
      )}
    </aside>
  )
}
