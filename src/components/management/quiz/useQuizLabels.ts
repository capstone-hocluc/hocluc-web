import { useEffect } from 'react'
import { usePageResource } from '../../../hooks/usePageResource'
import { getQuizLabels } from '../../../services/quizLabelService'

export function useQuizLabels(quizId: string | null) {
  const resource = usePageResource(() => quizId ? getQuizLabels(quizId) : Promise.resolve(null), [quizId])
  const { data, setData, reload } = resource
  const active = data?.status === 'PENDING' || data?.status === 'RUNNING'
  useEffect(() => {
    if (!quizId || !active) return
    let mounted = true
    const timer = window.setTimeout(() => {
      void getQuizLabels(quizId).then(next => {
        if (mounted) setData(next)
      }).catch(() => {
        if (mounted) reload()
      })
    }, 2500)
    return () => {
      mounted = false
      window.clearTimeout(timer)
    }
  }, [quizId, active, data, setData, reload])
  return resource
}

export type QuizLabelResource = ReturnType<typeof useQuizLabels>
