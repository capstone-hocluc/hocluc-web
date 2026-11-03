/** Words that ask to change a question rather than to compose new ones. */
const EDIT_WORDS = /(?<!\p{L})(sửa|chỉnh|viết lại|làm lại|soạn lại|tạo lại|đổi|thay|cập nhật)(?!\p{L})/iu
/** "câu 2", "câu 3, 5 và 7", "câu 4-6", "câu 4 đến câu 6": the questions named, never "10 câu" (a count). */
const QUESTION_LIST = /câu\s+(\d{1,3}(?:\s*(?:,|;|&|và|hoặc|-|–|đến|tới)\s*(?:câu\s+)?\d{1,3})*)/giu
const RANGE = /^(\d{1,3})\s*(?:-|–|đến|tới)\s*(?:câu\s+)?(\d{1,3})$/iu
const MAX_RANGE = 20

/**
 * The question numbers a request asks to change ("Sửa câu 2 cho khó hơn", "Viết lại câu 3 và câu 5"), in the order
 * named and without repeats; null when it does not ask to change a numbered question.
 */
export function revisedNumbers(text: string): number[] | null {
  if (!EDIT_WORDS.test(text)) return null
  const numbers: number[] = []
  for (const match of text.matchAll(QUESTION_LIST)) {
    for (const piece of match[1].split(/\s*(?:,|;|&|và|hoặc)\s*/iu)) {
      const value = piece.replace(/^câu\s+/iu, '').trim()
      const range = RANGE.exec(value)
      if (range) {
        const [from, to] = [Number(range[1]), Number(range[2])]
        if (to >= from && to - from < MAX_RANGE) for (let number = from; number <= to; number++) numbers.push(number)
      } else if (/^\d+$/u.test(value)) {
        numbers.push(Number(value))
      }
    }
  }
  const unique = [...new Set(numbers.filter((number) => number > 0))]
  return unique.length > 0 ? unique : null
}
