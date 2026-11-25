import { useState } from 'react'
import { useQuizAccess } from '../../../hooks/useQuizAccess'
import { usePageResource } from '../../../hooks/usePageResource'
import { isCourseQuizType } from '../../../lib/quiz-types'
import { getTeacherQuiz } from '../../../services/teacherQuizService'
import { ForbiddenPage } from '../../console/access-states'
import Button from '../../console/button'
import { useConsoleFocus } from '../../console/console-focus'
import Notice from '../../console/notice'
import { useEditorLayout } from './editor-layout'
import type { AssessmentType } from './exam-settings'
import QuizEditorForm from './QuizEditorForm'
import QuizEditorSkeleton from './QuizEditorSkeleton'

export default function QuizEditor({
  assessmentType,
  quizId,
  onCancel,
  onSaved,
}: {
  assessmentType?: AssessmentType
  quizId: string
  onCancel: () => void
  onSaved: (message: string) => void
}) {
  const access = useQuizAccess()
  const [layout] = useEditorLayout()
  const [appendNotice, setAppendNotice] = useState<{ quizId: string; message: string } | null>(null)
  useConsoleFocus(layout === 'workspace')
  const editor = usePageResource(() => access.canWrite ? getTeacherQuiz(quizId) : Promise.resolve(null), [quizId, access.canWrite])
  if (!access.canWrite) return <ForbiddenPage />
  if (editor.status === 'loading') {
    return <QuizEditorSkeleton paper={assessmentType !== 'PLACEMENT'} />
  }
  if (editor.status !== 'ready' || !editor.data) {
    return (
      <div className="m-6 rounded-xl border border-card-border bg-background-gray-secondary p-4" role="alert">
        <p className="m-0 text-sm text-text-tertiary">
          {editor.status === 'forbidden'
            ? 'Tài khoản hiện tại không có quyền chỉnh sửa bài kiểm tra này.'
            : editor.status === 'not-found'
              ? 'Không tìm thấy bài kiểm tra hoặc bài đã được xóa.'
              : editor.errorMessage || 'Không thể tải nội dung bài kiểm tra.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button appearance="outline" className="min-h-11" onClick={editor.reload}>Thử lại</Button>
          <Button appearance="outline" className="min-h-11" onClick={onCancel}>Quay lại</Button>
        </div>
      </div>
    )
  }
  const typeMatches = assessmentType ? editor.data.quiz.type === assessmentType : isCourseQuizType(editor.data.quiz.type)
  if (!typeMatches) return <div className="p-6"><Notice tone="warning">Bài kiểm tra không thuộc loại đang mở. <Button appearance="outline" onClick={onCancel}>Quay lại</Button></Notice></div>
  return (
    <QuizEditorForm
      key={quizId}
      initial={editor.data}
      onCancel={onCancel}
      onSaved={onSaved}
      onReload={editor.reload}
      refreshing={editor.refreshing}
      refreshError={editor.refreshError}
      onRetryRefresh={editor.reloadInBackground}
      appendNotice={appendNotice?.quizId === quizId ? appendNotice.message : ''}
      onAppendResult={(message) => {
        setAppendNotice({ quizId, message })
        editor.reloadInBackground()
      }}
    />
  )
}
