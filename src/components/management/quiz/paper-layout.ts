/** Visible length of an option: LaTeX commands and braces print far shorter than they are written. */
function printedLength(text: string) {
  return text
    .replace(/\\[a-zA-Z]+/g, 'x')
    .replace(/[{}$^_\\]/g, '')
    .trim().length
}

/** Options sit four to a line when short, two when medium, one each when long - as on the printed paper. */
export function optionColumns(options: { text: string }[]): 1 | 2 | 4 {
  const longest = Math.max(0, ...options.map(option => printedLength(option.text)))
  if (options.length === 4 && longest <= 18) return 4
  if (longest <= 42) return 2
  return 1
}

/** The heading over questions that share a passage, as the printed paper words it. */
export function sharedHeading(first: number, last: number) {
  return first === last
    ? `Dựa vào thông tin dưới đây để trả lời câu ${first}`
    : `Dựa vào thông tin dưới đây để trả lời các câu từ ${first} đến ${last}`
}
