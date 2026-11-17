import type { ThreadMessageLike } from '@assistant-ui/react'
import type { AiTraceStage } from '../exam-format'

type Part = Exclude<ThreadMessageLike['content'], string>[number]

/**
 * What a stage found and changed, as the words of its reasoning, under its title: stages with no tool between them
 * fall in one reasoning group, which then reads as each stage in turn.
 */
function stageText(stage: AiTraceStage) {
  return [`**${stage.title}**`, stage.detail, ...(stage.notes ?? [])].filter(Boolean).join('\n\n')
}

/** The titles of a message's stages, in the order of its reasoning parts, kept as `metadata.custom.stageTitles`. */
export function stageTitles(stages: readonly AiTraceStage[] | undefined) {
  return (stages ?? []).map((stage) => stage.title)
}

/**
 * A run's stages as assistant-ui's own parts, so its thread groups and shows them as it does any agent's: each stage
 * is a reasoning part, and what it did (a tool it called, the question it writes) a tool call. A call still going
 * has no result yet, so it shows as running. The tool's raw arguments never reach the page.
 */
export function stageParts(stages: readonly AiTraceStage[]): Part[] {
  return stages.flatMap((stage): Part[] => [
    { type: 'reasoning', text: stageText(stage) },
    ...(stage.items ?? []).map(
      (item): Part => ({
        type: 'tool-call',
        toolCallId: item.id,
        toolName: item.label,
        args: {},
        argsText: '',
        ...(item.state === 'running' && stage.state === 'running' ? {} : { result: item.detail || 'Xong' }),
      })
    ),
  ])
}

/** The steps of an ask reply read back from the server, one line each, as finished tool calls. */
export function traceParts(lines: readonly string[]): Part[] {
  return lines.map(
    (line, index): Part => {
      const [name, ...detail] = line.split(' · ')
      return {
        type: 'tool-call',
        toolCallId: `trace-${index}`,
        toolName: name,
        args: {},
        argsText: '',
        result: detail.join(' · ') || 'Xong',
      }
    }
  )
}
