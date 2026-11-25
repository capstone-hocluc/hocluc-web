import { BrainIcon } from 'lucide-react'
import type { ReasoningMessagePartComponent } from '@assistant-ui/react'
import { MarkdownText } from '@/components/assistant-ui/elements/markdown-text'

/** What a stage found or means to do, in its words: a line of the stage's steps, headed by a thought icon. */
export const StageNote: ReasoningMessagePartComponent = ({ text }) =>
  text.trim() === '' ? null : (
    <div data-slot="run-step-note" className="flex min-w-0 gap-2 py-1">
      <BrainIcon aria-hidden className="mt-[0.2em] size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <MarkdownText />
      </div>
    </div>
  )
