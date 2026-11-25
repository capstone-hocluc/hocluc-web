import { lazy, Suspense, useMemo, useState } from 'react'
import { getCategories, type Category } from '../../../services/categoryService'
import type { TeacherQuizEditor } from '../../../services/teacherQuizService'
import { useMinWidth } from '../../../hooks/use-min-width'
import { usePageResource } from '../../../hooks/usePageResource'
import { Clock3, Plus, Send, Settings, Sparkles } from '../../console/icons'
import Button from '../../console/button'
import Notice from '../../console/notice'
import ConsoleSheet from '../../console/sheet'
import { SheetContent, SheetOverlay, SheetTitle } from '../../tailgrids/core/sheet'
import { Skeleton } from '../../tailgrids/core/skeleton'
import ScrollArea from '../../ui/ScrollArea'
import EditorFrame from './EditorFrame'
import EditorLayoutToggle from './EditorLayoutToggle'
import EditorTopBar from './EditorTopBar'
import ExamQuestionEditor from './ExamQuestionEditor'
import ExamQuestionRail from './ExamQuestionRail'
import ExamSettingsSheet from './ExamSettingsSheet'
import QuizDockSkeleton from './QuizDockSkeleton'
import QuizImportDialog from './QuizImportDialog'
import QuizLabelRun from './QuizLabelRun'
import QuizQuestionSkill from './QuizQuestionSkill'
import QuizSectionControls from './QuizSectionControls'
import QuizSettingsSheet from './QuizSettingsSheet'
import type { DraftQuestion, DraftSection } from './exam-draft'
import { validateExamSettings } from './exam-settings'
import { useEditorLayout } from './editor-layout'
import QuizSheet from './paper/QuizSheet'
import { draftQuizToPaper } from './paper/quiz-to-paper'
import { useQuizEditor } from './useQuizEditor'
import { useQuizLabels } from './useQuizLabels'

const QuizAssistantDock = lazy(() => import('./QuizAssistantDock'))

