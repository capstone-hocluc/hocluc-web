import { useEffect, useState } from 'react'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import { creditAdminService } from '../../../services/creditAdminService'

export function useCreditStudentList(version: number) {
  const [query, setQuery] = useState('')
  const [term, setTerm] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    if (term === query.trim()) return
    const timer = window.setTimeout(() => {
      setTerm(query.trim())
      setPage(0)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [query, term])

  const resource = useScheduleResource(
    `credit-student-list:${term}:${page}:${version}`,
    () => creditAdminService.balances(term, page)
  )
  return { query, setQuery, page, setPage, ...resource }
}
