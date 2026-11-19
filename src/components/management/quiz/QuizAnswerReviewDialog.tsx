import ConfirmDialog from '../../console/confirm-dialog'
import type { TeacherQuizRecord } from '../../../services/teacherQuizService'

interface QuizAnswerReviewDialogProps {
  quiz: TeacherQuizRecord
  busy: boolean
  onCancel: () => void
  onSave: (enabled: boolean) => void
}

export default function QuizAnswerReviewDialog({ quiz, busy, onCancel, onSave }: QuizAnswerReviewDialogProps) {
  return (
    <ConfirmDialog
      title={quiz.showAnswers ? 'Tắt quyền xem đáp án?' : 'Cho phép xem đáp án sau khi nộp?'}
      description={quiz.showAnswers
        ? 'Học sinh sẽ chỉ xem được điểm sau khi nộp.'
        : 'Học sinh có thể xem đáp án và lời giải sau khi nộp.'}
      cancelLabel="Hủy"
      confirmLabel={quiz.showAnswers ? 'Tắt xem đáp án' : 'Bật xem đáp án'}
      busy={busy}
      busyLabel="Đang lưu..."
      onCancel={onCancel}
      onConfirm={() => onSave(!quiz.showAnswers)}
    />
  )
}
