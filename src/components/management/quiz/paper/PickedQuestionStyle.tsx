/**
 * Marks the question open beside the sheet. The sheet's blocks belong to its editor, which would undo a class set on
 * them, so the mark is a rule that names the question's tag. The paper stays white in both themes: fixed colours.
 */
export default function PickedQuestionStyle({ questionId }: { questionId: string | null }) {
  if (!questionId) return null
  const target = `.quiz-sheet-picking .exam-doc-sheet [data-exam-item="${CSS.escape(questionId)}"]`
  return <style>{`${target}{border-radius:2px;background:#e0f2fe;box-shadow:-6px 0 0 #e0f2fe,-8px 0 0 #0ea5e9}`}</style>
}
