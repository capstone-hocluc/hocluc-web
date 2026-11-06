import { useMemo, useState, type FormEvent } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import Button from '../../console/button'
import DataTable from '../../console/data-table'
import ConsoleDialog from '../../console/dialog'
import Field, { fieldControlClass } from '../../console/form-field'
import Notice from '../../console/notice'
import PageHeading from '../../console/page-heading'
import SearchSelectField from '../../console/search-select-field'
import Status from '../../console/status'
import { ConsoleTabs, ConsoleTabsContent, ConsoleTabsList, ConsoleTabsTrigger } from '../../console/tabs'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import { Pencil, Plus } from '../../console/icons'
import { IconAction, RowActions } from '../../console/icon-action'
import { Pagination } from '../../tailgrids/core/pagination'
import { CreditAmount } from '../../credits/CreditIcon'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import { CREDIT_ENTRY_LABELS, CREDIT_UNIT, creditEntryPurpose } from '../../../lib/credits'
import { getUsers } from '../../../services/userService'
import type { CreditPack } from '../../../services/creditService'
import {
  creditAdminService,
  type CreditAdminEntry,
  type CreditBucket,
  type CreditPackInput,
} from '../../../services/creditAdminService'
import { crudError } from './crud-errors'
import { EMPTY, formatDateTime, formatVnd } from './crud-format'

