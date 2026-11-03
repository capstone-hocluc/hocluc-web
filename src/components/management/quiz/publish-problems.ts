const MAX_RANGES = 6

/** [3, 4, 5, 9] -> ['3–5', '9'] */
function toRanges(numbers: number[]): string[] {
  const sorted = [...new Set(numbers)].sort((a, b) => a - b)
  const ranges: string[] = []
  for (let index = 0; index < sorted.length;) {
    let end = index
    while (sorted[end + 1] === sorted[end] + 1) end++
    ranges.push(end > index ? `${sorted[index]}–${sorted[end]}` : String(sorted[index]))
    index = end + 1
  }
  return ranges
}

function questionList(numbers: number[]) {
  const ranges = toRanges(numbers)
  const shown = ranges.slice(0, MAX_RANGES).join(', ')
  return `Câu ${shown}${ranges.length > MAX_RANGES ? ` và ${ranges.length - MAX_RANGES} nhóm khác` : ''}`
}

const QUESTION_REASONS: [RegExp, string][] = [
  [/^no correct option/, 'chưa có đáp án đúng'],
  [/^fewer than 2 options/, 'có ít hơn 2 lựa chọn'],
  [/^needs review/, 'cần rà soát'],
]

/**
 * The server lists what blocks publishing as "q12: no correct option" per question, which for a 120-question paper
 * is 120 entries of English. This groups them by reason and writes them as one Vietnamese sentence per reason.
 */
export function describePublishProblems(problems: readonly string[] | null | undefined): string {
  const byReason = new Map<string, number[]>()
  const others: string[] = []
  for (const problem of problems ?? []) {
    const [key = '', ...rest] = problem.split(': ')
    const message = rest.join(': ')
    const question = /^q(\d+)$/.exec(key)
    const reason = question ? QUESTION_REASONS.find(([pattern]) => pattern.test(message))?.[1] : undefined
    if (question && reason) byReason.set(reason, [...(byReason.get(reason) ?? []), Number(question[1])])
    else if (key === 'questions') others.push('chưa có câu hỏi nào')
    else if (key === 'course') others.push('cần gắn khóa học cho đề thi')
    else if (key === 'marks') others.push(`điểm chưa hợp lệ (${message})`)
    else if (problem.trim()) others.push(problem.trim())
  }
  return [
    ...[...byReason].map(([reason, numbers]) => `${questionList(numbers)} ${reason}`),
    ...others,
  ].join('; ')
}
