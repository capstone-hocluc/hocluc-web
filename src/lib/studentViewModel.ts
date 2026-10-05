import {
  dashboardSummary,
  learningProfile as dashboardCompetency,
  recentLesson as mockRecentLesson,
} from '../data/studentDashboard'
import { learningProfilePage, type LearningProfileData } from '../data/learningProfile'
import type { CourseStudy, MyCourseEnrollment } from '../services/courseService'
import type { PlacementResult } from '../services/assessmentService'
import type { StudentApiSnapshot } from '../services/studentService'
import type { UserProfile } from '../services/userService'
import type { LessonDetail } from '../services/lessonService'
import { findFirstLesson } from '../components/student/course/studyUtils'
import { formatExamLabel, prettifyEnum } from './courseFormat'
import { bySequence } from './sequence'

// Field-level merge of real API data over the prototype data in data/*.ts.
// Rule: a field the backend provides comes from the API; a field the backend
// has no endpoint for keeps its mock value so the UI stays complete.
// Look for "MOCK" comments below to find what is still waiting for a backend.

const clampPercent = (value?: number) => Math.max(0, Math.min(100, value ?? 0))

function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase().trim()
}

function categoryFor(title: string, result: PlacementResult | null) {
  if (!result) return undefined
  const wanted = normalize(title)
  return result.categories.find((category) => {
    const name = normalize(category.categoryName)
    return name === wanted || name.includes(wanted) || wanted.includes(name)
  })
}

function completedLessonsOf(studies: Record<string, CourseStudy>) {
  return Object.values(studies).reduce((sum, study) => sum + (study.completedLessons ?? 0), 0)
}

// The API has no "last opened course": a course already in progress first,
// else the first one not yet finished.
export function pickContinueEnrollment(enrollments: MyCourseEnrollment[]) {
  const unfinished = enrollments.filter((item) => clampPercent(item.progressPercentage) < 100)
  return (
    unfinished.find((item) => clampPercent(item.progressPercentage) > 0) || unfinished[0] || null
  )
}

// ---------------------------------------------------------------- dashboard

export interface DashboardCourse {
  id: string
  title: string
  category: string
  /** Text under the cover, e.g. "Đã học 4/12 bài học". */
  progress: string
  /** Value next to the trophy. */
  score: string
}

export interface DashboardRecentLesson {
  lessonNo: string
  title: string
  course: string
  meta: string
  score: string
  courseId: string
  lessonId: string | null
}

export interface DashboardDimension {
  title: string
  current: number | string
  predicted: number | string
  target: number | string
}

export function buildDashboardViewModel(api: StudentApiSnapshot) {
  const { enrollments, studies, placement } = api

  // API: /courses/my (+ /courses/{id}/study for lesson counts)
  const courses: DashboardCourse[] = enrollments.map((item) => {
    const study = studies[item.course.id]
    const percent = clampPercent(item.progressPercentage)
    const learned = study?.completedLessons ?? 0
    return {
      id: item.course.id,
      title: item.course.title,
      category:
        formatExamLabel(item.course.targetExam) || prettifyEnum(item.course.track) || 'Khóa học',
      progress: study
        ? learned > 0
          ? `Đã học ${learned}/${study.totalLessons} bài học`
          : 'Chưa học'
        : percent > 0
          ? `Đã học ${percent}%`
          : 'Chưa học',
      // No per-course score endpoint: this slot shows the backend's learning progress.
      score: `${percent}%`,
    }
  })

  // API: continue-lesson of the course being studied. Only the "x/y câu đúng" score is MOCK.
  let recentLesson: DashboardRecentLesson | null = null
  const continueEnrollment = pickContinueEnrollment(enrollments)
  const continueStudy = continueEnrollment ? studies[continueEnrollment.course.id] : undefined
  if (continueEnrollment && continueStudy) {
    const lessons = bySequence(continueStudy.phases).flatMap((phase) =>
      bySequence(phase.sections).flatMap((section) =>
        bySequence(section.chapters).flatMap((chapter) => bySequence(chapter.lessons))
      )
    )
    const target =
      lessons.find((lesson) => lesson.id === continueStudy.continueLessonId) ||
      findFirstLesson(continueStudy.phases)
    if (target) {
      recentLesson = {
        lessonNo: String(lessons.findIndex((lesson) => lesson.id === target.id) + 1).padStart(
          2,
          '0'
        ),
        title: target.title,
        course: continueStudy.title,
        meta: `${continueStudy.completedLessons}/${continueStudy.totalLessons} bài học`,
        score: mockRecentLesson.score, // MOCK: no lesson score endpoint
        courseId: continueEnrollment.course.id,
        lessonId: target.id,
      }
    }
  }

  // The four competency rows are the original UI. API: "current" comes from the
  // placement result category with the same subject name. MOCK (no endpoint):
  // predicted / target, and "current" for subjects the result does not cover.
  const dimensions: DashboardDimension[] = dashboardCompetency.dimensions.map((row) => {
    const category = categoryFor(row.title, placement)
    return {
      title: row.title,
      current: category ? Math.round(category.percentage) : row.current,
      predicted: row.predicted,
      target: row.target,
    }
  })

  const summary = {
    ...dashboardSummary, // MOCK: studyTime, completedTests, bestScore, currentStreak
    completedLessons: completedLessonsOf(studies), // API
  }

  return { courses, recentLesson, dimensions, summary }
}

