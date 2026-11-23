import { useState } from 'react'
import { usePageResource } from '../../../hooks/usePageResource'
import type { CourseQuizType } from '../../../lib/quiz-types'
import { getQuizChapterLessons, getQuizCourseChapters, getQuizCourses } from '../../../services/quizCourseService'
import { getResourceErrorMessage } from './quiz-form-errors'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const FAILED = ['error', 'forbidden', 'not-found']

/**
 * Where a new course quiz goes: its type, then a course, a chapter and (except for a chapter quiz) a lesson.
 * A course in the route is picked to start with; a choice that no longer fits its parent is dropped.
 */
export function useQuizTarget(routeCourse: string) {
  const routeCourseId = UUID_PATTERN.test(routeCourse) ? routeCourse : ''
  const [type, setType] = useState<CourseQuizType>('QUICK')
  const [courseId, setCourseId] = useState<string | null>(null)
  const [chapterId, setChapterId] = useState('')
  const [lessonId, setLessonId] = useState('')

  const courses = usePageResource(() => getQuizCourses(), [])
  const activeCourseId = courseId ?? routeCourseId
  const courseDetail = usePageResource(
    () => activeCourseId ? getQuizCourseChapters(activeCourseId) : Promise.resolve(null), [activeCourseId])
  const activeCourse = courseDetail.status === 'ready' && courseDetail.data?.id === activeCourseId ? courseDetail.data : null

  const courseOptions = (courses.data ?? []).map((item) => ({ id: item.id, label: item.title }))
  if (routeCourseId && activeCourseId === routeCourseId && activeCourse && !courseOptions.some((option) => option.id === routeCourseId)) {
    courseOptions.unshift({ id: routeCourseId, label: activeCourse.title })
  }
  const chapters = activeCourse?.chapters ?? []
  const effectiveChapterId = chapters.some((chapter) => chapter.id === chapterId) ? chapterId : ''
  const needsLesson = type !== 'CHAPTER'
  const chapterLessons = usePageResource(() => needsLesson && effectiveChapterId
    ? getQuizChapterLessons(effectiveChapterId) : Promise.resolve(null), [needsLesson, effectiveChapterId])
  const lessons = chapterLessons.status === 'ready' && chapterLessons.data?.chapterId === effectiveChapterId ? chapterLessons.data.lessons : []
  const effectiveLessonId = lessons.some((lesson) => lesson.id === lessonId) ? lessonId : ''

  return {
    type,
    needsLesson,
    complete: Boolean(activeCourseId && effectiveChapterId && (!needsLesson || effectiveLessonId)),
    /** The part of the create request that says where the quiz goes. */
    target: needsLesson ? { lessonId: effectiveLessonId } : { chapterId: effectiveChapterId },
    course: {
      id: activeCourseId,
      options: courseOptions,
      loading: courses.status === 'loading',
      failed: FAILED.includes(courses.status),
      error: getResourceErrorMessage(courses.status, courses.errorMessage, 'danh sách khóa học'),
      empty: courses.status === 'ready' && (courses.data?.length ?? 0) === 0,
      reload: courses.reload,
    },
    chapter: {
      id: effectiveChapterId,
      options: chapters.map((chapter) => ({ id: chapter.id, label: chapter.title })),
      loading: Boolean(activeCourseId && !activeCourse && !FAILED.includes(courseDetail.status)),
      failed: Boolean(activeCourseId && FAILED.includes(courseDetail.status)),
      error: getResourceErrorMessage(courseDetail.status, courseDetail.errorMessage, 'chương'),
      reload: courseDetail.reload,
    },
    lesson: {
      id: effectiveLessonId,
      options: lessons.map((lesson) => ({ id: lesson.id, label: lesson.title })),
      loading: Boolean(effectiveChapterId && chapterLessons.data?.chapterId !== effectiveChapterId && !FAILED.includes(chapterLessons.status)),
      failed: Boolean(effectiveChapterId && FAILED.includes(chapterLessons.status)),
      error: getResourceErrorMessage(chapterLessons.status, chapterLessons.errorMessage, 'bài học'),
      reload: chapterLessons.reload,
    },
    chooseType: (next: CourseQuizType) => {
      setType(next)
      if (next === 'CHAPTER') setLessonId('')
    },
    chooseCourse: (id: string | null) => { setCourseId(id ?? ''); setChapterId(''); setLessonId('') },
    chooseChapter: (id: string | null) => { setChapterId(id ?? ''); setLessonId('') },
    chooseLesson: (id: string | null) => setLessonId(id ?? ''),
  }
}
