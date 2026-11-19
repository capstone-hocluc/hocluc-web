import { useLayoutEffect, type ReactNode, type RefObject } from 'react'
import { AssistantRuntimeProvider, type AssistantRuntime } from '@assistant-ui/react'
import { runAnswerOf, runStagesOf, type AiRunStore } from '../../../../hooks/useAiAssistant'
import { useStoreValue } from '../../../../lib/value-store'
import { useAssistantChatRuntime, type AssistantChatOptions } from './assistant-runtime'
import { ReplyDataUIs } from './reply-parts'

/**
 * The chat's assistant-ui runtime, made here rather than in the page: it follows the run's stages and the words of its
 * answer itself, so a step of the run re-renders this provider and the thread, while the page passed in as `children` stays as it was. The
 * page reaches the runtime (the composer's words) through `runtimeRef`.
 */
export function AssistantChatProvider({
  run,
  runtimeRef,
  children,
  ...options
}: AssistantChatOptions & {
  run: AiRunStore
  runtimeRef: RefObject<AssistantRuntime | null>
  children: ReactNode
}) {
  const stages = useStoreValue(run, runStagesOf)
  const answer = useStoreValue(run, runAnswerOf)
  const runtime = useAssistantChatRuntime({ ...options, stages, answer })
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