export type DashboardViewModel = ReturnType<typeof buildDashboardViewModel>

// ---------------------------------------------------------- learning profile

export function buildLearningProfileViewModel(
  api: StudentApiSnapshot,
  user: UserProfile | null
): LearningProfileData {
  const { enrollments, studies, placement } = api
  const mock = learningProfilePage
  const student = user?.studentProfile

  // API: per-category accuracy from the placement result, matched by subject name.
  const accuracyByKey: Record<string, number> = {}
  mock.components.forEach((component) => {
    const category = categoryFor(component.name, placement)
    if (category) accuracyByKey[component.key] = Math.round(category.percentage)
  })
  const components = mock.components.map((component) =>
    component.key in accuracyByKey
      ? { ...component, accuracy: accuracyByKey[component.key] }
      : component
  )

  const strengths = placement?.strongCategoryName
    ? [placement.strongCategoryName]
    : student?.selfReportedStrongCategoryName
      ? [student.selfReportedStrongCategoryName]
      : mock.strengths
  const improvements = placement?.weakCategoryName
    ? [placement.weakCategoryName]
    : student?.selfReportedWeakCategoryName
      ? [student.selfReportedWeakCategoryName]
      : mock.improvements

  return {
    ...mock,
    // API: current user / student profile
    exam: student?.targetExam ? formatExamLabel(student.targetExam) : mock.exam,
    targetScore: student?.targetScore ?? mock.targetScore,
    // MOCK: currentScore / latestScore / scoreAttempts stay mock on purpose. The UI
    // is on the 0-1200 DGNL scale and the scale of the backend's placement `score`
    // is not documented, so mapping it could show wrong numbers. Needs BE confirmation.
    components,
    weeklyAccuracy: mock.weeklyAccuracy.map((item) =>
      item.key in accuracyByKey ? { ...item, accuracy: accuracyByKey[item.key] } : item
    ),
    strengths,
    improvements,
    // API: /courses/my
    courseProgress: enrollments.map((item) => {
      const percent = clampPercent(item.progressPercentage)
      return {
        name: item.course.title,
        progress: percent,
        status: percent >= 100 ? 'Hoàn thành' : percent > 0 ? 'Đang học' : 'Chưa bắt đầu',
      }
    }),
    // API: lessons completed (sum over /courses/{id}/study); the other metrics are MOCK
    learningMetrics: mock.learningMetrics.map((metric) =>
      metric.key === 'lessons' ? { ...metric, value: String(completedLessonsOf(studies)) } : metric
    ),
    // MOCK (no endpoint): comparisonRanges, practiceAttempts, learningHistory, practiceOverview,
    // practiceStats, recommendations, practiceAiAnalysis, teacherFeedback, aiAnalysisHistory,
    // achievements, activityFrequency, learningAccuracyPeriods
  }
}

// ------------------------------------------------------------ video learning

const lessonStatusToActivity: Record<string, string> = {
  COMPLETED: 'completed',
  IN_PROGRESS: 'in-progress',
}

export interface VideoActivity {
  id: string
  title: string
  type: string
  status: string
  duration: string
  videoUrl?: string | null
}

export interface VideoLessonItem {
  activity: VideoActivity
  chapterTitle: string
  subjectTitle: string
}

// Same shape the prototype player reads from data/courseLookup, built from real
// data: GET /lessons/{id} (title, video, duration, previous/next) and
// GET /courses/{id}/study (course title + lesson list for the drawer).
// The AI panel and the fake controls stay prototype (no backend for them).
export function buildRealVideoSource(lesson: LessonDetail, study: CourseStudy) {
  const items: VideoLessonItem[] = bySequence(study.phases).flatMap((phase) =>
    bySequence(phase.sections).flatMap((section) =>
      bySequence(section.chapters).flatMap((chapter) =>
        bySequence(chapter.lessons).map((item) => ({
          activity: {
            id: item.id,
            title: item.title,
            type: item.contentType === 'VIDEO' ? 'Video' : 'Bài học',
            status: lessonStatusToActivity[item.status] || 'available',
            duration: `${Math.max(1, Math.round((item.durationSeconds || 0) / 60))} phút`,
          },
          chapterTitle: chapter.title,
          subjectTitle: section.title,
        }))
      )
    )
  )
  const found = items.find((item) => item.activity.id === lesson.id)
  const current: VideoLessonItem = {
    chapterTitle: lesson.chapterTitle || found?.chapterTitle || '',
    subjectTitle: lesson.sectionCourseTitle || found?.subjectTitle || '',
    activity: {
      ...(found?.activity ?? { id: lesson.id, status: 'available' }),
      title: lesson.title,
      type: lesson.contentType === 'VIDEO' ? 'Video' : 'Bài học',
      duration: `${Math.max(1, Math.round((lesson.durationSeconds || 0) / 60))} phút`,
    },
  }
  const byId = (id: string | null) => items.find((item) => item.activity.id === id) || null
  return {
    lesson,
    context: { ...current, course: { title: study.title } },
    lessons: items,
    adjacent: { previous: byId(lesson.previousLessonId), next: byId(lesson.nextLessonId) },
  }
}
