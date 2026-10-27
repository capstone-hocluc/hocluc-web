const PRINTING = 'printing-quiz-paper'

/** Opens the print dialog for the quiz paper on screen ("Lưu dưới dạng PDF" saves it); other pages keep printing as they are. */
export function printQuizPaper() {
  const root = document.documentElement
  root.classList.add(PRINTING)
  window.addEventListener('afterprint', () => root.classList.remove(PRINTING), { once: true })
  window.print()
}
