import { getAdminCourse, getAdminCourses, type CourseAdmin, type CourseType } from './courseAdminService'
import { getAdminChapters } from './chapterAdminService'
import { getAdminLessons } from './lessonAdminService'

/** The authenticated catalog is scoped by BE to course-instructor assignments for Teacher.
 * Staff roles have the access explicitly granted by CourseAdminService/QuizAuthorizationService.
 * Public catalog omits drafts and is never an authorization source for console quiz screens.
 */
export async function getQuizCourses(type?: CourseType): Promise<CourseAdmin[]> {
  const courses: CourseAdmin[] = []
  let page = 0
  let totalPages: number
  do {
    const result = await getAdminCourses({ type, page, size: 100 })
    courses.push(...result.content)
    totalPages = result.totalPages
    page++
  } while (page < totalPages)
  return courses
}

export async function getQuizCourseLessons(courseId: string) {
  const course = await getAdminCourse(courseId)
  const chapters = await getAdminChapters(courseId)
  const groups = await Promise.all(chapters.map(async (chapter) =>
    (await getAdminLessons(chapter.id)).map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      pathLabel: [chapter.title, lesson.title].join(' · '),
    }))
  ))
  return { id: course.id, title: course.title, lessons: groups.flat() }
}
