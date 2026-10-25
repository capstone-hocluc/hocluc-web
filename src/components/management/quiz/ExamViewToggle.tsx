import { ToggleButton, ToggleButtonGroup } from 'react-aria-components'
import { FileQuestion, Rows3 } from '../../console/icons'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../tailgrids/core/tooltip'

/** One question at a time, or every question on one scrolling page. */
export type ExamEditorView = 'single' | 'all'

const VIEW_OPTIONS = [
  { id: 'single', label: 'Từng câu', Icon: FileQuestion },
  { id: 'all', label: 'Cuộn tất cả', Icon: Rows3 },
] as const

/** Icon-only switch between the two ways of reading the exam's questions. */
export default function ExamViewToggle({ view, onChange }: {
  view: ExamEditorView
  onChange: (view: ExamEditorView) => void
}) {
  return (
    <ToggleButtonGroup
      aria-label="Cách xem câu hỏi"
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[view]}
      onSelectionChange={(keys) => { const next = [...keys][0]; if (next === 'single' || next === 'all') onChange(next) }}
      className="flex rounded-lg bg-background-gray-secondary p-0.5"
    >
      {VIEW_OPTIONS.map(({ id, label, Icon }) => (
        <Tooltip key={id} placement="bottom">
          <TooltipTrigger asChild>
            <ToggleButton
              id={id}
              aria-label={label}
              className="grid size-8 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:-outline-offset-2! focus-visible:outline-primary data-[selected]:bg-card-background data-[selected]:text-primary data-[selected]:shadow-sm"
            ><Icon size={16} aria-hidden="true" /></ToggleButton>
          </TooltipTrigger>
          <TooltipContent><p>{label}</p></TooltipContent>
        </Tooltip>
      ))}
    </ToggleButtonGroup>
  )
}
