// Single source of truth for Student Area URLs: builders (used everywhere a
// path used to be concatenated by hand), a parser (used by StudentRoutes to
// pick the page), and legacy-URL normalisation.
//
//   /student/dashboard | learning-profile | profile
//   /student/courses[/:courseId[/study[/lessons/:lessonId] | /:activityType/:activityId]]
//   /student/assessments/quizzes/:quizId[/attempts/:attemptId]
//   /student/assessments/attempts/:attemptId/review
//   /student/assessments/placement[/result | /attempts/:attemptId[/review]]

const enc = encodeURIComponent

export const studentRoutes = {
  dashboard: () => '/student/dashboard',
  schedule: () => '/student/schedule',
  learningProfile: () => '/student/learning-profile',
  profile: (section?: 'student') =>
    section ? `/student/profile?section=${enc(section)}` : '/student/profile',
  courses: () => '/student/courses',
  courseDetail: (courseId: string) => `/student/courses/${enc(courseId)}`,
  courseStudy: (courseId: string) => `/student/courses/${enc(courseId)}/study`,
  lesson: (courseId: string, lessonId: string) =>
    `/student/courses/${enc(courseId)}/study/lessons/${enc(lessonId)}`,
  activity: (courseId: string, activityType: string, activityId: string) =>
    `/student/courses/${enc(courseId)}/${enc(activityType)}/${enc(activityId)}`,
  quiz: (quizId: string) => `/student/assessments/quizzes/${enc(quizId)}`,
  quizAttempt: (quizId: string, attemptId: string) =>
    `/student/assessments/quizzes/${enc(quizId)}/attempts/${enc(attemptId)}`,
  attemptReview: (attemptId: string) => `/student/assessments/attempts/${enc(attemptId)}/review`,
  placement: () => '/student/assessments/placement',
  placementResult: () => '/student/assessments/placement/result',
  placementAttempt: (attemptId: string) =>
    `/student/assessments/placement/attempts/${enc(attemptId)}`,
  placementReview: (attemptId: string) =>
    `/student/assessments/placement/attempts/${enc(attemptId)}/review`,
}

export type StudentRoute =
  | { name: 'dashboard' }
  | { name: 'schedule' }
  | { name: 'learning-profile' }
  | { name: 'profile' }
  | { name: 'courses' }
  | { name: 'course-detail'; courseId: string }
  | { name: 'course-study'; courseId: string }
  | { name: 'lesson'; courseId: string; lessonId: string }
  | { name: 'activity'; courseId: string; activityType: string; activityId: string }
  | { name: 'quiz'; quizId: string }
  | { name: 'quiz-attempt'; quizId: string; attemptId: string }
  | { name: 'attempt-review'; attemptId: string }
  | { name: 'placement' }
  | { name: 'placement-result' }
  | { name: 'placement-attempt'; attemptId: string }
  | { name: 'placement-review'; attemptId: string }

function segmentsOf(path: string) {
  return path.split('?')[0].split('/').filter(Boolean).map(decodeURIComponent)
}

// Old public URLs that now live inside the Student Area:
//   /courses/:id/study[/lessons/:lid]  ->  /student/courses/...
//   /assessments/...                   ->  /student/assessments/...
// /courses/:id (public course detail) is deliberately NOT mapped.
export function toStudentPath(path: string) {
  const parts = path.split('/').filter(Boolean)
  const isLegacyStudy =
    parts[0] === 'courses' &&
    parts[2] === 'study' &&
    (parts.length === 3 || (parts.length === 5 && parts[3] === 'lessons'))
  if (isLegacyStudy || parts[0] === 'assessments') return `/student/${parts.join('/')}`
  return path
}

export function isStudentPath(path: string) {
  const [root] = segmentsOf(path)
  return root === 'student'
}

// Returns null for anything that isn't a known Student Area URL.
export function parseStudentRoute(path: string): StudentRoute | null {
  const [root, area, a, b, c, d] = segmentsOf(path)
  const rest = segmentsOf(path).slice(2)
  if (root !== 'student') return null

  switch (area) {
    case 'dashboard':
      return rest.length === 0 ? { name: 'dashboard' } : null
    case 'schedule':
      return rest.length === 0 ? { name: 'schedule' } : null
    case 'learning-profile':
      return rest.length === 0 ? { name: 'learning-profile' } : null
    case 'profile':
      return rest.length === 0 ? { name: 'profile' } : null
    case 'courses': {
      if (rest.length === 0) return { name: 'courses' }
      const courseId = a
      if (rest.length === 1) return { name: 'course-detail', courseId }
      if (b === 'study') {
        if (rest.length === 2) return { name: 'course-study', courseId }
        if (rest.length === 4 && c === 'lessons') return { name: 'lesson', courseId, lessonId: d }
        return null
      }
      if (rest.length === 3) return { name: 'activity', courseId, activityType: b, activityId: c }
      return null
    }
    case 'assessments': {
      if (a === 'quizzes' && rest.length === 2) return { name: 'quiz', quizId: b }
      if (a === 'quizzes' && rest.length === 4 && c === 'attempts')
        return { name: 'quiz-attempt', quizId: b, attemptId: d }
      if (a === 'attempts' && rest.length === 3 && c === 'review')
        return { name: 'attempt-review', attemptId: b }
      if (a === 'placement') {
        if (rest.length === 1) return { name: 'placement' }
        if (rest.length === 2 && b === 'result') return { name: 'placement-result' }
        if (rest.length === 3 && b === 'attempts')
          return { name: 'placement-attempt', attemptId: c }
        if (rest.length === 4 && b === 'attempts' && d === 'review')
          return { name: 'placement-review', attemptId: c }
      }
      return null
    }
    default:
      return null
  }
}
