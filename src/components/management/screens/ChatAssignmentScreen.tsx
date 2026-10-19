import SelectField from '../../console/select-field'
import { useEffect, useRef, useState } from 'react'
import { AUTH_TOKENS_EVENT, ApiError, getAccessToken, type ApiResponse } from '../../../lib/api'
import { useCurrentUser } from '../../../hooks/useCurrentUser'
import { useUnsavedActionGuard } from '../../../hooks/useUnsavedActionGuard'
import { chatService } from '../../../services/chatService'
import type { ChatManagementConversation, ChatPerson, ChatStatus } from '../../../types/chat'
import Button from '../../console/button'
import Dialog from '../../console/dialog'
import Field, { fieldControlClass, textareaControlClass } from '../../console/form-field'
import Notice from '../../console/notice'
import Status from '../../console/status'
import ConfirmDialog from '../../console/confirm-dialog'

interface ChatAssignmentScreenProps {
  role: string
  conversationId?: string
  onSelectConversation: (id?: string) => void
}

const statuses: Record<ChatStatus, string> = { OPEN: 'Chờ hỗ trợ', IN_PROGRESS: 'Đang hỗ trợ', RESOLVED: 'Đã hoàn thành' }
const validId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
function tokenIdentity() {
  const token = getAccessToken()
  if (!token) return ''
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (!payload.sub) return 'authenticated'
    // Include the active role so a role switch on the same account also resets local metadata.
    return `${payload.sub}:${payload.role ?? payload.roles ?? ''}`
  }
  catch { return 'authenticated' }
}
function data<T>(response: ApiResponse<T>): T {
  if (!response.success || response.data === undefined) throw new Error(response.message || 'Không tải được dữ liệu.')
  return response.data
}
function failure(error: unknown) {
  if (error instanceof ApiError && [404, 501, 503].includes(error.status)) return 'Dịch vụ Hỏi Mentor chưa sẵn sàng.'
  if (error instanceof ApiError && error.status === 403) return 'Bạn không có quyền xem yêu cầu này.'
  return error instanceof Error ? error.message : 'Không tải được dữ liệu. Vui lòng thử lại.'
}
const date = (value: string) => {
  const result = new Date(value)
  return Number.isNaN(result.getTime()) ? 'Chưa có thông tin' : result.toLocaleString('vi-VN')
}

