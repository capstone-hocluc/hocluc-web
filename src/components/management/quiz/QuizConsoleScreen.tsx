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

/** The last action's message, for the tab it was made on. */
type QuizNotice = { menu: string; text: string }

function QuizPage({ role, page, readOnly, openedFrom, onOpenedFrom, notice, onNotice, onNavigate }: {
  role: UserRole; page: string; readOnly: boolean
  /** The list the open editor came from, and where to note it. */
  openedFrom: string | null; onOpenedFrom: (page: string | null) => void
  notice: QuizNotice | null; onNotice: (notice: QuizNotice | null) => void
  onNavigate: (page: string) => void
}) {
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
  // The editor is the address: opening a quiz goes to its /edit address, leaving it (saved, published or not) goes back
  // to the list it was opened from (a course's quizzes, say), so a reload or Back never lands in an editor that was
  // closed. An editor opened by its own address goes back to the whole list.
  const listPage = courseId ? `quiz-${courseId}` : menu
  const openEditor = (id: string | null) => {
    if (id) {
      if (!editing) onOpenedFrom(listPage)
      onNavigate(`${menu}-edit-${id}`)
      return
    }
    onOpenedFrom(null)
    onNavigate(editing ? (openedFrom ?? listPage) : listPage)
  }
  // A save closes the editor before it reports: the message is kept above this page, which the new address mounts anew.
  const shownNotice = notice?.menu === menu ? notice.text : ''
  const setNotice = (text: string) => onNotice(text ? { menu, text } : null)
  const tabs = pageTabs(role, menu)
  const navigation = tabs.length > 0 ? <PageTabsList tabs={tabs} label="Loại bài kiểm tra" /> : undefined
  const switchTab = (next: string) => {
    onNotice(null)
    onNavigate(next)
  }
  return <Tabs value={menu} onValueChange={switchTab} activationMode="manual" className="min-w-0">
    <TabsContent value={menu} className="flex min-w-0 flex-col gap-4">
      {shownNotice && !workspaceOpen && <Notice role="status">{shownNotice}</Notice>}
      {menu === 'attempts'
        ? <TeacherAttempts navigation={navigation} />
        : menu === 'mock-exams' || menu === 'placements'
        ? <MockExamScreen navigation={navigation} assessmentType={menu === 'placements' ? 'PLACEMENT' : 'EXAM'} readOnly={readOnly} startCreating={creating} editorId={editing} onEditorChange={openEditor}
            onBack={() => onNavigate('dashboard')} onAction={setNotice} />
        : <QuizScreen navigation={navigation} course={{ id: courseId, name: 'Khóa học' }} readOnly={readOnly}
            startCreating={creating} editorId={editing} onEditorChange={openEditor}
            onBack={() => onNavigate(courseId ? 'courses' : 'dashboard')} onAction={setNotice} />}
    </TabsContent>
  </Tabs>
}

export default function QuizConsoleScreen({ role, page, onNavigate }: {
  role: UserRole; page: string; onNavigate: (page: string) => void
}) {
  const access = useQuizAccess()
  // The list an open editor came from, to go back to when it closes. Kept here: the page below is mounted anew per address.
  const [openedFrom, setOpenedFrom] = useState<string | null>(null)
  const [notice, setNotice] = useState<QuizNotice | null>(null)
  if (!access.canRead || access.role !== role || !isQuizPage(page)) return <ForbiddenPage />
  if (quizMenuPage(page) === 'placements' && !access.canWrite) return <ForbiddenPage />
  // Drop drafts, selected quizzes and pending state on identity/active-role/route changes.
  return <QuizPage key={`${access.identity}:${page}`} role={role} page={page}
    readOnly={!access.canWrite} openedFrom={openedFrom} onOpenedFrom={setOpenedFrom}
    notice={notice} onNotice={setNotice} onNavigate={onNavigate} />
}
