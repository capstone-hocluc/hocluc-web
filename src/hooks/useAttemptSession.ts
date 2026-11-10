import { useEffect, useRef, useState } from 'react'
import { saveAnswer, submitAttempt, type QuizAttemptDetail } from '../services/assessmentService'
import { accessTokenIdentity } from '../lib/api'
import { getErrorMessage } from '../lib/errors'
import { showErrorToast } from '../lib/toastBus'

// State machine of one in-progress attempt, shared by the course-quiz and the
// placement attempt pages (they used to carry identical copies): restored
// answers, ordered per-question autosave, the
// single-flight submit that waits for pending saves, and timer expiry.
// The pages own data loading and call `hydrate` with the loaded attempt.
export function useAttemptSession(onSubmitted: (attemptId: string) => void) {
  const [attempt, setAttempt] = useState<QuizAttemptDetail | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const [savingQuestionIds, setSavingQuestionIds] = useState<Set<string>>(new Set())
  const [failedQuestionIds, setFailedQuestionIds] = useState<Set<string>>(new Set())
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [expired, setExpired] = useState(false)

  const submitInFlightRef = useRef(false)
  const expiredRef = useRef(false)
  const mountedRef = useRef(false)
  const pendingSavesRef = useRef<Map<string, Promise<void>>>(new Map())
  const failedAnswersRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const hydrate = (attemptData: QuizAttemptDetail) => {
    setAttempt(attemptData)
    const restored: Record<string, string> = {}
    attemptData.answers.forEach((answer) => {
      if (answer.selectedOptionId) restored[answer.questionId] = answer.selectedOptionId
    })
    setSelectedAnswers(restored)
    setCurrentIndex(0)
  }

  const answeredCount = Object.keys(selectedAnswers).length
  const isActive = attempt?.status === 'IN_PROGRESS' && !expired
  const inputsDisabled = !isActive || submitting

  const queueAnswer = (attemptId: string, questionId: string, optionId: string) => {
    const identity = accessTokenIdentity()
    const pending = pendingSavesRef.current
    failedAnswersRef.current.delete(questionId)
    setFailedQuestionIds(new Set(failedAnswersRef.current.keys()))
    setSavingQuestionIds((prev) => new Set(prev).add(questionId))

    // One write at a time per question so an older choice cannot overwrite a newer one.
    const savePromise = (pending.get(questionId) ?? Promise.resolve())
      .then(async () => {
        if (pending.get(questionId) !== savePromise || accessTokenIdentity() !== identity) return
        await saveAnswer(attemptId, { questionId, selectedOptionId: optionId })
      })
      .catch((error) => {
        if (pending.get(questionId) !== savePromise || accessTokenIdentity() !== identity) return
        failedAnswersRef.current.set(questionId, optionId)
        if (!mountedRef.current) return
        setFailedQuestionIds(new Set(failedAnswersRef.current.keys()))
        showErrorToast(getErrorMessage(error))
      })
      .finally(() => {
        if (pending.get(questionId) !== savePromise) return
        pending.delete(questionId)
        if (!mountedRef.current) return
        setSavingQuestionIds((prev) => {
          const next = new Set(prev)
          next.delete(questionId)
          return next
        })
      })
    pending.set(questionId, savePromise)
  }

  const selectOption = (questionId: string, optionId: string) => {
    if (!attempt || inputsDisabled || submitInFlightRef.current || expiredRef.current) return
    if (selectedAnswers[questionId] === optionId && !failedAnswersRef.current.has(questionId)) return
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionId }))
    queueAnswer(attempt.attemptId, questionId, optionId)
  }

  const retryFailedAnswers = () => {
    if (!attempt || inputsDisabled || submitInFlightRef.current || expiredRef.current) return
    for (const [questionId, optionId] of Array.from(failedAnswersRef.current.entries())) {
      queueAnswer(attempt.attemptId, questionId, optionId)
    }
  }

  const performSubmit = async () => {
    if (submitInFlightRef.current || !attempt || attempt.status !== 'IN_PROGRESS') return
    const identity = accessTokenIdentity()
    submitInFlightRef.current = true
    setSubmitting(true)
    try {
      await Promise.allSettled(Array.from(pendingSavesRef.current.values()))
      if (!mountedRef.current || accessTokenIdentity() !== identity) return
      if (attempt.deadlineAt && Date.parse(attempt.deadlineAt) <= Date.now()) {
        expiredRef.current = true
        setExpired(true)
      }
      if (!expiredRef.current && failedAnswersRef.current.size > 0) {
        showErrorToast('Còn đáp án chưa lưu. Hãy lưu lại trước khi nộp bài.')
        return
      }
      await submitAttempt(attempt.attemptId)
      if (mountedRef.current && accessTokenIdentity() === identity) onSubmitted(attempt.attemptId)
    } catch (error) {
      if (mountedRef.current) showErrorToast(getErrorMessage(error))
    } finally {
      submitInFlightRef.current = false
      if (mountedRef.current) setSubmitting(false)
    }
  }

  const handleExpire = () => {
    expiredRef.current = true
    setExpired(true)
    setShowSubmitDialog(false)
    void performSubmit()
  }

  const handleConfirmSubmit = () => {
    setShowSubmitDialog(false)
    void performSubmit()
  }

  return {
    attempt,
    hydrate,
    currentIndex,
    setCurrentIndex,
    selectedAnswers,
    savingQuestionIds,
    failedQuestionIds,
    answeredCount,
    isActive,
    expired,
    inputsDisabled,
    submitting,
    showSubmitDialog,
    setShowSubmitDialog,
    selectOption,
    retryFailedAnswers,
    retryExpiredSubmit: performSubmit,
    handleExpire,
    handleConfirmSubmit,
  }
}

export type AttemptSession = ReturnType<typeof useAttemptSession>