// Only explicit metadata fields are rendered. This screen never requests messages or snapshots.
export default function ChatAssignmentScreen({ role, conversationId, onSelectConversation }: ChatAssignmentScreenProps) {
  const { profile } = useCurrentUser()
  const [identity, setIdentity] = useState(tokenIdentity)
  const identityRef = useRef(identity)
  const allowed = !!identity && !!profile?.id && ['STAFF', 'ADMINISTRATOR', 'MANAGER'].includes(role)
  const canAssign = role === 'STAFF' || role === 'ADMINISTRATOR'
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ChatStatus | ''>('')
  const [subject, setSubject] = useState('')
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([])
  const [list, setList] = useState<{ scope: string; items: ChatManagementConversation[]; cursor: string | null }>({ scope: '', items: [], cursor: null })
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState('')
  const [detail, setDetail] = useState<{ scope: string; value: ChatManagementConversation } | null>(null)
  const [detailError, setDetailError] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [assignOpen, setAssignOpen] = useState(false)
  const [mentorSearch, setMentorSearch] = useState('')
  const [mentors, setMentors] = useState<ChatPerson[]>([])
  const [mentorCursor, setMentorCursor] = useState<string | null>(null)
  const [mentorId, setMentorId] = useState('')
  const [reason, setReason] = useState('')
  const [mentorLoading, setMentorLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [assignmentError, setAssignmentError] = useState('')
  const listEpoch = useRef(0)
  const detailEpoch = useRef(0)
  const mentorEpoch = useRef(0)
  const actor = `${profile?.id ?? ''}|${identity}|${role}`
  const scope = `${actor}|${search}|${status}|${subject}`
  const detailScope = `${actor}|${conversationId ?? ''}`
  const current = detail?.scope === detailScope ? detail.value : null
  const rows = list.scope === scope ? list.items : []
  const guard = useUnsavedActionGuard(assignOpen && (!!mentorId || !!reason.trim()), assigning)
  const { cancelDiscard } = guard
  const closeAssignment = () => guard.requestAction(() => { setAssignOpen(false); setMentorId(''); setReason('') })

  useEffect(() => {
    const syncIdentity = () => {
      const next = tokenIdentity()
      if (next === identityRef.current) return
      identityRef.current = next
      ++listEpoch.current; ++detailEpoch.current; ++mentorEpoch.current
      setIdentity(next); setList({ scope: '', items: [], cursor: null }); setDetail(null)
      setAssignOpen(false); setMentors([]); setMentorId(''); setReason(''); setAssignmentError('')
      cancelDiscard()
    }
    window.addEventListener(AUTH_TOKENS_EVENT, syncIdentity)
    window.addEventListener('storage', syncIdentity)
    return () => { window.removeEventListener(AUTH_TOKENS_EVENT, syncIdentity); window.removeEventListener('storage', syncIdentity) }
  }, [cancelDiscard])

  useEffect(() => {
    let active = true
    if (allowed) void chatService.listSubjects().then((response) => { if (active) setSubjects(data(response)) }).catch(() => { if (active) setSubjects([]) })
    return () => { active = false }
  }, [allowed, actor])

  useEffect(() => {
    const epoch = ++listEpoch.current
    queueMicrotask(() => { if (epoch === listEpoch.current) { setLoading(allowed); setListError('') } })
    if (!allowed) return
    const timer = window.setTimeout(() => {
      void chatService.listManagementConversations({ search: search.trim() || undefined, status: status || undefined, subjectCategoryId: subject || undefined, limit: 25 }).then((response) => {
        if (epoch !== listEpoch.current) return
        const page = data(response)
        setList({ scope, items: page.items, cursor: page.nextCursor })
      }).catch((error: unknown) => { if (epoch === listEpoch.current) { setList({ scope, items: [], cursor: null }); setListError(failure(error)) } }).finally(() => { if (epoch === listEpoch.current) setLoading(false) })
    }, 250)
    return () => { window.clearTimeout(timer); listEpoch.current = epoch + 1 }
  }, [allowed, role, search, status, subject, scope, refresh])

  useEffect(() => {
    const epoch = ++detailEpoch.current
    queueMicrotask(() => {
      if (epoch !== detailEpoch.current) return
      setDetail(null); setDetailError(''); setAssignOpen(false); setAssignmentError(''); setDetailLoading(false)
      if (!allowed || !conversationId) return
      if (!validId(conversationId)) { setDetailError('Mã yêu cầu không hợp lệ.'); return }
      setDetailLoading(true)
      void chatService.getManagementConversation(conversationId).then((response) => {
        if (epoch === detailEpoch.current) setDetail({ scope: detailScope, value: data(response) })
      }).catch((error: unknown) => { if (epoch === detailEpoch.current) setDetailError(failure(error)) }).finally(() => { if (epoch === detailEpoch.current) setDetailLoading(false) })
    })
    return () => { detailEpoch.current = epoch + 1 }
  }, [allowed, conversationId, detailScope, refresh])

  useEffect(() => {
    const epoch = ++mentorEpoch.current
    queueMicrotask(() => { if (epoch === mentorEpoch.current) { setMentors([]); setMentorCursor(null); setMentorId(''); setMentorLoading(assignOpen && canAssign) } })
    if (!assignOpen || !canAssign) return
    const timer = window.setTimeout(() => {
      void chatService.listMentors({ conversationId, search: mentorSearch.trim() || undefined, limit: 25 }).then((response) => {
        if (epoch !== mentorEpoch.current) return
        const page = data(response)
        setMentors(page.items); setMentorCursor(page.nextCursor)
      }).catch((error: unknown) => { if (epoch === mentorEpoch.current) setAssignmentError(failure(error)) }).finally(() => { if (epoch === mentorEpoch.current) setMentorLoading(false) })
    }, 250)
    return () => { window.clearTimeout(timer); mentorEpoch.current = epoch + 1 }
  }, [assignOpen, canAssign, mentorSearch, role, conversationId])

  async function loadMore() {
    if (loading || list.scope !== scope || !list.cursor) return
    const epoch = listEpoch.current
    setLoading(true); setListError('')
    try {
      const page = data(await chatService.listManagementConversations({ search: search.trim() || undefined, status: status || undefined, subjectCategoryId: subject || undefined, cursor: list.cursor, limit: 25 }))
      if (epoch === listEpoch.current) setList((previous) => ({ scope, items: [...previous.items, ...page.items.filter((item) => !previous.items.some((old) => old.id === item.id))], cursor: page.nextCursor }))
    } catch (error) { if (epoch === listEpoch.current) setListError(failure(error)) }
    finally { if (epoch === listEpoch.current) setLoading(false) }
  }
  async function loadMoreMentors() {
    if (mentorLoading || !mentorCursor) return
    const epoch = mentorEpoch.current
    setMentorLoading(true)
    try {
      if (!conversationId) return
      const page = data(await chatService.listMentors({ conversationId, search: mentorSearch.trim() || undefined, cursor: mentorCursor, limit: 25 }))
      if (epoch === mentorEpoch.current) { setMentors((previous) => [...previous, ...page.items.filter((item) => !previous.some((old) => old.id === item.id))]); setMentorCursor(page.nextCursor) }
    } catch (error) { if (epoch === mentorEpoch.current) setAssignmentError(failure(error)) }
    finally { if (epoch === mentorEpoch.current) setMentorLoading(false) }
  }
  async function assign() {
    if (!current || !canAssign || assigning || !mentorId || !reason.trim()) return
    const epoch = detailEpoch.current
    setAssigning(true); setAssignmentError('')
    try {
      const updated = data(await chatService.assign(current.id, { mentorId, expectedAssignmentVersion: current.assignmentVersion, reason: reason.trim() }))
      if (epoch !== detailEpoch.current) return
      setDetail({ scope: detailScope, value: updated })
      setList((previous) => ({ ...previous, items: previous.items.map((item) => item.id === updated.id ? updated : item) }))
      setAssignOpen(false); setReason('')
    } catch (error) {
      if (epoch !== detailEpoch.current) return
      if (error instanceof ApiError && error.status === 409) {
        setAssignmentError('Phân công đã thay đổi. Đang tải lại thông tin; hãy kiểm tra rồi phân công lại.')
        try {
          const updated = data(await chatService.getManagementConversation(current.id))
          if (epoch === detailEpoch.current) setDetail({ scope: detailScope, value: updated })
        } catch (reloadError) { if (epoch === detailEpoch.current) { setDetail(null); setAssignmentError(failure(reloadError)) } }
      } else setAssignmentError(failure(error))
    } finally { setAssigning(false) }
  }

  if (!allowed) return <Notice tone="danger">Bạn không có quyền xem hàng đợi Hỏi Mentor.</Notice>
  return <div className="space-y-4">
    <Notice>{role === 'MANAGER' ? 'Theo dõi trạng thái xử lý và Mentor phụ trách.' : 'Phân công Mentor để xử lý yêu cầu hỗ trợ.'} Nội dung hội thoại chỉ dành cho học sinh và Mentor phụ trách.</Notice>
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
      <section aria-label="Hàng đợi Hỏi Mentor" className={`${conversationId ? 'hidden lg:block' : ''} rounded-xl border border-card-border bg-card-background p-4`}>
        <div className="space-y-3">
          <Field label="Tìm yêu cầu"><input className={fieldControlClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tiêu đề hoặc học sinh" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Trạng thái"><SelectField
              ariaLabel="Trạng thái"
              triggerClassName={fieldControlClass}
              value={status}
              onChange={(nextValue) => setStatus(nextValue as ChatStatus | '')}
              options={[
                { id: '', label: 'Tất cả' },
                ...Object.entries(statuses).map(([value, label]) => ({ id: String(value), label })),
              ]}
            /></Field>
            <Field label="Môn học"><SelectField
              ariaLabel="Môn học"
              triggerClassName={fieldControlClass}
              value={subject}
              onChange={(nextValue) => setSubject(nextValue)}
              options={[
                { id: '', label: 'Tất cả' },
                ...subjects.map((item) => ({ id: String(item.id), label: item.name })),
              ]}
            /></Field>
          </div>
        </div>
        {listError && <Notice tone="danger" className="mt-4">{listError}<Button size="sm" appearance="ghost" onClick={() => setRefresh((value) => value + 1)}>Thử lại</Button></Notice>}
        <div aria-busy={loading} className="mt-4 space-y-2">
          {rows.map((item) => <button key={item.id} type="button" onClick={() => onSelectConversation(item.id)} aria-pressed={conversationId === item.id} className={`w-full rounded-lg border p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 ${conversationId === item.id ? 'border-input-primary-focus-border bg-background-gray-secondary' : 'border-card-border hover:bg-background-gray-secondary'}`}>
            <p className="truncate font-medium text-text-primary">{item.title}</p>
            <p className="mt-1 text-sm text-text-tertiary">{item.student.displayName} · {item.subjectName || 'Chưa có môn học'}</p>
            <div className="mt-2 flex flex-wrap gap-2"><Status tone={item.status === 'RESOLVED' ? 'success' : 'warning'}>{statuses[item.status]}</Status><span className="text-xs text-text-tertiary">{item.mentor?.displayName || 'Chưa phân công'}</span></div>
          </button>)}
          {loading && <p role="status" className="py-4 text-sm text-text-tertiary">Đang tải yêu cầu…</p>}
          {!loading && !listError && rows.length === 0 && <p className="py-6 text-sm text-text-tertiary">Không có yêu cầu phù hợp.</p>}
          {list.scope === scope && list.cursor && <Button appearance="outline" disabled={loading} onClick={() => void loadMore()}>Tải thêm yêu cầu</Button>}
        </div>
      </section>
      <section aria-label="Thông tin yêu cầu" className={`${!conversationId ? 'hidden lg:block' : ''} min-w-0 rounded-xl border border-card-border bg-card-background p-5`}>
        {conversationId && <Button size="sm" appearance="ghost" className="mb-4 lg:hidden" onClick={() => onSelectConversation()}>Quay lại hàng đợi</Button>}
        {!conversationId && <p className="py-16 text-center text-text-tertiary">Chọn yêu cầu để xem trạng thái và Mentor phụ trách.</p>}
        {detailLoading && <p role="status" className="text-text-tertiary">Đang tải thông tin…</p>}
        {detailError && <Notice tone="danger">{detailError}<Button size="sm" appearance="ghost" onClick={() => setRefresh((value) => value + 1)}>Thử lại</Button></Notice>}
        {current && <>
          <h2 className="break-words text-xl font-semibold text-text-primary">{current.title}</h2>
          <div className="mt-3"><Status tone={current.status === 'RESOLVED' ? 'success' : 'warning'}>{statuses[current.status]}</Status></div>
          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            {[['Học sinh', current.student.displayName], ['Môn học', current.subjectName || 'Chưa có thông tin'], ['Mentor phụ trách', current.mentor?.displayName || 'Chưa phân công'], ['Cập nhật', date(current.updatedAt)]].map(([label, value]) => <div key={label}><dt className="text-sm text-text-tertiary">{label}</dt><dd className="mt-1 break-words font-medium text-text-primary">{value}</dd></div>)}
          </dl>
          {canAssign && current.status !== 'RESOLVED' && <Button className="mt-6" disabled={assigning} onClick={() => { setAssignmentError(''); setMentorSearch(''); setReason(''); setAssignOpen(true) }}>{current.mentor ? 'Đổi Mentor' : 'Phân công Mentor'}</Button>}
        </>}
      </section>
    </div>
    <Dialog open={assignOpen && canAssign && !!current} onClose={() => { if (!assigning) closeAssignment() }} title="Phân công Mentor" description="Chọn Mentor phụ trách và ghi lý do phân công." dismissable={!assigning} onSubmit={() => void assign()} footer={<><Button appearance="outline" disabled={assigning} onClick={closeAssignment}>Hủy</Button><Button type="submit" disabled={assigning || !mentorId || !reason.trim()}>{assigning ? 'Đang lưu…' : 'Lưu phân công'}</Button></>}>
      <div className="space-y-4">
        {assignmentError && <Notice tone="danger">{assignmentError}</Notice>}
        <Field label="Tìm Mentor"><input className={fieldControlClass} value={mentorSearch} disabled={assigning} onChange={(event) => setMentorSearch(event.target.value)} placeholder="Tên Mentor" /></Field>
        <Field label="Mentor phụ trách"><SelectField
          ariaLabel="Mentor phụ trách"
          triggerClassName={fieldControlClass}
          value={mentorId}
          required
          disabled={assigning}
          onChange={(nextValue) => setMentorId(nextValue)}
          options={[
            { id: '', label: 'Chọn Mentor' },
            ...mentors.map((mentor) => ({ id: String(mentor.id), label: mentor.displayName })),
          ]}
        /></Field>
        {mentorLoading && <p role="status" className="text-sm text-text-tertiary">Đang tải Mentor…</p>}
        {!mentorLoading && mentors.length === 0 && <p className="text-sm text-text-tertiary">Chưa tìm thấy Mentor.</p>}
        {mentorCursor && <Button size="sm" appearance="outline" disabled={mentorLoading || assigning} onClick={() => void loadMoreMentors()}>Tải thêm Mentor</Button>}
        <Field label="Lý do phân công"><textarea className={textareaControlClass} required maxLength={1000} value={reason} disabled={assigning} onChange={(event) => setReason(event.target.value)} /></Field>
      </div>
    </Dialog>
    {guard.hasPendingAction && <ConfirmDialog title="Bỏ thay đổi phân công?" description="Thông tin phân công chưa được lưu." cancelLabel="Tiếp tục chỉnh sửa" confirmLabel="Bỏ thay đổi" onCancel={guard.cancelDiscard} onConfirm={() => { setReason(''); setMentorId(''); setAssignOpen(false); guard.confirmDiscard() }} />}
  </div>
}
