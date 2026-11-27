import { useState } from 'react'
import { ApiError } from '../../../lib/api'
import { COURSE_QUIZ_TYPES, isCourseQuizType, quizRequirement } from '../../../lib/quiz-types'
import { createTeacherQuiz, type TeacherQuizRecord } from '../../../services/teacherQuizService'
import Button from '../../console/button'
import ConsoleDialog from '../../console/dialog'
import DropdownField from '../../console/dropdown-field'
import { fieldControlClass } from '../../console/form-field'
import Notice from '../../console/notice'
import SelectField from '../../console/select-field'
import MoreSettings from './MoreSettings'
import QuizAnswerReviewSetting from './QuizAnswerReviewSetting'
import { formatApiError, isAmbiguousCreateFailure, mapTeacherQuizValidationErrors, type QuizFieldError } from './quiz-form-errors'
import { useQuizTarget } from './use-quiz-target'

/** One retryable load inside the dialog: its message and a retry button. */
function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <span className="flex flex-wrap items-center gap-2 text-xs font-normal text-badge-error-text" role="alert">
      {message}
      <Button appearance="ghost" size="sm" onClick={onRetry}>Thử lại</Button>
    </span>
  )
}

/**
 * Makes a lesson or chapter quiz draft from where it goes and its name, then hands it to the question editor. Type and
 * place cannot change afterwards. A request with no clear answer is not sent again from here.
 */
