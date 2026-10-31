import { useMemo, useRef, useState } from 'react'
import Button from '../../console/button'
import ConsoleDialog from '../../console/dialog'
import { Trash2 } from '../../console/icons'
import { ConsoleTabs, ConsoleTabsContent, ConsoleTabsList, ConsoleTabsTrigger } from '../../console/tabs'
import { Input } from '../../tailgrids/core/input'
import { cn } from '../../../lib/cn'
import MathText from '../MathText'
import { FORMULA_GROUPS, type FormulaSymbol } from './formula-palette'
import MathLiveField, { type MathLiveHandle } from './MathLiveField'

export interface FormulaValue {
  /** LaTeX without the surrounding `$` or `$$`. */
  latex: string
  display: boolean
}

type Mode = 'math' | 'chem'

const CHEM_INSERTS: Array<{ label: string; text: string; title: string }> = [
  { label: '→', text: ' -> ', title: 'Mũi tên phản ứng' },
  { label: '⇌', text: ' <=> ', title: 'Phản ứng thuận nghịch' },
  { label: '↑', text: '^', title: 'Chất khí thoát ra' },
  { label: '↓', text: 'v', title: 'Kết tủa' },
  { label: '(s)', text: '(s)', title: 'Rắn' },
  { label: '(l)', text: '(l)', title: 'Lỏng' },
  { label: '(g)', text: '(g)', title: 'Khí' },
  { label: '(aq)', text: '(aq)', title: 'Dung dịch' },
  { label: 'ⁿ⁺', text: '^2+', title: 'Điện tích ion' },
  { label: 't°', text: ' ->[t°] ', title: 'Điều kiện phản ứng' },
]

function Palette({ onInsert }: { onInsert: (latex: string) => void }) {
  const [groupId, setGroupId] = useState(FORMULA_GROUPS[0].id)
  const group = FORMULA_GROUPS.find((item) => item.id === groupId) ?? FORMULA_GROUPS[0]

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Nhóm ký hiệu">
        {FORMULA_GROUPS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={item.id === groupId}
            className={cn(
              'shrink-0 cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors',
              item.id === groupId
                ? 'bg-brand-500/10 text-brand-500'
                : 'text-text-tertiary hover:bg-background-gray-secondary hover:text-text-primary'
            )}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setGroupId(item.id)}
          >{item.label}</button>
        ))}
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1">
        {group.symbols.map((item: FormulaSymbol) => (
          <button
            key={item.title + item.latex}
            type="button"
            title={item.title}
            aria-label={item.title}
            className="flex h-10 min-w-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-transparent text-text-primary transition-colors hover:border-brand-500/30 hover:bg-brand-500/5"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onInsert(item.latex)}
          >
            <MathText>{'$' + item.preview + '$'}</MathText>
          </button>
        ))}
      </div>
    </div>
  )
}

interface FormulaDialogProps {
  /** Set when the caret was inside an existing formula; enables Xoá. */
  initial: FormulaValue | null
  onClose: () => void
  onSave: (value: FormulaValue) => void
  onDelete?: () => void
}

