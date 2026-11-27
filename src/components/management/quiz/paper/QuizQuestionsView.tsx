import { ConsoleSubTabsList, ConsoleSubTabsTrigger, ConsoleTabs, ConsoleTabsContent } from '../../../console/tabs'
import type { ExamPaper } from '../../ai-assistant/exam-format'
import QuizQuestionTable from './QuizQuestionTable'
import QuizSheet from './QuizSheet'
import { useQuizViewMode } from './quiz-view-mode'

/** A quiz's questions, on A4 sheets or as a dense list, whichever the viewer chose last. Only the one chosen is built. */
export default function QuizQuestionsView({ paper, label }: { paper: ExamPaper; label: string }) {
  const [mode, setMode] = useQuizViewMode()
  return (
    <ConsoleTabs value={mode} onValueChange={(value) => setMode(value === 'list' ? 'list' : 'paper')} className="flex min-w-0 flex-col gap-3">
      <ConsoleSubTabsList aria-label="Cách xem câu hỏi">
        <ConsoleSubTabsTrigger value="paper">Giấy A4</ConsoleSubTabsTrigger>
        <ConsoleSubTabsTrigger value="list">Danh sách</ConsoleSubTabsTrigger>
      </ConsoleSubTabsList>
      <ConsoleTabsContent value="paper" className="pt-0">
        {mode === 'paper' && <QuizSheet paper={paper} label={label} />}
      </ConsoleTabsContent>
      <ConsoleTabsContent value="list" className="pt-0">
        {mode === 'list' && <QuizQuestionTable paper={paper} />}
      </ConsoleTabsContent>
    </ConsoleTabs>
  )
}
