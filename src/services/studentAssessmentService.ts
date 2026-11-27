import { getCourseStudy, type CourseStudy, type CourseStudyQuiz, type CourseExamSummary } from './courseService'
import { getLearningProfileCourses } from './learningProfileService'
import { getFreeExams, type FreeExam } from './freeExamService'
import { getErrorMessage } from '../lib/errors'

export interface StudentAssessmentEntry {
  exam: CourseExamSummary | CourseStudyQuiz | FreeExam
  type: string
  courseIds: string[]
  courseTitles: string[]
}

export interface StudentAssessmentCatalog {
  items: StudentAssessmentEntry[]
  courses: { id: string; title: string }[]
  failures: { courseId: string; title: string; message: string }[]
}

export async function getStudentFreeAssessments(): Promise<StudentAssessmentCatalog> {
  const exams = await getFreeExams()
  const courses = new Map<string, { id: string; title: string }>()
  exams.forEach(exam => {
    if (exam.courseId) courses.set(exam.courseId, { id: exam.courseId, title: exam.courseTitle || 'Khóa học' })
  })
  return {
    items: exams.map(exam => ({ exam, type: 'PLACEMENT', courseIds: exam.courseId ? [exam.courseId] : [], courseTitles: exam.courseTitle ? [exam.courseTitle] : [] })),
    courses: [...courses.values()], failures: [],
  }
}

export async function getStudentCourseAssessments(): Promise<StudentAssessmentCatalog> {
  const courses = await getLearningProfileCourses()
  const items = new Map<string, StudentAssessmentEntry>()
  const failures: StudentAssessmentCatalog['failures'] = []
  const addStudy = (study: CourseStudy, courseId: string, courseTitle: string) => {
    const add = (exam: CourseStudyQuiz | CourseExamSummary) => {
      if (exam.type === 'PLACEMENT') return
      const existing = items.get(exam.id)
      if (existing) {
        if (!existing.courseIds.includes(courseId)) { existing.courseIds.push(courseId); existing.courseTitles.push(courseTitle) }
      } else items.set(exam.id, { exam, type: exam.type, courseIds: [courseId], courseTitles: [courseTitle] })
    }
    study.exams?.forEach(add)
    study.phases.forEach(phase => phase.sections.forEach(section => section.chapters.forEach(chapter => {
      chapter.quizzes.forEach(add)
      chapter.lessons.forEach(lesson => lesson.quizzes.forEach(add))
    })))
  }
  const knownStudies = new Map(courses.filter(course => course.study).map(course => [course.enrollment.course.id, course.study!]))
  const gifts = new Map<string, { title: string; roots: { id: string; title: string }[] }>()
  courses.forEach(({ enrollment, study, error }) => {
    const root = { id: enrollment.course.id, title: enrollment.course.title }
    if (!study) { failures.push({ courseId: root.id, title: root.title, message: error || 'Chưa tải được nội dung khóa học.' }); return }
    addStudy(study, root.id, root.title)
    study.phases.forEach(phase => phase.gifts.forEach(gift => {
      const existing = gifts.get(gift.courseId)
      if (existing) { if (!existing.roots.some(item => item.id === root.id)) existing.roots.push(root) }
      else gifts.set(gift.courseId, { title: gift.title, roots: [root] })
    }))
  })
  const giftEntries = [...gifts]
  for (let offset = 0; offset < giftEntries.length; offset += 4) {
    await Promise.all(giftEntries.slice(offset, offset + 4).map(async ([id, gift]) => {
      try {
        const study = knownStudies.get(id) ?? await getCourseStudy(id)
        gift.roots.forEach(root => addStudy(study, root.id, root.title))
      } catch (error) {
        gift.roots.forEach(root => failures.push({ courseId: root.id, title: `${root.title} · ${gift.title}`, message: getErrorMessage(error) }))
      }
    }))
  }
  return { items: [...items.values()], courses: courses.map(item => ({ id: item.enrollment.course.id, title: item.enrollment.course.title })), failures }
}