export default function FormulaDialog({ initial, onClose, onSave, onDelete }: FormulaDialogProps) {
  const initialChem = /^\s*\\ce\s*\{([\s\S]*)\}\s*$/.exec(initial?.latex ?? '')
  const [mode, setMode] = useState<Mode>(initialChem ? 'chem' : 'math')
  const [math, setMath] = useState(initialChem ? '' : (initial?.latex ?? ''))
  const [chem, setChem] = useState(initialChem?.[1] ?? '')
  const [display, setDisplay] = useState(initial?.display ?? false)
  const mathHandle = useRef<MathLiveHandle | null>(null)
  const chemInput = useRef<HTMLInputElement | null>(null)

  const previewLatex = mode === 'chem'
    ? (chem.trim() ? '\\ce{' + chem.trim() + '}' : '')
    : math.trim()
  const preview = useMemo(() => {
    if (!previewLatex) return ''
    return display ? '$$' + previewLatex + '$$' : '$' + previewLatex + '$'
  }, [previewLatex, display])

  function insertChem(text: string) {
    const control = chemInput.current
    const start = control?.selectionStart ?? chem.length
    const end = control?.selectionEnd ?? start
    const next = chem.slice(0, start) + text + chem.slice(end)
    setChem(next)
    const caret = start + text.length
    requestAnimationFrame(() => {
      control?.focus()
      control?.setSelectionRange(caret, caret)
    })
  }

  function save() {
    const latex = mode === 'chem'
      ? (chem.trim() ? '\\ce{' + chem.trim() + '}' : '')
      : (mathHandle.current?.value() ?? math).trim()
    if (!latex) {
      if (initial) onDelete?.()
      else onClose()
      return
    }
    onSave({ latex, display })
  }

  const footer = (
    <div className="flex w-full flex-wrap items-center gap-2">
      {initial && onDelete && (
        <Button variant="danger" appearance="outline" className="mr-auto" onClick={onDelete}>
          <Trash2 size={14} />Xoá
        </Button>
      )}
      <Button appearance="outline" onClick={onClose}>Huỷ</Button>
      <Button onClick={save}>Lưu</Button>
    </div>
  )

  return (
    <ConsoleDialog open onClose={onClose} title="Chèn công thức" maxWidth={704} footer={footer}>
      <div className="flex flex-col gap-4">
        <ConsoleTabs value={mode} onValueChange={(next) => setMode(next as Mode)}>
          <ConsoleTabsList>
            <ConsoleTabsTrigger value="math">Toán</ConsoleTabsTrigger>
            <ConsoleTabsTrigger value="chem">Hoá học</ConsoleTabsTrigger>
          </ConsoleTabsList>

          <ConsoleTabsContent value="math" className="gap-3 pt-4">
            <div className="rounded-lg border border-card-border bg-input-background px-3 py-1.5 focus-within:border-input-primary-focus-border">
              <MathLiveField value={math} onChange={setMath} handleRef={mathHandle} />
            </div>
            <Palette onInsert={(latex) => mathHandle.current?.insert(latex)} />
          </ConsoleTabsContent>

          <ConsoleTabsContent value="chem" className="gap-3 pt-4">
            <Input
              className="w-full font-mono"
              aria-label="Công thức hoá học"
              placeholder="2Na + 2H2O -> 2NaOH + H2"
              spellCheck={false}
              value={chem}
              onChange={(event) => setChem(event.target.value)}
              onFocus={(event) => { chemInput.current = event.currentTarget }}
            />
            <div className="flex flex-wrap gap-1">
              {CHEM_INSERTS.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  title={item.title}
                  aria-label={item.title}
                  className="cursor-pointer rounded-md border border-card-border px-2 py-0.5 text-xs text-text-primary transition-colors hover:border-brand-500/30 hover:bg-brand-500/5"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => insertChem(item.text)}
                >{item.label}</button>
              ))}
            </div>
          </ConsoleTabsContent>
        </ConsoleTabs>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-text-primary">Xem trước</span>
            <div className="flex gap-1">
              <Button size="sm" appearance={display ? 'ghost' : 'outline'} aria-pressed={!display} onClick={() => setDisplay(false)}>
                Trong dòng
              </Button>
              <Button size="sm" appearance={display ? 'outline' : 'ghost'} aria-pressed={display} onClick={() => setDisplay(true)}>
                Riêng dòng
              </Button>
            </div>
          </div>
          <div className="min-h-12 overflow-x-auto rounded-lg bg-background-gray-secondary px-3 py-2 text-sm leading-6 text-text-primary">
            {preview
              ? <MathText>{preview}</MathText>
              : <span className="text-text-tertiary">Xem trước công thức</span>}
          </div>
        </div>
      </div>
    </ConsoleDialog>
  )
}