export default function QuizEditorForm({
  initial, onCancel, onSaved, onReload, appendNotice, onAppendResult, refreshing, refreshError, onRetryRefresh,
}: {
  initial: TeacherQuizEditor
  onCancel: () => void
  onSaved: (message: string) => void
  onReload: () => void
  appendNotice: string
  onAppendResult: (message: string) => void
  refreshing: boolean
  refreshError: string
  onRetryRefresh: () => void
}) {
  const [layout] = useEditorLayout()
  const [railOpen, setRailOpen] = useState(false)
  const {
    quiz, placement, courseQuiz, settings, sections, numbered, selectedId, setSelectedId, focusQuestion, settingsOpen, showSettings,
    chatOpen, chatMounted, setChatOpen, toggleChat, error, busy, setBusy, fieldErrors, ambiguousQuestionSave,
    settingsLocked, published, canEditContent, canEditQuestions, importBlockedReason, appendBlockedReason,
    selectPaperItem, updateSettings, updateSection, updateQuestion, addSection, addQuestion, deleteQuestion,
    moveSection, removeSection, moveQuestion, reorderQuestion, shiftQuestion, save,
  } = useQuizEditor(initial, onSaved, refreshing || Boolean(refreshError))
  const settingsDocked = useMinWidth(placement || courseQuiz ? 1024 : 1280) && ((!placement && !courseQuiz) || layout === 'workspace')
  const feedbackInDock = chatOpen && !settingsDocked && canEditContent
  const appendFeedback = (appendNotice || refreshError) && (
    <>
      {appendNotice && <Notice>{appendNotice}</Notice>}
      {refreshError && (
        <Notice tone="danger" role="alert">
          {refreshError}
          <Button size="sm" appearance="outline" onClick={onRetryRefresh}>Thử tải lại bài</Button>
        </Notice>
      )}
    </>
  )
  const serverQuizId = quiz.id
  const quizLabels = useQuizLabels(serverQuizId)
  const paper = useMemo(
    () => placement ? null : draftQuizToPaper(initial, sections, settings.title, Number(settings.duration) || null),
    [initial, placement, sections, settings.title, settings.duration],
  )
  const categories = usePageResource(() => placement ? getCategories() : Promise.resolve([] as Category[]), [placement])
  const categoryOptions = (categories.data ?? []).filter((category) => category.active).map((category) => ({ id: category.id, label: category.name }))
  const activeEntry = numbered.find((entry) => entry.question.clientId === selectedId)
    ?? numbered.find((entry) => entry.section.clientId === selectedId)
    ?? (placement && !sections.some((section) => section.clientId === selectedId) ? numbered[0] ?? null : null)
  const activeSection = activeEntry?.section ?? sections.find((section) => section.clientId === selectedId) ?? sections[0] ?? null
  const railSelectedId = activeEntry ? activeEntry.question.clientId : selectedId
  const backLabel = courseQuiz ? 'Quay lại danh sách quiz' : placement ? 'Quay lại đánh giá đầu vào' : 'Quay lại danh sách đề thi'
  const editableSections = sections.filter((section) => !section.unassigned)

  const numberOf = new Map(numbered.map((entry, index) => [entry.question.clientId, index + 1]))

  const questionEditor = (section: DraftSection, question: DraftQuestion) => {
    const number = numberOf.get(question.clientId) ?? 0
    const position = section.questions.indexOf(question)
    return (
      <ExamQuestionEditor
        key={question.clientId}
        question={question}
        number={number}
        skill={question.serverId && <QuizQuestionSkill quizId={serverQuizId} questionId={question.serverId} resource={quizLabels} />}
        sectionTitle={section.title}
        placement={placement}
        inPanel={!placement}
        focusQuestion={focusQuestion && question.clientId === selectedId}
        editable={canEditContent && question.editable && (!placement || question.questionType === 'SINGLE_CHOICE')}
        structureEditable={canEditQuestions}
        busy={busy}
        canMoveUp={position > 0}
        canMoveDown={position < section.questions.length - 1}
        categoryOptions={categoryOptions}
        categoriesReady={categories.status === 'ready'}
        categoriesLoading={categories.status === 'loading'}
        onChange={(update) => updateQuestion(section.clientId, question.clientId, update)}
        onMove={(direction) => moveQuestion(section.clientId, question.clientId, direction)}
        onDelete={() => deleteQuestion(section.clientId, question.clientId)}
        onPrevious={number > 1 ? () => selectPaperItem(numbered[number - 2].question.clientId) : null}
        onNext={number < numbered.length ? () => selectPaperItem(numbered[number].question.clientId) : null}
      />
    )
  }

  // In the drawer every choice also closes it, so the question it leads to is in view.
  const rail = (afterChoice?: () => void) => (
    <ExamQuestionRail sections={sections} selectedId={railSelectedId} canEditStructure={canEditQuestions} busy={busy}
      onSelect={(clientId) => { selectPaperItem(clientId); afterChoice?.() }}
      onAddQuestion={(sectionId) => { addQuestion(sectionId); afterChoice?.() }}
      onReorderQuestion={courseQuiz ? reorderQuestion : undefined}
      onShiftQuestion={courseQuiz ? shiftQuestion : undefined}
      onAddSection={() => { addSection(); afterChoice?.() }} />
  )

  const sectionIsEditable = activeSection && canEditQuestions && !activeSection.unassigned
  const sectionPosition = activeSection ? editableSections.indexOf(activeSection) : -1
  const sectionControls = sectionIsEditable && (
    <QuizSectionControls section={activeSection} position={sectionPosition + 1} busy={busy}
      canMoveUp={sectionPosition > 0} canMoveDown={sectionPosition < editableSections.length - 1}
      onTitleChange={(title) => updateSection(activeSection.clientId, { title })}
      onMove={(direction) => moveSection(activeSection.clientId, direction)} onRemove={() => removeSection(activeSection)} />
  )
  const questionPanel = !placement && !settingsOpen && selectedId && (activeEntry || sectionIsEditable) && (
    <ConsoleSheet open docked={settingsDocked} onClose={() => setSelectedId(null)}
      title={activeEntry ? `Câu ${numberOf.get(activeEntry.question.clientId)}` : `Phần ${editableSections.indexOf(activeSection) + 1}`}>
      {activeEntry && questionEditor(activeEntry.section, activeEntry.question)}
      {sectionControls}
    </ConsoleSheet>
  )

  return (
    <EditorFrame
      layout={layout}
      paper={!placement}
      header={<EditorTopBar layout={layout} title={quiz.title} backLabel={backLabel} status={quiz.status} onBack={onCancel}>
        <Button appearance="ghost" aria-pressed={settingsDocked ? settingsOpen : undefined} onClick={() => showSettings(!settingsOpen)} disabled={busy}>
          <Settings size={15} />Thiết lập
        </Button>
        {canEditContent && (
          <Button appearance="ghost" aria-pressed={chatOpen} onClick={toggleChat} disabled={busy}>
            <Sparkles size={15} />Trợ lý AI
          </Button>
        )}
        <Button appearance="ghost" className={ambiguousQuestionSave ? undefined : 'max-sm:hidden'} onClick={onCancel} disabled={busy}>
          {ambiguousQuestionSave ? 'Quay về danh sách' : 'Hủy'}
        </Button>
        <Button appearance="outline" onClick={() => void save(false)} disabled={busy || published || ambiguousQuestionSave}>
          <Clock3 size={15} />{busy && !refreshError ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
        {quiz.status !== 'ARCHIVED' && (
          <Button onClick={() => void save(true)} disabled={busy || settingsLocked || published || ambiguousQuestionSave}>
            <Send size={15} />{busy && !refreshError ? 'Đang xử lý...' : 'Lưu và xuất bản'}
          </Button>
        )}
        <EditorLayoutToggle />
      </EditorTopBar>}
      notices={(error || ambiguousQuestionSave || (!feedbackInDock && appendFeedback)) && <>
        {error && <Notice tone="danger" role="alert" className="font-medium">{error}</Notice>}
        {!feedbackInDock && appendFeedback}
        {ambiguousQuestionSave && (
          <Notice tone="warning" role="alert" aria-live="assertive">
            Máy chủ có thể đã nhận một phần thay đổi câu hỏi nhưng phản hồi bị gián đoạn. Không gửi lại từ biểu mẫu này; hãy quay về danh sách và mở lại đề để kiểm tra.
          </Notice>
        )}
      </>}
      rail={rail()}
      railLabel="Mục lục đề"
      aside={<>
        {courseQuiz ? (
          <QuizSettingsSheet docked={settingsDocked} open={settingsOpen} onClose={() => showSettings(false)} quiz={quiz}
            values={{ title: settings.title, duration: settings.duration, attempts: settings.maxAttempts, showAnswers: settings.showAnswers }}
            onChange={(key, value) => updateSettings(key === 'attempts' ? 'maxAttempts' : key, value)}
            fieldErrors={fieldErrors} nameDisabled={busy || published || ambiguousQuestionSave}
            rulesDisabled={busy || published || settingsLocked || ambiguousQuestionSave} locked={settingsLocked} />
        ) : (
          <ExamSettingsSheet docked={settingsDocked} open={settingsOpen} onClose={() => showSettings(false)} placement={placement} settings={settings}
            onChange={updateSettings} courseName={quiz.courseTitle || 'Khóa học đã chọn'}
            error={error && error === validateExamSettings(settings, placement, quiz) ? error : ''}
            nameDisabled={published || busy} rulesDisabled={published || settingsLocked || ambiguousQuestionSave || busy} locked={settingsLocked} published={published}
            fromRequired={Boolean(quiz.availableFrom)} untilRequired={Boolean(quiz.availableUntil)} />
        )}
        {questionPanel}
        {chatMounted && canEditContent && (
          <Suspense fallback={<QuizDockSkeleton open={chatOpen} docked={settingsDocked} onClose={() => setChatOpen(false)} />}>
            <QuizAssistantDock quizId={serverQuizId} open={chatOpen} docked={settingsDocked} busy={busy}
              blockedReason={appendBlockedReason} onClose={() => setChatOpen(false)} onBusyChange={setBusy} onAppendResult={onAppendResult}
              appendFeedback={feedbackInDock ? appendFeedback : null}
              readPaper={() => paper ?? draftQuizToPaper(initial, sections, settings.title, Number(settings.duration) || null)} />
          </Suspense>
        )}
      </>}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 pt-3 sm:px-6">
          <QuizLabelRun quizId={serverQuizId} resource={quizLabels} />
          <QuizImportDialog quizId={serverQuizId} blockedReason={importBlockedReason} busy={busy} onReload={onReload} onBusyChange={setBusy} />
        </div>
        <div className="flex shrink-0 border-b border-card-border px-4 py-2 sm:px-6 lg:hidden">
          <Button appearance="outline" size="sm" onClick={() => setRailOpen(true)}>Danh sách câu</Button>
        </div>
        <ScrollArea aria-label={courseQuiz ? 'Nội dung bài kiểm tra' : 'Nội dung đề'} className="min-h-0 flex-1">
          {paper ? (
            <QuizSheet paper={paper} label={courseQuiz ? 'Trang giấy bài kiểm tra' : 'Trang giấy đề thi'} selectedId={activeEntry?.question.clientId}
              onSelectQuestion={selectPaperItem} />
          ) : (<>
            {['loading', 'error', 'forbidden', 'not-found'].includes(categories.status) && (
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 pt-4 sm:px-6">
                {categories.status === 'loading' && <Skeleton className="h-4 w-44" role="status" aria-label="Đang tải môn học" />}
                {['error', 'forbidden', 'not-found'].includes(categories.status) && <Notice tone="warning">{categories.errorMessage || 'Không tải được các môn bạn được phép xem. Có thể lưu nháp và bổ sung sau.'}<Button appearance="outline" onClick={categories.reload}>Thử tải môn học</Button></Notice>}
              </div>
            )}
            {sectionControls}
            {activeEntry ? questionEditor(activeEntry.section, activeEntry.question) : (
              <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-3 p-4 sm:p-6">
                <p className="m-0 w-full rounded-xl border border-dashed border-card-border bg-background-gray-secondary p-5 text-center text-sm text-text-tertiary">
                  {sections.length === 0 ? 'Chưa có phần thi hoặc câu hỏi. Thêm một phần để bắt đầu soạn đề.' : 'Phần này chưa có câu hỏi.'}
                </p>
                {canEditQuestions && (sections.length === 0
                  ? <Button appearance="outline" onClick={addSection} disabled={busy}><Plus size={15} />Thêm phần thi</Button>
                  : activeSection && <Button appearance="outline" onClick={() => addQuestion(activeSection.clientId)} disabled={busy}><Plus size={15} />Thêm câu hỏi đầu tiên</Button>)}
              </div>
            )}
          </>)}
        </ScrollArea>
      </div>

      <SheetOverlay isOpen={railOpen} onOpenChange={setRailOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-80! max-w-80! border-r border-card-border bg-card-background p-0">
          <SheetTitle className="sr-only">Danh sách câu hỏi</SheetTitle>
          {rail(() => setRailOpen(false))}
        </SheetContent>
      </SheetOverlay>
    </EditorFrame>
  )
}
