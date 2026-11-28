import Button from '../button'
import ConsoleDialog from '../dialog'
import StudentLearningDiagnosticPanel from './StudentLearningDiagnosticPanel'

interface StudentDiagnosticDialogProps {
  open: boolean
  studentId: string | null
  studentName?: string | null
  onClose: () => void
}

export default function StudentDiagnosticDialog({
  open,
  studentId,
  studentName,
  onClose,
}: StudentDiagnosticDialogProps) {
  const title = studentName ? `Năng lực học viên · ${studentName}` : 'Năng lực học viên'

  return (
    <ConsoleDialog
      open={open && Boolean(studentId)}
      onClose={onClose}
      title={title}
      maxWidth={960}
      height={760}
      footer={
        <Button appearance="outline" onClick={onClose}>
          Đóng
        </Button>
      }
    >
      {studentId ? <StudentLearningDiagnosticPanel studentId={studentId} active={open} /> : null}
    </ConsoleDialog>
  )
}
