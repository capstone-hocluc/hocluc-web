import { useLayoutEffect, type ReactNode, type RefObject } from 'react'
import { AssistantRuntimeProvider, type AssistantRuntime } from '@assistant-ui/react'
import { runAnswerOf, runStagesOf, type AiRunStore } from '../../../../hooks/useAiAssistant'
import { createValueStore, useStoreValue } from '../../../../lib/value-store'
import type { ReadingTurn, ReadingTurnStore } from '../reading-turn'
import { useAssistantChatRuntime, type AssistantChatOptions } from './assistant-runtime'
import { ReplyDataUIs } from './reply-parts'

const wholeTurn = (turn: ReadingTurn | null) => turn
const noReading = createValueStore<ReadingTurn | null>(null)

/**
 * The chat's assistant-ui runtime, made here rather than in the page: it follows the run's stages and the words of its
 * answer itself, and the reading of the paper open beside it, so a step of either re-renders this provider and the
 * thread, while the page passed in as `children` stays as it was. The page reaches the runtime (the composer's words)
 * through `runtimeRef`.
 */
export function AssistantChatProvider({
  run,
  reading,
  runtimeRef,
  children,
  ...options
}: AssistantChatOptions & {
  run: AiRunStore
  reading?: ReadingTurnStore
  runtimeRef: RefObject<AssistantRuntime | null>
  children: ReactNode
}) {
  const stages = useStoreValue(run, runStagesOf)
  const answer = useStoreValue(run, runAnswerOf)
  const readingTurn = useStoreValue(reading ?? noReading, wholeTurn)
  const runtime = useAssistantChatRuntime({ ...options, stages, answer, reading: readingTurn })
  useLayoutEffect(() => {
    runtimeRef.current = runtime
  }, [runtime, runtimeRef])
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ReplyDataUIs />
      {children}
    </AssistantRuntimeProvider>
  )
}
