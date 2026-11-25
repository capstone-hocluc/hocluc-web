import type { ThreadMessageLike } from '@assistant-ui/react'
import type { AiStepTimes, AiTraceStage } from '../exam-format'

type Part = Exclude<ThreadMessageLike['content'], string>[number]

/** What a stage found and changed, as the words of its reasoning; its title heads it (see `stageHeads`). */
function stageText(stage: AiTraceStage) {
  return [stage.detail, ...(stage.notes ?? [])].filter(Boolean).join('\n\n')
}

/** A stage as its disclosure heads it: which stage it is (its icon), its title, and whether it still goes on. */
export interface StageHead {
  id: string
  title: string
  running: boolean
}

/** A message's stages in the order of its reasoning parts, kept as `metadata.custom.stageHeads`. */
export function stageHeads(stages: readonly AiTraceStage[] | undefined): StageHead[] {
  return (stages ?? []).map((stage) => ({ id: stage.id, title: stage.title, running: stage.state === 'running' }))
}

/** What a call's row shows besides its label, kept as the call's `artifact`: its tool (the icon) and a short hint. */
export interface StepArtifact {
  tool?: string
  detail?: string
}

/** A step's times as assistant-ui reads them on a part; none for a step not seen starting. */
function timingOf(step: AiStepTimes) {
  if (step.startedAt === undefined) return {}
  return { timing: { startedAt: step.startedAt, ...(step.completedAt !== undefined ? { completedAt: step.completedAt } : {}) } }
}

/**
 * Each stage's share of the task: from where the stage before it stopped (from `since`, the request, for the first)
 * until it stopped itself, so the stages add up to the whole task. The server tells some stages only once they are
 * done, or a while after they began, so a stage's own start says less than where the one before it ended. A task
 * that is over (`until`, its reply) ends with its last stage, and no stage outlasts it. A stage that never ran has no
 * share.
 */
function shares(stages: readonly AiTraceStage[], since: number | undefined, until: number | undefined): AiStepTimes[] {
  // The last stage seen running: one marked done only because the run ended (stopped, failed) never ran.
  const last = stages.reduce(
    (found, stage, index) => (stage.startedAt !== undefined || stage.completedAt !== undefined ? index : found),
    -1
  )
  let from = since
  return stages.map((stage, index) => {
    const start = from ?? stage.startedAt
    const own = until !== undefined && index === last ? until : stage.completedAt
    const end = own === undefined || until === undefined ? own : Math.min(own, until)
    if (stage.state === 'pending' || start === undefined || (stage.state === 'done' && end === undefined)) return {}
    if (end !== undefined) from = end
    return { startedAt: Math.min(start, end ?? start), ...(end !== undefined ? { completedAt: end } : {}) }
  })
}

/**
 * A run's stages as assistant-ui's own parts, so its thread groups and shows them as it does any agent's: each stage
 * is a reasoning part with an id of its own (a disclosure of its own, headed by its title), and what it did (a tool it
 * called, the question it writes) a tool call. A call still going has no result yet, so it shows as running. Each
 * carries when it started and finished, for the thread to say how long it took; a stage's time is its share of the
 * task from `since`, the request, until `until`, the reply (see `shares`). The tool's raw arguments never reach the
 * page.
 */
export function stageParts(stages: readonly AiTraceStage[], since?: number, until?: number, groupCalls = true): Part[] {
  const times = shares(stages, since, until)
  return stages.flatMap((stage, index): Part[] => [
    // The title is the stage's summary: assistant-ui keeps a reasoning part with no words only when it has one.
    { type: 'reasoning', id: `stage-${index}`, text: stageText(stage), unstable_summary: stage.title, ...timingOf(times[index]) },
    ...(stage.items ?? []).map(
      (item): Part => ({
        type: 'tool-call',
        toolCallId: groupCalls ? `stage-${index}:${item.id}` : item.id,
        toolName: item.label,
        args: {},
        argsText: '',
        artifact: { tool: item.tool, detail: item.detail } satisfies StepArtifact,
        ...(item.state === 'running' && stage.state === 'running' ? {} : { result: item.detail || 'Xong' }),
        ...timingOf(item),
      })
    ),
  ])
}

/** The steps of an ask reply read back from the server, one line each, as finished tool calls. */
export function traceParts(lines: readonly string[]): Part[] {
  return lines.map(
    (line, index): Part => {
      const [name, ...rest] = line.split(' · ')
      const detail = rest.join(' · ')
      return {
        type: 'tool-call',
        toolCallId: `trace-${index}`,
        toolName: name,
        args: {},
        argsText: '',
        artifact: { detail: detail || undefined } satisfies StepArtifact,
        result: detail || 'Xong',
      }
    }
  )
}
