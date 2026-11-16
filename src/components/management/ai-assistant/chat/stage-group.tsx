import type { PropsWithChildren } from 'react'
import { useAuiState } from '@assistant-ui/react'
import {
  ReasoningContent,
  ReasoningRoot,
  ReasoningText,
  ReasoningTrigger,
} from '@/components/assistant-ui/elements/reasoning.aui'
import type { ThreadGroupPart } from '@/components/assistant-ui/elements/thread.aui'

/**
 * A run's stage, as the thread's reasoning group: the same Reasoning element, headed by the stage's title (what the
 * run does: "Khảo sát ngân hàng câu hỏi") instead of a generic word. A group holding several stages is headed by the
 * latest; opening it reads them all.
 */
export function StageGroup({ group, children }: PropsWithChildren<{ group: ThreadGroupPart }>) {
  const label = useAuiState(({ message }) => {
    const titles = message.metadata.custom?.stageTitles as readonly string[] | undefined
    if (!titles) return undefined
    const reasoningBefore = (index: number) =>
      message.parts.slice(0, index).filter((part) => part.type === 'reasoning').length
    const last = group.indices.filter((index) => message.parts[index]?.type === 'reasoning').at(-1)
    return last === undefined ? undefined : titles[reasoningBefore(last)]
  })
  const running = group.status.type === 'running'
  return (
    <ReasoningRoot streaming={running}>
      <ReasoningTrigger active={running} label={label} className="max-w-full" />
      <ReasoningContent aria-busy={running}>
        <ReasoningText>{children}</ReasoningText>
      </ReasoningContent>
    </ReasoningRoot>
  )
}