const studentLabel = (student: { displayName?: string; firstName?: string; lastName?: string; email?: string }) =>
  student.displayName || `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim() || student.email || ''

/**
 * Stars: the packs on sale and each learner's balance. Managers and administrators edit packs; only an
 * administrator corrects a balance or runs the one-time grant, the same split as the backend.
 */
export default function CreditManagement({
  title,
  canEditPacks,
  canAdjust,
}: {
  title: string
  canEditPacks: boolean
  canAdjust: boolean
}) {
  return (
    <section className="flex flex-col gap-5">
      <PageHeading title={title} readOnly={!canEditPacks && !canAdjust} />
      <ConsoleTabs defaultValue="packs" className="flex flex-col gap-4">
        <ConsoleTabsList aria-label={title}>
          <ConsoleTabsTrigger value="packs">Gói {CREDIT_UNIT}</ConsoleTabsTrigger>
          <ConsoleTabsTrigger value="balances">Số dư học viên</ConsoleTabsTrigger>
        </ConsoleTabsList>
        <ConsoleTabsContent value="packs">
          <PackTable canEdit={canEditPacks} />
        </ConsoleTabsContent>
        <ConsoleTabsContent value="balances">
          <Balances canAdjust={canAdjust} />
        </ConsoleTabsContent>
      </ConsoleTabs>
    </section>
  )
}

function PackTable({ canEdit }: { canEdit: boolean }) {
  const resource = useScheduleResource('admin-credit-packs', () => creditAdminService.packs())
  const [editing, setEditing] = useState<CreditPack | 'new' | null>(null)
  const columns = useMemo<ColumnDef<CreditPack>[]>(
    () => [
      {
        id: 'name',
        header: 'Gói',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-40">
            <strong className="block font-medium text-text-primary">{row.original.name}</strong>
            <span className="mt-1 block text-xs text-text-tertiary">{row.original.code}</span>
          </div>
        ),
      },
      { id: 'credits', header: CREDIT_UNIT, cell: ({ row }) => <CreditAmount value={row.original.credits} /> },
      { id: 'price', header: 'Giá', cell: ({ row }) => <span className="whitespace-nowrap">{formatVnd(row.original.price)}</span> },
      {
        id: 'active',
        header: 'Trạng thái',
        cell: ({ row }) =>
          row.original.active ? <Status tone="success">Đang bán</Status> : <Status tone="neutral">Đã tắt</Status>,
      },
      { id: 'displayOrder', header: 'Thứ tự', cell: ({ row }) => row.original.displayOrder },
      ...(canEdit
        ? [
            {
              id: 'actions',
              header: 'Thao tác',
              enableSorting: false,
              meta: { className: 'w-24 text-right' },
              cell: ({ row }) => (
                <RowActions>
                  <IconAction label="Sửa" icon={Pencil} onClick={() => setEditing(row.original)} />
                </RowActions>
              ),
            } satisfies ColumnDef<CreditPack>,
          ]
        : []),
    ],
    [canEdit]
  )

  return (
    <section className="overflow-hidden rounded-xl border border-card-border bg-card-background">
      {canEdit && (
        <div className="flex justify-end border-b border-card-border px-5 py-3">
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus size={16} />
            Thêm gói
          </Button>
        </div>
      )}
      <ScheduleResourceState skeleton="table" inset status={resource.status} errorMessage={resource.errorMessage} onRetry={resource.reload}>
        <DataTable columns={columns} data={resource.data ?? []} getRowKey={(pack) => pack.id} emptyMessage="Chưa có gói nào." />
      </ScheduleResourceState>
      {editing && (
        <PackDialog
          pack={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            resource.reload()
          }}
        />
      )}
    </section>
  )
}

function PackDialog({ pack, onClose, onSaved }: { pack: CreditPack | null; onClose: () => void; onSaved: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const input: CreditPackInput = {
      code: String(form.get('code') ?? '').trim(),
      name: String(form.get('name') ?? '').trim(),
      credits: Number(form.get('credits')),
      price: Number(form.get('price')),
      displayOrder: Number(form.get('displayOrder') ?? 0),
      active: form.get('active') === 'on',
    }
    setBusy(true)
    setError(null)
    try {
      if (pack) await creditAdminService.updatePack(pack.id, input)
      else await creditAdminService.createPack(input)
      onSaved()
    } catch (e) {
      setError(crudError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ConsoleDialog
      open
      onClose={onClose}
      dismissable={!busy}
      title={pack ? 'Sửa gói' : 'Thêm gói'}
      onSubmit={(event) => void submit(event)}
      footer={
        <>
          <Button appearance="outline" type="button" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Notice tone="danger">{error}</Notice>}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Mã">
            <input name="code" required maxLength={50} pattern="[A-Za-z0-9_-]+" defaultValue={pack?.code} className={fieldControlClass} />
          </Field>
          <Field label="Tên">
            <input name="name" required maxLength={200} defaultValue={pack?.name} className={fieldControlClass} />
          </Field>
          <Field label={`Số ${CREDIT_UNIT}`}>
            <input name="credits" type="number" required min={1} max={1000000} defaultValue={pack?.credits} className={fieldControlClass} />
          </Field>
          <Field label="Giá (VNĐ)">
            <input name="price" type="number" required min={1000} step={1000} defaultValue={pack?.price} className={fieldControlClass} />
          </Field>
          <Field label="Thứ tự hiển thị">
            <input name="displayOrder" type="number" defaultValue={pack?.displayOrder ?? 0} className={fieldControlClass} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input name="active" type="checkbox" defaultChecked={pack?.active ?? true} className="size-4" />
          Đang bán
        </label>
        {pack && <p className="text-xs text-text-tertiary">Đơn đã tạo giữ nguyên số {CREDIT_UNIT} và giá lúc mua.</p>}
      </div>
    </ConsoleDialog>
  )
}

function Balances({ canAdjust }: { canAdjust: boolean }) {
  const [studentId, setStudentId] = useState('')
  const [page, setPage] = useState(0)
  const [version, setVersion] = useState(0)
  const [adjusting, setAdjusting] = useState(false)
  const [granting, setGranting] = useState(false)
  const balance = useScheduleResource(studentId ? `admin-credit-balance:${studentId}:${version}` : null, () =>
    creditAdminService.balance(studentId)
  )
  const history = useScheduleResource(studentId ? `admin-credit-history:${studentId}:${page}:${version}` : null, () =>
    creditAdminService.history(studentId, page)
  )
  const columns = useMemo<ColumnDef<CreditAdminEntry>[]>(
    () => [
      {
        id: 'type',
        header: 'Loại',
        enableSorting: false,
        cell: ({ row }) => {
          const purpose = creditEntryPurpose(row.original.refType)
          return (
            <div className="min-w-40">
              <span className="block font-medium text-text-primary">
                {CREDIT_ENTRY_LABELS[row.original.type]}
                {purpose ? ` · ${purpose}` : ''}
              </span>
              {row.original.note && <span className="mt-1 block truncate text-xs text-text-tertiary">{row.original.note}</span>}
            </div>
          )
        },
      },
      { id: 'bonus', header: 'Thưởng', cell: ({ row }) => delta(row.original.bonusDelta) },
      { id: 'paid', header: 'Đã mua', cell: ({ row }) => delta(row.original.paidDelta) },
      { id: 'held', header: 'Tạm giữ', cell: ({ row }) => delta(row.original.heldDelta) },
      { id: 'balanceAfter', header: 'Số dư sau', cell: ({ row }) => row.original.balanceAfter },
      {
        id: 'createdAt',
        header: 'Thời gian',
        enableSorting: false,
        cell: ({ row }) => <span className="whitespace-nowrap">{formatDateTime(row.original.createdAt)}</span>,
      },
    ],
    []
  )

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchSelectField
          ariaLabel="Học viên"
          value={studentId}
          onChange={(value) => {
            setStudentId(value)
            setPage(0)
          }}
          placeholder="Chọn học viên"
          searchPlaceholder="Tìm học viên theo tên hoặc email"
          className="w-full max-w-md"
          triggerClassName="w-full"
          loadPage={(term, pageIndex) =>
            getUsers({ role: 'STUDENT', query: term, page: pageIndex, size: 20, sort: 'displayName,asc' }).then((result) => ({
              options: result.content.map((student) => ({ id: student.id, label: studentLabel(student) })),
              last: result.last,
            }))
          }
        />
        {canAdjust && (
          <div className="flex gap-2">
            {studentId && (
              <Button appearance="outline" size="sm" onClick={() => setAdjusting(true)}>
                Điều chỉnh số dư
              </Button>
            )}
            <Button appearance="outline" size="sm" onClick={() => setGranting(true)}>
              Tặng {CREDIT_UNIT} cho người đang có quyền hỏi mentor
            </Button>
          </div>
        )}
      </div>

      {studentId && (
        <section className="overflow-hidden rounded-xl border border-card-border bg-card-background">
          <ScheduleResourceState skeleton="table" inset status={balance.status} errorMessage={balance.errorMessage} onRetry={balance.reload}>
            {balance.data && (
              <dl className="grid grid-cols-4 gap-4 border-b border-card-border px-5 py-4 text-sm max-sm:grid-cols-2">
                {[
                  ['Có thể dùng', balance.data.available],
                  ['Thưởng', balance.data.bonus],
                  ['Đã mua', balance.data.paid],
                  ['Tạm giữ', balance.data.held],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <dt className="text-text-tertiary">{label}</dt>
                    <dd className="mt-1">
                      <CreditAmount value={value as number} />
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </ScheduleResourceState>
          <ScheduleResourceState skeleton="table" inset status={history.status} errorMessage={history.errorMessage} onRetry={history.reload}>
            <DataTable columns={columns} data={history.data?.content ?? []} getRowKey={(row) => row.id} emptyMessage={`Chưa có giao dịch ${CREDIT_UNIT}.`} />
            {(history.data?.totalPages ?? 0) > 1 && (
              <div className="border-t border-card-border px-5 py-4">
                <Pagination
                  currentPage={page + 1}
                  totalPages={history.data?.totalPages ?? 1}
                  onPageChange={(next) => setPage(next - 1)}
                  sideLayout="icon"
                />
              </div>
            )}
          </ScheduleResourceState>
        </section>
      )}

      {adjusting && studentId && (
        <AdjustDialog
          studentId={studentId}
          onClose={() => setAdjusting(false)}
          onDone={() => {
            setAdjusting(false)
            setPage(0)
            setVersion((v) => v + 1)
          }}
        />
      )}
      {granting && <GrantDialog onClose={() => setGranting(false)} onDone={() => setVersion((v) => v + 1)} />}
    </section>
  )
}

function delta(value: number) {
  if (value === 0) return <span className="text-text-tertiary">{EMPTY}</span>
  return <span className={value > 0 ? 'text-success-500' : 'text-text-primary'}>{value > 0 ? `+${value}` : value}</span>
}

function AdjustDialog({ studentId, onClose, onDone }: { studentId: string; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requestId] = useState(() => crypto.randomUUID())

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const amount = Number(form.get('amount'))
    if (!Number.isInteger(amount) || amount === 0) {
      setError('Nhập một số khác 0; số âm để trừ.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await creditAdminService.adjust(studentId, {
        amount,
        bucket: form.get('bucket') as CreditBucket,
        reason: String(form.get('reason') ?? '').trim(),
        requestId,
      })
      onDone()
    } catch (e) {
      setError(crudError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ConsoleDialog
      open
      onClose={onClose}
      dismissable={!busy}
      title="Điều chỉnh số dư"
      onSubmit={(event) => void submit(event)}
      footer={
        <>
          <Button appearance="outline" type="button" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Notice tone="danger">{error}</Notice>}
        <div className="grid grid-cols-2 gap-4">
          <Field label={`Số ${CREDIT_UNIT}`} hint="Số âm để trừ.">
            <input name="amount" type="number" required step={1} className={fieldControlClass} />
          </Field>
          <Field label="Loại">
            <select name="bucket" defaultValue="BONUS" className={fieldControlClass}>
              <option value="BONUS">Thưởng (có thể hết hạn)</option>
              <option value="PAID">Đã mua (không hết hạn)</option>
            </select>
          </Field>
        </div>
        <Field label="Lý do">
          <input name="reason" required maxLength={500} className={fieldControlClass} />
        </Field>
      </div>
    </ConsoleDialog>
  )
}

function GrantDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ granted: number; alreadyGranted: number } | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError(null)
    try {
      setResult(await creditAdminService.grantChatAccessHolders(Number(form.get('amount')), Number(form.get('validDays'))))
      onDone()
    } catch (e) {
      setError(crudError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ConsoleDialog
      open
      onClose={onClose}
      dismissable={!busy}
      title={`Tặng ${CREDIT_UNIT} cho người đang có quyền hỏi mentor`}
      onSubmit={result ? undefined : (event) => void submit(event)}
      footer={
        result ? (
          <Button type="button" onClick={onClose}>
            Đóng
          </Button>
        ) : (
          <>
            <Button appearance="outline" type="button" onClick={onClose} disabled={busy}>
              Hủy
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Đang tặng...' : 'Tặng'}
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">
          Học viên đang có khóa đã mua còn hạn từng được hỏi mentor miễn phí. Mỗi người chỉ nhận một lần, chạy lại không cộng thêm.
        </p>
        {error && <Notice tone="danger">{error}</Notice>}
        {result ? (
          <Notice tone="info">
            Đã tặng {result.granted} học viên; {result.alreadyGranted} học viên đã nhận trước đó.
          </Notice>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Field label={`Số ${CREDIT_UNIT} mỗi người`}>
              <input name="amount" type="number" required min={1} max={10000} defaultValue={50} className={fieldControlClass} />
            </Field>
            <Field label="Hiệu lực (ngày)">
              <input name="validDays" type="number" required min={1} max={3650} defaultValue={180} className={fieldControlClass} />
            </Field>
          </div>
        )}
      </div>
    </ConsoleDialog>
  )
}
