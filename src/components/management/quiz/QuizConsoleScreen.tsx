import { useState } from 'react'
import { useQuizAccess } from '../../../hooks/useQuizAccess'
import { isQuizPage, quizMenuPage } from '../../../lib/console-routes'
import type { UserRole } from '../../../services/userService'
import { ForbiddenPage } from '../../console/access-states'
import Notice from '../../console/notice'
import { QuestionReview, TeacherAttempts } from '../quiz-review-screens'
import QuizScreen from './QuizScreen'
import MockExamScreen from './MockExamScreen'
import QuizDetails from './QuizDetails'

function QuizPage({ page, readOnly, onNavigate }: {
  page: string; readOnly: boolean; onNavigate: (page: string) => void
}) {
  const [notice, setNotice] = useState('')
  const menu = quizMenuPage(page)
  const creating = page === 'quizzes-new' || page === 'mock-exams-new' || page.startsWith('quiz-new-')
  const editing = page.match(/^(?:quizzes|mock-exams)-edit-([0-9a-f-]+)$/i)?.[1] ?? null
  const viewing = page.match(/^(?:quizzes|mock-exams)-view-([0-9a-f-]+)$/i)?.[1] ?? null
  const courseId = page.match(/^quiz-(?:new-)?([0-9a-f-]+)$/i)?.[1] ?? ''
  // A direct editor URL is denied before fetching or mounting any editor.
  if (readOnly && (creating || editing)) return <ForbiddenPage />
  if (viewing) return <QuizDetails quizId={viewing} onBack={() => onNavigate(menu)} />
  if (menu === 'question-review') return <QuestionReview readOnly={readOnly} />
  if (menu === 'attempts') return <TeacherAttempts />
  return <>
    {notice && <Notice role="status">{notice}</Notice>}
    {menu === 'mock-exams'
      ? <MockExamScreen readOnly={readOnly} startCreating={creating} initialEditorId={editing}
          onBack={() => onNavigate('dashboard')} onAction={setNotice} />
      : <QuizScreen course={{ id: courseId, name: 'Khóa học' }} readOnly={readOnly}
          startCreating={creating} initialEditorId={editing}
          onBack={() => onNavigate(courseId ? 'courses' : 'dashboard')} onAction={setNotice} />}
  </>
}

export default function QuizConsoleScreen({ role, page, onNavigate }: {
  role: UserRole; page: string; onNavigate: (page: string) => void
}) {
  const access = useQuizAccess()
  if (!access.canRead || access.role !== role || !isQuizPage(page)) return <ForbiddenPage />
  // Drop drafts, selected quizzes and pending state on identity/active-role/route changes.
  return <QuizPage key={`${access.identity}:${page}`} page={page}
    readOnly={!access.canWrite} onNavigate={onNavigate} />
}
