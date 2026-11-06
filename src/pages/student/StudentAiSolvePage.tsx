import { useEffect, useRef, useState } from 'react'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import StudentPageHeader from '../../components/student/layout/StudentPageHeader'
import SectionHeader from '../../components/student/common/SectionHeader'
import MascotState from '../../components/common/MascotState'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Notice from '../../components/ui/Notice'
import Skeleton from '../../components/ui/Skeleton'
import MathText from '../../components/ui/MathText'
import { Field, Textarea } from '../../components/ui/Field'
import { ImagePlus, RefreshCw } from '../../components/console/icons'
import { CreditAmount } from '../../components/credits/CreditIcon'
import { ApiError } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { formatDateTime } from '../../lib/courseFormat'
import { CREDIT_UNIT, refreshCredits, useCredits } from '../../lib/credits'
import { creditService, type SolveRequest } from '../../services/creditService'
import { cn } from '../../lib/cn'

/** What one photo costs; the backend charges it and refuses when the balance is short. */
const SOLVE_PRICE = 2
const MAX_BYTES = 5 * 1024 * 1024
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp']
const POLL_MS = 2500

interface StudentAiSolvePageProps {
  onOpenWallet: () => void
}

/** "Gia sư AI": the student photographs one problem and gets a step-by-step solution. */
function StudentAiSolvePage({ onOpenWallet }: StudentAiSolvePageProps) {
  const [current, setCurrent] = useState<SolveRequest | null>(null)
  const [historyVersion, setHistoryVersion] = useState(0)

  // Poll the open request until its answer is ready.
  useEffect(() => {
    if (!current || current.status !== 'QUEUED') return
    const id = window.setTimeout(async () => {
      try {
        const next = await creditService.solveRequest(current.id)
        setCurrent(next)
        if (next.status !== 'QUEUED') {
          void refreshCredits()
          setHistoryVersion((v) => v + 1)
        }
      } catch {
        // keep polling; a transient error must not drop the request
        setCurrent({ ...current })
      }
    }, POLL_MS)
    return () => window.clearTimeout(id)
  }, [current])

  return (
    <StudentPageContainer width="narrow" className="pb-10">
      <StudentPageHeader title="Gia sư AI" />
      <div className="flex flex-col gap-8">
        <AskCard
          onQueued={(request) => {
            setCurrent(request)
            setHistoryVersion((v) => v + 1)
            void refreshCredits()
          }}
          onOpenWallet={onOpenWallet}
        />
        {current && <SolutionCard request={current} />}
        <History version={historyVersion} selectedId={current?.id} onSelect={setCurrent} />
      </div>
    </StudentPageContainer>
  )
}

