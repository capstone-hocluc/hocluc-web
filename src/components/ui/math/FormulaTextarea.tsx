import { useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '../../../lib/cn'
import { fieldControlClass, textareaControlClass } from '../../console/form-field'
import FormulaDialog, { type FormulaValue } from './FormulaDialog'

// Mirrors the delimiters MathText renders: `$$…$$` is a display formula, `$…$` an inline one.
const FORMULA = /(?<!\\)\$\$([\s\S]+?)\$\$|(?<!\\)\$(?=[^\s$])((?:\\.|[^$\\\n])*?)(?<=\S)\$/g

type Control = HTMLInputElement | HTMLTextAreaElement

interface Target {
  start: number
  end: number
  initial: FormulaValue | null
}

/** The formula whose dollars surround `position`, so Σ can reopen and replace it. */
function formulaAt(text: string, position: number) {
  for (const match of text.matchAll(FORMULA)) {
    const start = match.index ?? 0
    const end = start + match[0].length
    if (position >= start && position <= end) {
      return {
        start,
        end,
        body: match[1] ?? match[2] ?? '',
        display: match[1] !== undefined,
      }
    }
  }
  return null
}

interface FormulaTextareaProps {
  value: string
  onValueChange: (value: string) => void
  ariaLabel?: string
  placeholder?: string
  disabled?: boolean
  /** A one-line option row uses an input; the question and explanation use textareas. */
  multiline?: boolean
  className?: string
  rows?: number
}

/** The authoring field with a Σ button: inserts a formula at the caret and edits `$…$` in place. */
export default function FormulaTextarea({
  value,
  onValueChange,
  ariaLabel,
  placeholder,
  disabled = false,
  multiline = true,
  className,
  rows,
}: FormulaTextareaProps) {
  const control = useRef<Control | null>(null)
  const [target, setTarget] = useState<Target | null>(null)

  function openAtCaret() {
    const element = control.current
    const start = element?.selectionStart ?? value.length
    const end = element?.selectionEnd ?? start
    const span = formulaAt(value, start)
    if (span && end <= span.end)
      setTarget({ start: span.start, end: span.end, initial: { latex: span.body, display: span.display } })
    else setTarget({ start, end, initial: null })
  }

  function close() {
    setTarget(null)
    requestAnimationFrame(() => control.current?.focus())
  }

  function focusAt(position: number) {
    requestAnimationFrame(() => {
      const element = control.current
      if (!element) return
      element.focus()
      element.setSelectionRange(position, position)
    })
  }

  function apply(formula: FormulaValue) {
    if (!target) return
    const wrapped = formula.latex ? (formula.display ? `$$${formula.latex}$$` : `$${formula.latex}$`) : ''
    onValueChange(value.slice(0, target.start) + wrapped + value.slice(target.end))
    const caret = target.start + wrapped.length
    setTarget(null)
    focusAt(caret)
  }

  function handleKeyDown(event: KeyboardEvent<Control>) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'm') {
      event.preventDefault()
      openAtCaret()
    }
  }

  const shared = {
    value,
    placeholder,
    disabled,
    onKeyDown: handleKeyDown,
  }

  return (
    <div className="relative min-w-0">
      {multiline ? (
        <textarea
          {...shared}
          ref={(element) => { control.current = element }}
          aria-label={ariaLabel}
          rows={rows}
          className={cn(textareaControlClass, 'pr-10', className)}
          onChange={(event) => onValueChange(event.target.value)}
        />
      ) : (
        <input
          {...shared}
          ref={(element) => { control.current = element }}
          aria-label={ariaLabel}
          className={cn(fieldControlClass, 'pr-10', className)}
          onChange={(event) => onValueChange(event.target.value)}
        />
      )}
      <button
        type="button"
        aria-label="Chèn công thức"
        title="Chèn công thức"
        disabled={disabled}
        className={cn(
          'absolute right-1.5 grid size-7 cursor-pointer place-items-center rounded-md text-text-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50',
          multiline ? 'top-1.5' : 'top-1/2 -translate-y-1/2'
        )}
        onMouseDown={(event) => event.preventDefault()}
        onClick={openAtCaret}
      >
        <span aria-hidden="true" className="text-base leading-none">Σ</span>
      </button>
      {target && (
        <FormulaDialog
          initial={target.initial}
          onClose={close}
          onSave={apply}
          onDelete={() => apply({ latex: '', display: false })}
        />
      )}
    </div>
  )
}
