import type { TeacherQuizType } from '../services/teacherQuizService'

export type CourseQuizType = Extract<TeacherQuizType, 'QUICK' | 'LESSON' | 'CHAPTER'>

export const COURSE_QUIZ_TYPES: { id: CourseQuizType; label: string }[] = [
  { id: 'QUICK', label: 'Quiz nhanh' },
  { id: 'LESSON', label: 'Kiểm tra cuối bài' },
  { id: 'CHAPTER', label: 'Kiểm tra cuối chương' },
]

const LABELS: Record<TeacherQuizType, string> = {
  QUICK: 'Quiz nhanh', LESSON: 'Kiểm tra cuối bài', CHAPTER: 'Kiểm tra cuối chương',
  EXAM: 'Đề thi thử', PLACEMENT: 'Đánh giá đầu vào',
}

export function quizTypeLabel(type?: string | null) {
  return type && Object.hasOwn(LABELS, type) ? LABELS[type as TeacherQuizType] : 'Bài kiểm tra'
}

export function isCourseQuizType(type: string): type is CourseQuizType {
  return COURSE_QUIZ_TYPES.some(option => option.id === type)
}

/** Prerequisites from QuizGateService; not a mandatory/optional classification. */
export function quizRequirement(type: string) {
  switch (type) {
    case 'QUICK': return 'Không yêu cầu hoàn thành bài học trước. Học viên vẫn cần có quyền học và đáp ứng điều kiện mở bài.'
    case 'LESSON': return 'Học viên cần hoàn thành bài học được gắn trước khi làm bài kiểm tra này.'
    case 'CHAPTER': return 'Chương cần có bài học đã xuất bản. Học viên cần hoàn thành tất cả bài học đã xuất bản trong chương trước khi làm bài kiểm tra này.'
    case 'EXAM': return 'Dành cho học viên có quyền học khóa; áp dụng lịch mở và đóng nếu được cấu hình.'
    case 'PLACEMENT': return 'Bài đánh giá đầu vào, không gắn với khóa học.'
    default: return ''
  }
}