function AskCard({ onQueued, onOpenWallet }: { onQueued: (request: SolveRequest) => void; onOpenWallet: () => void }) {
  const { balance } = useCredits()
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const previewRef = useRef<string | null>(null)
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showPreview = (next: File | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = next ? URL.createObjectURL(next) : null
    setPreview(previewRef.current)
  }
  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
  }, [])

  const pick = (picked: File | undefined) => {
    setError(null)
    if (!picked) return
    if (!ACCEPTED.includes(picked.type) || picked.size > MAX_BYTES) {
      setError('Chọn một ảnh PNG, JPG hoặc WEBP, tối đa 5 MB.')
      return
    }
    setFile(picked)
    showPreview(picked)
  }

  const short = balance !== null && balance.available < SOLVE_PRICE

  const send = async () => {
    if (!file) return
    setSending(true)
    setError(null)
    try {
      const request = await creditService.solve(file, note)
      setFile(null)
      showPreview(null)
      setNote('')
      if (input.current) input.current.value = ''
      onQueued(request)
    } catch (e) {
      setError(e instanceof ApiError && e.code === 'INSUFFICIENT_CREDITS'
        ? `Bạn chưa đủ ${CREDIT_UNIT} để gửi ảnh này.`
        : getErrorMessage(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <Card variant="panel" radius="lg" padding="lg" className="flex flex-col gap-4">
      <input
        ref={input}
        type="file"
        accept={ACCEPTED.join(',')}
        className="hidden"
        onChange={(event) => pick(event.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={cn(
          'flex min-h-[200px] w-full cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed border-line bg-surface-soft text-text-muted transition-colors hover:border-line-brand hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2',
          preview && 'border-solid p-2'
        )}
      >
        {preview ? (
          <img src={preview} alt="Ảnh bài tập đã chọn" className="max-h-[360px] rounded-xl object-contain" />
        ) : (
          <>
            <ImagePlus size={32} />
            <span className="text-sm font-semibold text-text-body">Chụp hoặc chọn ảnh một bài tập</span>
            <span className="text-xs">PNG, JPG, WEBP · tối đa 5 MB</span>
          </>
        )}
      </button>

      <Field label="Bạn muốn hỏi thêm (không bắt buộc)">
        <Textarea
          rows={2}
          maxLength={1000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Ví dụ: em chưa hiểu bước đổi biến"
        />
      </Field>

      {short && (
        <Notice tone="warning" className="flex flex-wrap items-center gap-3">
          <span>Bạn cần {SOLVE_PRICE} {CREDIT_UNIT} để gửi một ảnh.</span>
          <Button appearance="ghost" size="sm" onClick={onOpenWallet}>
            Mua {CREDIT_UNIT}
          </Button>
        </Notice>
      )}
      {error && <Notice tone="danger">{error}</Notice>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-sm text-text-body">
          Mỗi ảnh <CreditAmount value={SOLVE_PRICE} />
          <span className="text-text-muted">· hoàn lại nếu không giải được</span>
        </span>
        <Button disabled={!file || sending || short} onClick={() => void send()}>
          {sending ? 'Đang gửi...' : 'Gửi ảnh'}
        </Button>
      </div>
    </Card>
  )
}

function SolutionCard({ request }: { request: SolveRequest }) {
  if (request.status === 'QUEUED') {
    return (
      <Card radius="lg" padding="lg" className="flex flex-col gap-3" aria-busy="true">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-text-heading">
          <RefreshCw size={16} className="animate-spin" />
          Đang đọc đề và giải...
        </p>
        <Skeleton className="h-5 w-3/4 rounded-md" />
        <Skeleton className="h-5 w-full rounded-md" />
        <Skeleton className="h-5 w-2/3 rounded-md" />
      </Card>
    )
  }
  if (request.status === 'FAILED') {
    return <Notice tone="danger">{request.error ?? 'Không giải được bài này, bạn đã được hoàn lại.'}</Notice>
  }
  const solution = request.solution
  if (!solution || solution.readable === false) {
    return (
      <Notice tone="warning">
        {solution?.answer ?? 'Không đọc được đề trong ảnh. Hãy chụp lại rõ hơn.'}
      </Notice>
    )
  }
  return (
    <Card variant="elevated" radius="lg" padding="lg" className="flex flex-col gap-5">
      {solution.problem && (
        <section className="flex flex-col gap-1.5">
          <h2 className="text-sm font-bold text-text-muted">Đề bài{solution.subject ? ` · ${solution.subject}` : ''}</h2>
          <div className="text-[15px] leading-relaxed text-text-heading">
            <MathText>{solution.problem}</MathText>
          </div>
        </section>
      )}
      {solution.steps && solution.steps.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-text-muted">Lời giải</h2>
          <ol className="flex flex-col gap-3">
            {solution.steps.map((step, index) => (
              <li key={index} className="flex gap-3 text-[15px] leading-relaxed text-text-body">
                <span className="grid size-6 flex-none place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary-text">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <MathText>{step}</MathText>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
      {solution.answer && (
        <section className="rounded-xl bg-surface-brand px-4 py-3">
          <h2 className="mb-1 text-sm font-bold text-primary-text">Đáp số</h2>
          <div className="text-[15px] font-semibold text-text-heading">
            <MathText>{solution.answer}</MathText>
          </div>
        </section>
      )}
    </Card>
  )
}

function History({ version, selectedId, onSelect }: {
  version: number
  selectedId?: string
  onSelect: (request: SolveRequest) => void
}) {
  const [rows, setRows] = useState<SolveRequest[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    creditService
      .solveHistory(0, 20)
      .then((page) => !cancelled && setRows(page.content))
      .catch((e) => !cancelled && setError(getErrorMessage(e)))
    return () => {
      cancelled = true
    }
  }, [version])

  return (
    <section>
      <SectionHeader title="Đã hỏi gần đây" />
      <div className="mt-4">
        {error && <Notice tone="danger">{error}</Notice>}
        {rows === null && !error && <Skeleton className="h-[180px] rounded-2xl" />}
        {rows !== null && rows.length === 0 && <MascotState title="Chưa có bài nào" />}
        {rows !== null && rows.length > 0 && (
          <Card radius="lg" padding="none">
            <ul className="divide-y divide-line">
              {rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(row)}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-surface-hover',
                      row.id === selectedId && 'bg-surface-brand'
                    )}
                  >
                    {row.imageUrl ? (
                      <img src={row.imageUrl} alt="" className="size-12 flex-none rounded-lg object-cover" />
                    ) : (
                      <span className="size-12 flex-none rounded-lg bg-surface-soft" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-text-heading">
                        {row.solution?.problem ?? row.note ?? 'Bài tập'}
                      </span>
                      <span className="text-xs text-text-muted">{formatDateTime(row.createdAt)}</span>
                    </span>
                    <span className={cn('text-xs font-semibold', row.status === 'DONE' ? 'text-success' : row.status === 'FAILED' ? 'text-danger' : 'text-text-muted')}>
                      {row.status === 'DONE' ? 'Đã giải' : row.status === 'FAILED' ? 'Đã hoàn lại' : 'Đang giải'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </section>
  )
}

export default StudentAiSolvePage
