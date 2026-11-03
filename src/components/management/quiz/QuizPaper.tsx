import type { ReactNode } from 'react'
import type { TeacherQuizEditor, TeacherQuizQuestion, TeacherQuizSection } from '../../../services/teacherQuizService'
import MathText from '../../ui/MathText'
import PaperBrand from './PaperBrand'
import { optionColumns, sharedHeading } from './paper-layout'
import './quiz-paper.css'

type Group = TeacherQuizEditor['groups'][number]

function Question({ question, number }: { question: TeacherQuizQuestion; number: number }) {
  return (
    <div className="quiz-paper-question" data-question={number}>
      <p className="quiz-paper-stem">
        <strong>Câu {number}:</strong> <MathText>{question.questionText}</MathText>
      </p>
      {question.imageUrl && <img src={question.imageUrl} alt={`Hình câu ${number}`} />}
      {question.options.length > 0 && (
        <ol className="quiz-paper-options" data-columns={optionColumns(question.options)}>
          {question.options.map(option => (
            <li key={option.id}>
              <strong>{option.label}.</strong> <MathText>{option.text}</MathText>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/** `first`/`last`: the numbers printed on the questions under it, so the heading never disagrees with them. */
function GroupBlock({ group, first, last, children }: { group: Group; first: number; last: number; children: ReactNode }) {
  const title = group.instruction?.trim() || sharedHeading(first, last)
  return (
    <div className="quiz-paper-group">
      <p className="quiz-paper-group-title">{title}</p>
      {group.passage && (
        <p className="quiz-paper-passage">
          <MathText>{group.passage}</MathText>
        </p>
      )}
      {group.imageUrl && <img src={group.imageUrl} alt={`Hình cho các câu ${first}-${last}`} />}
      {children}
    </div>
  )
}

/** The questions of one section in paper order, a shared passage printed once above the questions it serves. */
function Questions({ questions, groups, numberOf }: { questions: TeacherQuizQuestion[]; groups: Map<string, Group>; numberOf: Map<string, number> }) {
  const blocks: { group: Group | null; questions: TeacherQuizQuestion[] }[] = []
  for (const question of questions) {
    const group = question.groupId ? groups.get(question.groupId) ?? null : null
    const last = blocks[blocks.length - 1]
    if (last && group && last.group?.id === group.id) last.questions.push(question)
    else blocks.push({ group, questions: [question] })
  }
  return (
    <>
      {blocks.map((block, index) => {
        const numbers = block.questions.map(question => numberOf.get(question.id) ?? question.sequence)
        const items = block.questions.map((question, at) => <Question key={question.id} question={question} number={numbers[at]} />)
        return block.group ? (
          <GroupBlock key={block.group.id} group={block.group} first={numbers[0]} last={numbers[numbers.length - 1]}>
            {items}
          </GroupBlock>
        ) : (
          <div key={`loose-${index}`}>{items}</div>
        )
      })}
    </>
  )
}

/** The quiz as a printed paper: A4, Times, bold "Câu N:", parts in capitals, passages above their questions. */
export default function QuizPaper({ editor }: { editor: TeacherQuizEditor }) {
  const questions = [...editor.questions].sort((a, b) => a.sequence - b.sequence)
  const numberOf = new Map(questions.map((question, index) => [question.id, index + 1]))
  const groups = new Map(editor.groups.map(group => [group.id, group]))
  const sections = [...editor.sections].sort((a, b) => a.sequence - b.sequence)
  const inSection = (section: TeacherQuizSection) => questions.filter(question => question.sectionId === section.id)
  const known = new Set(sections.flatMap(section => [section.id, ...section.children.map(child => child.id)]))
  const loose = questions.filter(question => !question.sectionId || !known.has(question.sectionId))
  const quiz = editor.quiz

  return (
    <article className="quiz-paper" aria-label="Bản in bài kiểm tra">
      <PaperBrand content="own" />
      <h1>{quiz.title}</h1>
      <p className="quiz-paper-meta">
        {[quiz.durationMinutes ? `Thời gian làm bài: ${quiz.durationMinutes} phút` : null, `${questions.length} câu`]
          .filter(Boolean)
          .join(' · ')}
      </p>
      {loose.length > 0 && <Questions questions={loose} groups={groups} numberOf={numberOf} />}
      {sections.map(section => {
        const children = [...section.children].sort((a, b) => a.sequence - b.sequence)
        return (
          <section key={section.id}>
            <h2>{section.title}</h2>
            <Questions questions={inSection(section)} groups={groups} numberOf={numberOf} />
            {children.map(child => (
              <section key={child.id}>
                <h3>{child.title}</h3>
                <Questions questions={inSection(child)} groups={groups} numberOf={numberOf} />
              </section>
            ))}
          </section>
        )
      })}
      <p className="quiz-paper-end">--- HẾT ---</p>
    </article>
  )
}