export default function QuizCreateDialog({ routeCourseId, onClose, onCreated }: {
  routeCourseId: string
  onClose: () => void
  onCreated: (quiz: TeacherQuizRecord) => void
}) {
  const target = useQuizTarget(routeCourseId)
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState('30')
  const [attempts, setAttempts] = useState('1')
  const [showAnswers, setShowAnswers] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<QuizFieldError, string>>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [ambiguous, setAmbiguous] = useState(false)
  const locked = busy || ambiguous

  const clear = (field: QuizFieldError) => {
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setError('')
  }

  const create = async () => {
    if (locked) return
    const durationMinutes = Number(duration)
    const maxAttempts = Number(attempts)
    const problems: Partial<Record<QuizFieldError, string>> = {}
    if (!target.complete) problems.target = target.needsLesson ? 'Chọn khóa học, chương và bài học.' : 'Chọn khóa học và chương.'
    if (!title.trim()) problems.title = 'Nhập tên bài kiểm tra.'
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 600) problems.duration = 'Thời gian làm bài phải từ 1 đến 600 phút.'
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 999) problems.attempts = 'Số lần làm tối đa phải từ 1 đến 999.'
    if (Object.keys(problems).length > 0) {
      setFieldErrors(problems)
      setError(problems.duration || problems.attempts ? 'Kiểm tra lại phần Thêm thiết lập.' : '')
      return
    }
    setBusy(true)
    setFieldErrors({})
    setError('')
    try {
      onCreated(await createTeacherQuiz({ type: target.type, ...target.target, title: title.trim(), durationMinutes, maxAttempts, showAnswers }))
    } catch (createError) {
      if (isAmbiguousCreateFailure(createError)) {
        setAmbiguous(true)
        setError('Máy chủ có thể đã tạo bài kiểm tra nhưng phản hồi bị gián đoạn. Đừng tạo lại; hãy đóng hộp thoại và kiểm tra danh sách trước.')
        return
      }
      const validation = createError instanceof ApiError ? mapTeacherQuizValidationErrors(createError.errors ?? {}) : { fields: {}, unmapped: [] }
      setFieldErrors(validation.fields)
      setError(validation.unmapped.length > 0 || Object.keys(validation.fields).length === 0 ? formatApiError(createError) : '')
    } finally {
      setBusy(false)
    }
  }

  const fieldError = (field: QuizFieldError) => fieldErrors[field] &&
    <span className="text-sm font-medium text-badge-error-text" role="alert">{fieldErrors[field]}</span>

  return (
    <ConsoleDialog open onClose={onClose} dismissable={!busy} maxWidth={640} title="Tạo bài kiểm tra"
      onSubmit={() => void create()}
      footer={<>
        <Button appearance="outline" onClick={onClose} disabled={busy}>{ambiguous ? 'Đóng' : 'Hủy'}</Button>
        <Button type="submit" disabled={locked}>{busy ? 'Đang tạo...' : 'Tạo và soạn câu hỏi'}</Button>
      </>}>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
          Loại bài kiểm tra
          <SelectField ariaLabel="Loại bài kiểm tra" options={COURSE_QUIZ_TYPES} value={target.type} disabled={locked}
            onChange={(value) => { if (isCourseQuizType(value)) { target.chooseType(value); clear('target') } }} />
          <span className="text-xs font-normal text-text-tertiary">{quizRequirement(target.type)}</span>
        </label>
        <div className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
          <span>Khóa học</span>
          <DropdownField ariaLabel="Khóa học" placeholder="Chọn khóa học" options={target.course.options} value={target.course.id || null}
            isSearchable isLoading={target.course.loading} isError={target.course.failed} errorMessage={target.course.error}
            emptyMessage="Không có khóa học khả dụng." mobileTouchTargets isDisabled={locked} isInvalid={Boolean(fieldErrors.target)}
            onChange={(value) => { target.chooseCourse(value); clear('target') }} />
          {target.course.failed && <LoadError message={target.course.error} onRetry={target.course.reload} />}
        </div>
        <div className={target.needsLesson ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4'}>
          <div className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
            <span>Chương</span>
            <DropdownField ariaLabel="Chương" placeholder="Chọn chương" options={target.chapter.options} value={target.chapter.id || null}
              isSearchable isLoading={target.chapter.loading} isError={target.chapter.failed} errorMessage={target.chapter.error}
              emptyMessage="Khóa học chưa có chương." mobileTouchTargets isDisabled={!target.course.id || locked}
              isInvalid={Boolean(fieldErrors.target)} onChange={(value) => { target.chooseChapter(value); clear('target') }} />
            {target.chapter.failed && <LoadError message={target.chapter.error} onRetry={target.chapter.reload} />}
          </div>
          {target.needsLesson && (
            <div className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
              <span>Bài học</span>
              <DropdownField ariaLabel="Bài học" placeholder="Chọn bài học" options={target.lesson.options} value={target.lesson.id || null}
                isSearchable isLoading={target.lesson.loading} isError={target.lesson.failed} errorMessage={target.lesson.error}
                emptyMessage="Chương chưa có bài học." mobileTouchTargets isDisabled={!target.chapter.id || locked}
                isInvalid={Boolean(fieldErrors.target)} onChange={(value) => { target.chooseLesson(value); clear('target') }} />
              {target.lesson.failed && <LoadError message={target.lesson.error} onRetry={target.lesson.reload} />}
            </div>
          )}
        </div>
        {fieldError('target')}
        <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
          Tên bài kiểm tra
          <input className={`${fieldControlClass} aria-invalid:border-input-error-focus-border`} value={title} maxLength={500} disabled={locked}
            aria-invalid={fieldErrors.title ? true : undefined} onChange={(event) => { setTitle(event.target.value); clear('title') }} />
          {fieldError('title')}
        </label>
        <MoreSettings label="Thêm thiết lập (thời gian, lượt làm, đáp án)">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
              Thời gian (phút)
              <input className={fieldControlClass} type="number" min="1" max="600" value={duration} disabled={locked}
                aria-invalid={fieldErrors.duration ? true : undefined} onChange={(event) => { setDuration(event.target.value); clear('duration') }} />
              {fieldError('duration')}
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
              Số lần làm tối đa
              <input className={fieldControlClass} type="number" min="1" max="999" value={attempts} disabled={locked}
                aria-invalid={fieldErrors.attempts ? true : undefined} onChange={(event) => { setAttempts(event.target.value); clear('attempts') }} />
              {fieldError('attempts')}
            </label>
          </div>
          <QuizAnswerReviewSetting enabled={showAnswers} onChange={setShowAnswers} disabled={locked} />
        </MoreSettings>
        {error && <Notice tone={ambiguous ? 'warning' : 'danger'} role="alert">{error}</Notice>}
      </div>
    </ConsoleDialog>
  )
}
