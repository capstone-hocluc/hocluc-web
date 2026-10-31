import type { ExamSession } from '../../../services/examYearService'

/** A sample paper is published before any sitting and has no exam date, so it is not a session of the exam year. */
export const SAMPLE_ROUND = 'DE_MAU'

/** The round choices of a paper: the year's sittings, the sample paper, and the paper's current value if it is neither. */
export function examRoundOptions(sessions: Pick<ExamSession, 'roundNo' | 'name'>[], current: string) {
  const options = [
    ...sessions.map(session => ({ id: `DOT_${session.roundNo}`, label: session.name })),
    { id: SAMPLE_ROUND, label: 'Đề mẫu' },
  ]
  if (current && !options.some(item => item.id === current)) options.push({ id: current, label: examRoundLabel(current) })
  return options
}

/** "DOT_2" reads "Đợt 2", the sample paper "Đề mẫu"; anything else is shown as typed. */
export function examRoundLabel(round: string) {
  if (round === SAMPLE_ROUND) return 'Đề mẫu'
  const sitting = round.match(/^DOT_(\d+)$/)
  return sitting ? `Đợt ${sitting[1]}` : round
}
