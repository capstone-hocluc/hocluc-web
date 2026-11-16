import { useState } from 'react'
import { useQuizAccess } from '../../../hooks/useQuizAccess'
import { isQuizPage, quizMenuPage } from '../../../lib/console-routes'
import { pageTabs } from '../../../lib/console-nav'
import type { UserRole } from '../../../services/userService'
import { ForbiddenPage } from '../../console/access-states'
import { useConsoleFocused } from '../../console/console-focus'
import Notice from '../../console/notice'
import { PageTabsList } from '../../console/page-tabs'
import { TeacherAttempts } from '../quiz-review-screens'
import QuizScreen from './QuizScreen'
import MockExamScreen from './MockExamScreen'
import QuizDetails from './QuizDetails'
import { Tabs, TabsContent } from '../../ui/Tabs'

function QuizPage({ role, page, readOnly, onNavigate }: {
  role: UserRole; page: string; readOnly: boolean; onNavigate: (page: string) => void
}) {
  const [notice, setNotice] = useState('')
  // An editor that takes the whole window leaves no room for the last action's notice above it.
  const workspaceOpen = useConsoleFocused()
  const menu = quizMenuPage(page)
  const creating = page === 'quizzes-new' || page === 'mock-exams-new' || page === 'placements-new' || page.startsWith('quiz-new-')
  const editing = page.match(/^(?:quizzes|mock-exams|placements)-edit-([0-9a-f-]+)$/i)?.[1] ?? null
  const viewing = page.match(/^(?:quizzes|mock-exams|placements)-view-([0-9a-f-]+)$/i)?.[1] ?? null
  const courseId = page.match(/^quiz-(?:new-)?([0-9a-f-]+)$/i)?.[1] ?? ''
  // A direct editor URL is denied before fetching or mounting any editor.
  if (readOnly && (creating || editing)) return <ForbiddenPage />
  if (viewing) return <QuizDetails quizId={viewing} expectedType={menu === 'placements' ? 'PLACEMENT' : undefined} onBack={() => onNavigate(menu)} />
  const tabs = pageTabs(role, menu)
  const navigation = tabs.length > 0 ? <PageTabsList tabs={tabs} label="Loại bài kiểm tra" /> : undefined
  return <Tabs value={menu} onValueChange={onNavigate} activationMode="manual" className="min-w-0">
    <TabsContent value={menu} className="flex min-w-0 flex-col gap-4">
      {notice && !workspaceOpen && <Notice role="status">{notice}</Notice>}
      {menu === 'attempts'
        ? <TeacherAttempts navigation={navigation} />
        : menu === 'mock-exams' || menu === 'placements'
        ? <MockExamScreen navigation={navigation} assessmentType={menu === 'placements' ? 'PLACEMENT' : 'EXAM'} readOnly={readOnly} startCreating={creating} initialEditorId={editing}
            onBack={() => onNavigate('dashboard')} onAction={setNotice} />
        : <QuizScreen navigation={navigation} course={{ id: courseId, name: 'Khóa học' }} readOnly={readOnly}
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
