import {
  addTeacherQuizQuestions,
  deleteTeacherQuizQuestion,
  reorderTeacherQuizQuestions,
  setTeacherQuizLayout,
  updateTeacherQuizQuestion,
  type TeacherQuizEditor,
} from '../../../services/teacherQuizService'
import type { DraftSection } from './exam-draft'
import {
  existingLayoutSpecs,
  questionHasAnyContent,
  questionPayload,
  questionPayloadMatchesServer,
  sameLayout,
  sectionLayoutSpecs,
} from './quiz-editor-draft'

export async function saveQuizQuestions(
  original: TeacherQuizEditor,
  sections: DraftSection[],
  canEditStructure: boolean,
  onCreated: (sections: DraftSection[]) => void,
) {
  const quizId = original.quiz.id
  const activeSections = sections
    .filter((section) => section.title.trim() || section.questions.some(questionHasAnyContent))
    .map((section) => ({
      ...section,
      questions: section.questions.filter(questionHasAnyContent),
    }))
  const finalQuestionDrafts = activeSections.flatMap((section) => section.questions)
  const retainedIds = new Set(finalQuestionDrafts.map((question) => question.serverId).filter(Boolean))
  const previousById = new Map(original.questions.map((question) => [question.id, question]))

  if (canEditStructure) {
    for (const serverQuestion of original.questions) {
      if (!retainedIds.has(serverQuestion.id)) await deleteTeacherQuizQuestion(serverQuestion.id)
    }
  }

  for (const question of finalQuestionDrafts) {
    if (!question.serverId || !question.editable) continue
    const previous = previousById.get(question.serverId)
    if (!previous || questionPayloadMatchesServer(question, previous)) continue
    await updateTeacherQuizQuestion(question.serverId, {
      ...questionPayload(question),
      ...(previous.sectionId ? { sectionId: previous.sectionId } : {}),
      ...(previous.groupId ? { groupId: previous.groupId } : {}),
    })
  }

  if (!canEditStructure) return

  const newQuestions = finalQuestionDrafts.filter((question) => !question.serverId)
  let workingSections = activeSections
  if (newQuestions.length > 0) {
    const createdQuestions = await addTeacherQuizQuestions(
      quizId,
      newQuestions.map(questionPayload)
    )
    const newIds = new Map<string, string>()
    for (const [index, draft] of newQuestions.entries()) {
      const createdQuestion = createdQuestions[index]
      if (createdQuestion) newIds.set(draft.clientId, createdQuestion.id)
    }
    workingSections = activeSections.map((section) => ({
      ...section,
      questions: section.questions.map((question) => {
        const id = newIds.get(question.clientId)
        return id ? { ...question, clientId: id, serverId: id } : question
      }),
    }))
    onCreated(workingSections)
  }

  const finalServerQuestions = workingSections.flatMap((section) => section.questions)
  if (finalServerQuestions.some((question) => !question.serverId)) {
    throw new Error('Đã lưu đề nhưng chưa xác định được mã của một số câu hỏi. Tải lại đề rồi thử tiếp.')
  }
  const finalQuestionIds = finalServerQuestions.map((question) => question.serverId as string)
  const currentQuestionIds = [...original.questions]
    .sort((a, b) => a.sequence - b.sequence)
    .map((question) => question.id)
  const questionOrderChanged = finalQuestionIds.length !== currentQuestionIds.length ||
    finalQuestionIds.some((id, index) => id !== currentQuestionIds[index])
  if (questionOrderChanged && finalQuestionIds.length > 0) {
    await reorderTeacherQuizQuestions(quizId, finalQuestionIds)
  }

  const questionCounts = new Map(
    workingSections.map((section) => [section.clientId, section.questions.length])
  )
  const desiredLayout = sectionLayoutSpecs(workingSections, questionCounts)
  const previousLayout = existingLayoutSpecs(original)
  if (!sameLayout(desiredLayout, previousLayout)) await setTeacherQuizLayout(quizId, desiredLayout)
}
