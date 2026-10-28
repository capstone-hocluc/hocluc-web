import { useConsoleFocus } from '../../console/console-focus'
import { ArrowLeft } from '../../console/icons'
import ScrollArea from '../../ui/ScrollArea'
import QuestionBankScreen from './QuestionBankScreen'

/** The question bank on the whole window: sidebar and header leave while it is open. */
export default function QuestionBankWorkspace({
  title,
  readOnly,
  onBack,
}: {
  title: string
  readOnly: boolean
  onBack: () => void
}) {
  useConsoleFocus()
  return (
    <section className="flex h-dvh min-w-0 flex-col bg-card-surface-area">
      <header className="flex shrink-0 items-center gap-2 border-b border-card-border px-4 py-2.5 sm:px-6">
        <button
          type="button"
          aria-label="Quay lại"
          title="Quay lại"
          onClick={onBack}
          className="-ml-1.5 grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg border-0 bg-transparent text-icon-primary hover:bg-background-gray-secondary"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <h1 className="m-0 min-w-0 truncate text-lg font-semibold text-text-primary">{title}</h1>
      </header>
      <ScrollArea as="main" className="min-h-0 flex-1">
        <div className="flex w-full flex-col gap-5 p-4 pb-5 sm:p-6">
          <QuestionBankScreen readOnly={readOnly} />
        </div>
      </ScrollArea>
    </section>
  )
}
