import { useState } from 'react'
import { useQuizAccess } from '../../../hooks/useQuizAccess'
import { isQuizPage, quizMenuPage } from '../../../lib/console-routes'
import { findNavItem } from '../../../lib/console-nav'
import type { UserRole } from '../../../services/userService'
import { ForbiddenPage } from '../../console/access-states'
import Notice from '../../console/notice'
import { QuestionReview, TeacherAttempts } from '../quiz-review-screens'
import QuizScreen from './QuizScreen'
import MockExamScreen from './MockExamScreen'
import QuizDetails from './QuizDetails'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/Tabs'

const assessmentTabs = [
  { page: 'quizzes', label: 'Bài học / chương' },
  { page: 'placements', label: 'Đánh giá đầu vào' },
  { page: 'mock-exams', label: 'Thi thử' },
]

function QuizPage({ role, page, readOnly, onNavigate }: {
  role: UserRole; page: string; readOnly: boolean; onNavigate: (page: string) => void
}) {
  const [notice, setNotice] = useState('')
  const menu = quizMenuPage(page)
  const creating = page === 'quizzes-new' || page === 'mock-exams-new' || page === 'placements-new' || page.startsWith('quiz-new-')
  const editing = page.match(/^(?:quizzes|mock-exams|placements)-edit-([0-9a-f-]+)$/i)?.[1] ?? null
  const viewing = page.match(/^(?:quizzes|mock-exams|placements)-view-([0-9a-f-]+)$/i)?.[1] ?? null
  const courseId = page.match(/^quiz-(?:new-)?([0-9a-f-]+)$/i)?.[1] ?? ''
  // A direct editor URL is denied before fetching or mounting any editor.
  if (readOnly && (creating || editing)) return <ForbiddenPage />
  if (viewing) return <QuizDetails quizId={viewing} expectedType={menu === 'placements' ? 'PLACEMENT' : undefined} onBack={() => onNavigate(menu)} />
  if (menu === 'question-review') return <QuestionReview readOnly={readOnly} />
  if (menu === 'attempts') return <TeacherAttempts />
  const tabs = assessmentTabs.filter(tab => findNavItem(role, tab.page))
  const navigation = <TabsList aria-label="Loại bài kiểm tra" className="w-full gap-4 sm:gap-6">
    {tabs.map(tab => <TabsTrigger key={tab.page} value={tab.page}>{tab.label}</TabsTrigger>)}
  </TabsList>
  return <Tabs value={menu} onValueChange={onNavigate} activationMode="manual" className="min-w-0">
    <TabsContent value={menu} className="flex min-w-0 flex-col gap-4">
      {notice && <Notice role="status">{notice}</Notice>}
      {menu === 'mock-exams' || menu === 'placements'
        ? <MockExamScreen navigation={navigation} assessmentType={menu === 'placements' ? 'PLACEMENT' : 'EXAM'} readOnly={readOnly} startCreating={creating} initialEditorId={editing}
            onOpenEditor={id => onNavigate(`${menu}-edit-${id}`)}
            onBack={() => onNavigate('dashboard')} onAction={setNotice} />
        : <QuizScreen navigation={navigation} course={{ id: courseId, name: 'Khóa học' }} readOnly={readOnly}
            onOpenEditor={id => onNavigate(`quizzes-edit-${id}`)}
            startCreating={creating} initialEditorId={editing}
            onBack={() => onNavigate(courseId ? 'courses' : 'dashboard')} onAction={setNotice} />}
    </TabsContent>
  </Tabs>
}

export default function QuizConsoleScreen({ role, page, onNavigate }: {
  role: UserRole; page: string; onNavigate: (page: string) => void
}) {
  const access = useQuizAccess()
  if (!access.canRead || access.role !== role || !isQuizPage(page)) return <ForbiddenPage />
  if (quizMenuPage(page) === 'placements' && !access.canWrite) return <ForbiddenPage />
  // Drop drafts, selected quizzes and pending state on identity/active-role/route changes.
  return <QuizPage key={`${access.identity}:${page}`} role={role} page={page}
    readOnly={!access.canWrite} onNavigate={onNavigate} />
}
