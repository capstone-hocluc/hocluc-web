import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Ref } from 'react'
import { sampleLesson, type SampleQuestion } from '../../data/landing-content'
import Icon from './Icon'
import AuthLink from './AuthLink'

export interface SampleLessonHandle {
  /** Moves focus to the first answer, or to the action button once the question is checked. */
  focusLesson: () => void
}

interface SampleLessonSectionProps {
  questions: SampleQuestion[]
  ref?: Ref<SampleLessonHandle>
}

const OPTION_LETTERS = 'ABCD'

function SampleLessonSection({ questions, ref }: SampleLessonSectionProps) {
  const total = questions.length
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(-1)
  const [checked, setChecked] = useState(false)
  const [score, setScore] = useState(0)
  const answersRef = useRef<HTMLDivElement>(null)
  const checkButtonRef = useRef<HTMLButtonElement>(null)
  const focusAnswerOnRender = useRef(false)

  const question = questions[index]
  const isLast = index === total - 1
  const correct = checked && selected === question.correct

  useImperativeHandle(ref, () => ({
    focusLesson: () => {
      const target = checked
        ? checkButtonRef.current
        : answersRef.current?.querySelector<HTMLButtonElement>('button')
      target?.focus({ preventScroll: true })
    },
  }))

  // After moving to the next question (or restarting) keyboard focus returns to the first answer.
  useEffect(() => {
    if (!focusAnswerOnRender.current) return
    focusAnswerOnRender.current = false
    answersRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
  }, [index])

  const handleAction = () => {
    if (checked) {
      focusAnswerOnRender.current = true
      setSelected(-1)
      setChecked(false)
      if (isLast) {
        setIndex(0)
        setScore(0)
      } else {
        setIndex(index + 1)
      }
      return
    }
    if (selected < 0) return
    setChecked(true)
    if (selected === question.correct) setScore(score + 1)
  }

  const progressStep = checked ? index + 1 : index
  const finished = checked && isLast
  const feedback = checked
    ? (correct ? 'Đúng rồi! ' : 'Chưa đúng, mình cùng xem lại nhé. ') +
      question.explain +
      (finished
        ? ` Bạn đã hoàn thành ${total} câu, đúng ${score}/${total}. Mỗi lời giải bạn hiểu thêm đều là một bước tiến!`
        : '')
    : ''

  return (
    <section className="section sample-section" id="hoc-thu" aria-labelledby="sample-title">
      <div className="container">
        <div className="center experience-heading">
          <h2 id="sample-title">{sampleLesson.title}</h2>
          <p className="intro">{sampleLesson.intro}</p>
        </div>
        <div className="experience-layout">
          <div className="lesson">
            <div className="lesson-header">
              <span>Câu luyện mẫu</span>
              <span id="question-counter">
                {finished ? `Hoàn thành · ${score}/${total} đúng` : `Câu ${index + 1} / ${total}`}
              </span>
            </div>
            <div className="lesson-body">
              <div
                className="lesson-progress"
                role="progressbar"
                aria-label="Tiến độ bài học thử"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={progressStep}
              >
                <span id="lesson-progress" style={{ width: `${(progressStep / total) * 100}%` }} />
              </div>
              <div className="lesson-group" id="question-group">
                {question.group}
              </div>
              <h3 id="question-title">{question.title}</h3>
              <p id="question-context">{question.context}</p>
              <div
                className="answers"
                id="answers"
                role="group"
                aria-label="Chọn đáp án"
                ref={answersRef}
              >
                {question.answers.map((answer, answerIndex) => {
                  const classes = ['answer']
                  if (checked && answerIndex === question.correct) classes.push('correct')
                  if (checked && answerIndex === selected && !correct) classes.push('wrong')
                  return (
                    <button
                      key={answer}
                      type="button"
                      className={classes.join(' ')}
                      data-answer={answerIndex}
                      aria-pressed={answerIndex === selected}
                      disabled={checked}
                      onClick={() => setSelected(answerIndex)}
                    >
                      <span>{OPTION_LETTERS[answerIndex]}</span>
                      {answer}
                    </button>
                  )
                })}
              </div>
              <div
                id="lesson-feedback"
                className="lesson-feedback"
                role="status"
                aria-live="polite"
              >
                {feedback}
              </div>
            </div>
            <div className="lesson-bottom">
              <small>{sampleLesson.disclaimer}</small>
              <button
                ref={checkButtonRef}
                type="button"
                className="btn btn-primary"
                id="check-answer"
                disabled={!checked && selected < 0}
                onClick={handleAction}
              >
                {!checked ? (
                  <>
                    Kiểm tra <Icon name="check" />
                  </>
                ) : isLast ? (
                  <>
                    Làm lại <Icon name="rotate-ccw" />
                  </>
                ) : (
                  <>
                    Câu tiếp theo <Icon name="arrow-right" />
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="feature-copy">
            <span className="eyebrow">Học thử cùng Học Lực</span>
            <h2>
              {sampleLesson.featureTitle}
              <br />
              <span className="accent">{sampleLesson.featureAccent}</span>
            </h2>
            <ul className="feature-list">
              {sampleLesson.features.map((feature) => (
                <li key={feature.title}>
                  <span className="feature-check">
                    <Icon name="check" />
                  </span>
                  <div>
                    <h3>{feature.title}</h3>
                    <p>{feature.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <a className="text-link" href="#khoa-hoc">
              Xem khóa học <Icon name="arrow-right" />
            </a>
          </div>
        </div>
        {finished && (
          <div className="sample-next">
            <p>Bạn đã hoàn thành bài mẫu. Chọn bước tiếp theo của mình.</p>
            <a className="btn btn-primary" href="#khoa-hoc">
              Xem khóa học <Icon name="arrow-right" />
            </a>
            <AuthLink className="text-link">Làm đánh giá miễn phí</AuthLink>
          </div>
        )}
      </div>
    </section>
  )
}

export default SampleLessonSection
