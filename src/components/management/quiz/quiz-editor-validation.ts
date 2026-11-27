import type { TeacherQuizEditor } from '../../../services/teacherQuizService'
import { CHOICE_TYPES, type DraftSection } from './exam-draft'
import { questionHasAnyContent, questionPayloadMatchesServer } from './quiz-editor-draft'

export function quizQuestionProblem(
  sections: DraftSection[],
  original: TeacherQuizEditor,
  { publish, placement, courseQuiz, fixedStructure }: {
    publish: boolean
    placement: boolean
    courseQuiz: boolean
    fixedStructure: boolean
  },
): { message: string; questionId?: string } {
  const activeSections = sections.filter((section) => section.title.trim() || section.questions.some(questionHasAnyContent))
  const allQuestions = activeSections.flatMap((section) => section.questions.filter(questionHasAnyContent))
  const originals = new Map(original.questions.map((question) => [question.id, question]))

  for (const section of activeSections) {
    if (!section.unassigned && section.questions.some(questionHasAnyContent) && !section.title.trim()) {
      return { message: 'Đặt tên cho mỗi phần có câu hỏi.', questionId: section.clientId }
    }
  }
  for (const question of allQuestions) {
    if (!question.editable) continue
    const previous = originals.get(question.serverId)
    if (fixedStructure && previous && questionPayloadMatchesServer(question, previous)) continue
    const at = { questionId: question.clientId }
    if (!question.questionText.trim()) return { message: 'Mỗi câu hỏi cần có nội dung.', ...at }
    if (!CHOICE_TYPES.includes(question.questionType)) continue
    const options = question.options.filter((option) => option.text.trim())
    if (options.length < 2) return { message: 'Mỗi câu trắc nghiệm cần ít nhất hai lựa chọn.', ...at }
    if (courseQuiz && options.length !== question.options.length) {
      return { message: 'Điền nội dung cho mỗi lựa chọn hoặc xóa lựa chọn còn trống.', ...at }
    }
    const correct = options.filter((option) => option.correct).length
    if ((!courseQuiz || publish) && !question.needsReview && correct === 0) {
      return { message: 'Chọn ít nhất một đáp án đúng hoặc đánh dấu câu hỏi cần rà soát.', ...at }
    }
    if (question.questionType === 'SINGLE_CHOICE' && correct > 1) {
      return { message: 'Câu trắc nghiệm một đáp án chỉ được chọn một đáp án đúng.', ...at }
    }
  }
  if (publish && allQuestions.length === 0) return { message: 'Thêm ít nhất một câu hỏi trước khi xuất bản.' }
  if (placement && publish && allQuestions.some((question) => question.questionType !== 'SINGLE_CHOICE')) {
    return { message: 'Màn Student hiện chỉ làm được câu hỏi một đáp án. Cần hoàn thiện hỗ trợ loại câu hỏi khác trước khi xuất bản bài này.' }
  }
  return { message: '' }
}
