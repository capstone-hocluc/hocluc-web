/** Words that ask to change a question rather than to compose new ones. */
const EDIT_WORDS = /(?<!\p{L})(sửa|chỉnh|viết lại|làm lại|làm cho|soạn lại|tạo lại|đổi|thay|cập nhật|nâng|giảm|hạ|khó hơn|dễ hơn)(?!\p{L})/iu
/**
 * "câu 2", "câu 3, 5 và 7", "câu 4-6", "câu 4 đến câu 6": the questions named. A number before "câu" is a count
 * ("10 câu 5 điểm"), so "câu" right after a number does not name one.
 */
const QUESTION_LIST = /(?<!\d\s*)câu\s+(\d{1,3}(?:\s*(?:,|;|&|và|hoặc|-|–|đến|tới)\s*(?:câu\s+)?\d{1,3})*)/giu
const RANGE = /^(\d{1,3})\s*(?:-|–|đến|tới)\s*(?:câu\s+)?(\d{1,3})$/iu
const MAX_RANGE = 20

/** "10 câu Toán", "soạn 5 câu": the count a request names; a number after "câu" is a question number, not a count. */
const COUNT = /(?<![\d\p{L}])(\d{1,3})\s*câu(?!\p{L})(?!\s*\d+(?:[.,]\d+)?(?!\s*(?:điểm|đ)(?!\p{L}))(?![.,\d]))/iu

/** How many questions the words ask for, when they say; null when they name none (or ask to change numbered ones). */
export function requestedCount(text: string): number | null {
  if (revisedNumbers(text)) return null
  const match = COUNT.exec(text)
  const count = match ? Number(match[1]) : 0
  return count > 0 ? count : null
}

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
