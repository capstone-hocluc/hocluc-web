import { useRef, useState } from 'react'
import { useCurrentUser } from '../../../hooks/useCurrentUser'
import { usePageResource } from '../../../hooks/usePageResource'
import type { CourseAdmin } from '../../../services/courseAdminService'
import { getQuizCourses } from '../../../services/quizCourseService'
import { createTeacherQuiz, getTeacherQuizzes, type TeacherQuizRecord } from '../../../services/teacherQuizService'
import Button from '../../console/button'
import ConsoleDialog from '../../console/dialog'
import DropdownField from '../../console/dropdown-field'
import { fieldControlClass, textareaControlClass } from '../../console/form-field'
import Notice from '../../console/notice'
import ExamRuleFields from './ExamRuleFields'
import ExamScheduleFields from './ExamScheduleFields'
import MoreSettings from './MoreSettings'
import { findPendingExamCreateCandidates, pendingExamCreate, type PendingExamCreate } from './exam-create'
import { examCreatePayload, examSettingsOf, validateExamSettings, type AssessmentType, type ExamSettings } from './exam-settings'
import { formatApiError, isAmbiguousCreateFailure } from './quiz-form-errors'

/**
 * Makes a mock exam or placement draft from its main settings, then hands it to the question editor. A request with
 * no clear answer is never sent again from here: the list is searched for its result instead.
 */
export default function ExamCreateDialog({ assessmentType, onClose, onCreated }: {
  assessmentType: AssessmentType
  onClose: () => void
  onCreated: (quiz: TeacherQuizRecord) => void
}) {
  const placement = assessmentType === 'PLACEMENT'
  const { profile: currentUser } = useCurrentUser()
  const [settings, setSettings] = useState<ExamSettings>(() => examSettingsOf(null, placement))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ambiguous, setAmbiguous] = useState(false)
  const pendingRef = useRef<PendingExamCreate | null>(null)
  const courses = usePageResource(() => placement ? Promise.resolve([] as CourseAdmin[]) : getQuizCourses('MAIN'), [placement])
  const coursesFailed = ['error', 'forbidden', 'not-found'].includes(courses.status)

  const update = <K extends keyof ExamSettings>(key: K, value: ExamSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }))
    setError('')
  }

  const create = async () => {
    if (busy || ambiguous) return
    const problem = validateExamSettings(settings, placement, null)
    if (problem) { setError(problem); return }
    setBusy(true)
    setError('')
    try {
      pendingRef.current = pendingExamCreate(assessmentType, settings, await getTeacherQuizzes(), currentUser?.id ?? null)
      let created: TeacherQuizRecord
      try {
        created = await createTeacherQuiz(examCreatePayload(settings, assessmentType))
      } catch (creationError) {
        if (!isAmbiguousCreateFailure(creationError)) throw creationError
        setAmbiguous(true)
        throw new Error('Không xác định được máy chủ đã tạo đề hay chưa. Đừng gửi tạo lại; hãy kiểm tra danh sách thủ công trước.',
          { cause: creationError })
      }
      pendingRef.current = null
      onCreated(created)
    } catch (createError) {
      setError(formatApiError(createError))
    } finally {
      setBusy(false)
    }
  }

  const checkPendingCreate = async () => {
    if (busy) return
    setBusy(true)
    try {
      const candidates = findPendingExamCreateCandidates(await getTeacherQuizzes(), pendingRef.current)
      setError(candidates.length === 0
        ? 'Chưa thấy đề phù hợp trong danh sách. Kết quả tạo vẫn chưa xác định; đừng gửi tạo lại. Hãy quay về danh sách và kiểm tra sau.'
        : candidates.length === 1
          ? 'Có một đề phù hợp nhưng chưa xác nhận được đây là đúng lần gửi này. Hãy đóng hộp thoại và tự kiểm tra trong danh sách trước khi mở đề đó.'
          : `Có ${candidates.length} đề phù hợp nên không thể xác định đề vừa tạo. Hãy đóng hộp thoại và kiểm tra thủ công.`)
    } catch (checkError) {
      setError('Không thể xác nhận kết quả tạo đề: ' + formatApiError(checkError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ConsoleDialog open onClose={onClose} dismissable={!busy} maxWidth={640}
      title={placement ? 'Tạo đánh giá đầu vào' : 'Tạo đề thi thử'}
      onSubmit={() => void (ambiguous ? checkPendingCreate() : create())}
      footer={<>
        <Button appearance="outline" onClick={onClose} disabled={busy}>{ambiguous ? 'Đóng' : 'Hủy'}</Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Đang xử lý...' : ambiguous ? 'Kiểm tra danh sách' : 'Tạo và soạn câu hỏi'}
        </Button>
      </>}>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
          {placement ? 'Tên bài đánh giá đầu vào' : 'Tên đề thi thử'}
          <input className={fieldControlClass} value={settings.title} maxLength={500} autoFocus disabled={busy || ambiguous}
            placeholder={placement ? 'Ví dụ: Đánh giá năng lực đầu vào' : 'Ví dụ: Đề thi thử V-ACT số 02'}
            onChange={(event) => update('title', event.target.value)} />
        </label>
        {placement ? (
          <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
            Mô tả
            <textarea className={textareaControlClass} value={settings.description} disabled={busy || ambiguous}
              onChange={(event) => update('description', event.target.value)} />
          </label>
        ) : (
          <div className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
            <span>Khóa học chính</span>
            <DropdownField ariaLabel="Khóa học chính" placeholder="Chọn khóa học chính"
              options={(courses.data ?? []).map((course) => ({ id: course.id, label: course.title }))}
              value={settings.courseId || null} onChange={(value) => update('courseId', value ?? '')}
              isSearchable isLoading={courses.status === 'loading'} isError={coursesFailed}
              errorMessage={courses.errorMessage || 'Không thể tải danh sách khóa học chính.'}
              emptyMessage="Không tìm thấy khóa học chính." mobileTouchTargets isDisabled={busy || ambiguous} />
            {coursesFailed && (
              <span className="flex flex-wrap items-center gap-2 text-xs font-normal text-badge-error-text" role="alert">
                Không tải được danh sách khóa học chính.
                <Button appearance="ghost" size="sm" onClick={courses.reload}>Thử tải lại</Button>
              </span>
            )}
          </div>
        )}
        <ExamRuleFields settings={settings} onChange={update} placement={placement} disabled={busy || ambiguous} />
        {!placement && (
          <MoreSettings label="Thêm thiết lập (lịch, đáp án…)">
            <ExamScheduleFields settings={settings} onChange={update} disabled={busy || ambiguous} />
          </MoreSettings>
        )}
        {error && <Notice tone={ambiguous ? 'warning' : 'danger'} role="alert">{error}</Notice>}
      </div>
    </ConsoleDialog>
  )
}
