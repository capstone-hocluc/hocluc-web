import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import Button from '../../console/button'
import ConfirmDialog from '../../console/confirm-dialog'
import DataTable from '../../console/data-table'
import Notice from '../../console/notice'
import PageHeading from '../../console/page-heading'
import Panel from '../../console/panel'
import SelectField from '../../console/select-field'
import Status from '../../console/status'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import { CheckCircle2, Pencil, Plus, Repeat2, Trash2 } from '../../console/icons'
import {
  ConsoleTabs,
  ConsoleTabsContent,
  ConsoleTabsList,
  ConsoleTabsTrigger,
} from '../../console/tabs'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import { getCategories, type Category } from '../../../services/categoryService'
import {
  activateVersion,
  deleteDraftVersion,
  getActiveCategories,
  getActiveContent,
  getVersionContent,
  getVersions,
  type MasterDataContent,
  type MasterDataVersion,
} from '../../../services/masterDataService'
import { crudError } from '../crud/crud-errors'
import { formatDateTime } from '../crud/crud-format'
import {
  contentSummary,
  TABLE_TABS,
  VERSION_STATUS_LABELS,
  VERSION_STATUS_TONES,
  type MasterDataTab,
} from './master-data-labels'
import MasterDataTable, { type Selection } from './master-data-tables'
import MasterDataDetail from './master-data-detail'
import MasterDataImportDialog from './master-data-import-dialog'
import MasterDataDiffDialog from './master-data-diff-dialog'
import MasterDataStructure, { MasterDataStructureSkeleton } from './master-data-structure'
import MasterDataEditorDialog, { type EditTarget } from './master-data-editor-dialog'
import MasterDataDeleteDialog, { type DeleteTarget } from './master-data-delete-dialog'
import MasterDataCloneDialog from './master-data-clone-dialog'
import { codePrefix } from './master-data-rules'

interface SubjectOption {
  id: string
  label: string
}

const STATUS_ORDER = { ACTIVE: 0, DRAFT: 1, RETIRED: 2 } as const

/** The version a subject opens on: the active one, else the newest import. */
function defaultVersion(versions: MasterDataVersion[]): MasterDataVersion | undefined {
  return versions.find((v) => v.status === 'ACTIVE') ?? versions[0]
}

/**
 * The subjects a workbook belongs to, in menu order: a group with subjects under it ("Sử dụng ngôn ngữ")
 * is left out and its subjects read "Group › Subject"; a top-level subject without children stays.
 */
function subjectTree(categories: Category[]): SubjectOption[] {
  const active = categories.filter((c) => c.active)
  const byOrder = (a: Category, b: Category) =>
    a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'vi')
  const ids = new Set(active.map((c) => c.id))
  const roots = active.filter((c) => !c.parentId || !ids.has(c.parentId)).sort(byOrder)
  const hasChildren = (root: Category) => active.some((c) => c.parentId === root.id)
  return roots.flatMap((root) => [
    ...(hasChildren(root) ? [] : [{ id: root.id, label: root.name }]),
    ...active
      .filter((c) => c.parentId === root.id)
      .sort(byOrder)
      .map((c) => ({ id: c.id, label: c.name })),
  ])
}

/**
 * Master data per subject: domains, question patterns, skills, micro-skills, mappings and error codes.
 * Staff import a workbook as a draft, compare it and activate it; teachers read the active version.
 */
export default function MasterDataManagement({
  title,
  reader,
}: {
  title: string
  reader: boolean
}) {
  const categories = useScheduleResource<SubjectOption[]>(
    reader ? 'md-subjects-active' : 'md-subjects',
    async () =>
      reader
        ? (await getActiveCategories()).map((c) => ({
            id: c.categoryId,
            label: `${c.categoryName} · v${c.version}`,
          }))
        : subjectTree(await getCategories())
  )
  const [pickedCategory, setPickedCategory] = useState<string | null>(null)
  const categoryId = pickedCategory ?? categories.data?.[0]?.id ?? null

  const versions = useScheduleResource(
    !reader && categoryId ? `md-versions:${categoryId}` : null,
    () => getVersions(categoryId!)
  )
  const [pickedVersion, setPickedVersion] = useState<string | null>(null)
  const versionList = useMemo(
    () =>
      [...(versions.data ?? [])].sort(
        (a, b) =>
          (b.importedAt ?? '').localeCompare(a.importedAt ?? '') ||
          STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      ),
    [versions.data]
  )
  const version = versionList.find((v) => v.id === pickedVersion) ?? defaultVersion(versionList)

  const contentKey = reader
    ? categoryId
      ? `md-active:${categoryId}`
      : null
    : version
      ? `md-content:${version.id}`
      : null
  const content = useScheduleResource(contentKey, () =>
    reader ? getActiveContent(categoryId!) : getVersionContent(version!.id)
  )
  // A reload after an edit keeps the old rows on screen until the new ones arrive, so the diagram,
  // the open table and its search stay where they were.
  const [kept, setKept] = useState<{ key: string; data: MasterDataContent } | null>(null)
  if (content.data && contentKey && (kept?.key !== contentKey || kept.data !== content.data)) {
    setKept({ key: contentKey, data: content.data })
  }
  const shownContent = content.data ?? (kept && kept.key === contentKey ? kept.data : null)
  const contentStatus = shownContent ? 'ready' : content.status

  const [tab, setTab] = useState<MasterDataTab>('structure')
  const [stack, setStack] = useState<Selection[]>([])
  const [importing, setImporting] = useState(false)
  const [comparing, setComparing] = useState(false)
  const [confirm, setConfirm] = useState<'activate' | 'delete' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState<EditTarget | null>(null)
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null)
  const [cloning, setCloning] = useState(false)
  // The detail sheet steps aside while a form opened from it is up, and comes back after.
  const [parked, setParked] = useState<Selection[] | null>(null)

  function unpark(without?: Selection) {
    if (parked)
      setStack(
        without
          ? parked.filter((s) => !(s.kind === without.kind && s.code === without.code))
          : parked
      )
    setParked(null)
  }

  function chooseCategory(id: string) {
    setPickedCategory(id)
    setPickedVersion(null)
    setStack([])
    setError('')
    setNotice('')
  }

  function chooseVersion(id: string) {
    setPickedVersion(id)
    setStack([])
    setError('')
    setNotice('')
  }

  async function runConfirmed() {
    if (!version || !confirm) return
    setBusy(true)
    setError('')
    try {
      if (confirm === 'activate') {
        await activateVersion(version.id)
        setNotice(
          `Đã kích hoạt phiên bản ${version.version}. Bài học và câu hỏi gắn nhãn theo phiên bản này.`
        )
        setPickedVersion(version.id)
      } else {
        await deleteDraftVersion(version.id)
        setNotice(`Đã xóa bản nháp ${version.version}.`)
        setPickedVersion(null)
      }
      setConfirm(null)
      setComparing(false)
      versions.reload()
    } catch (err) {
      setError(crudError(err))
      setConfirm(null)
    } finally {
      setBusy(false)
    }
  }

  const tabs = reader ? TABLE_TABS.filter((t) => t.id !== 'mappings') : TABLE_TABS
  const isDraft = version?.status === 'DRAFT'
  // Only a draft changes; the version in use is copied into one first.
  const actions = !reader && isDraft ? { onEdit: setEditing, onDelete: setDeleting } : undefined
  const sheetActions = actions && {
    onEdit: (target: EditTarget) => {
      setParked(stack)
      setStack([])
      setEditing(target)
    },
    onDelete: (target: DeleteTarget) => {
      setParked(stack)
      setStack([])
      setDeleting(target)
    },
  }
  const hasData = reader ? !!categoryId : versionList.length > 0
  const versionsLoading = !reader && versions.status !== 'ready'

  const historyColumns = useMemo<ColumnDef<MasterDataVersion>[]>(
    () => [
      {
        id: 'version',
        header: 'Phiên bản',
        accessorKey: 'version',
        cell: ({ row }) => (
          <span className="font-medium text-text-primary">{row.original.version}</span>
        ),
      },
      {
        id: 'status',
        header: 'Trạng thái',
        accessorKey: 'status',
        cell: ({ row }) => (
          <Status tone={VERSION_STATUS_TONES[row.original.status]}>
            {VERSION_STATUS_LABELS[row.original.status]}
          </Status>
        ),
      },
      {
        id: 'file',
        header: 'File',
        accessorFn: (r) => r.sourceFilename ?? '',
        cell: ({ getValue }) => (
          <span className="text-text-secondary">{String(getValue() || '—')}</span>
        ),
      },
      {
        id: 'imported',
        header: 'Nhập lúc',
        accessorFn: (r) => r.importedAt ?? '',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-text-secondary">
            {row.original.importedAt ? formatDateTime(row.original.importedAt) : '—'}
          </span>
        ),
      },
      {
        id: 'activated',
        header: 'Kích hoạt lúc',
        accessorFn: (r) => r.activatedAt ?? '',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-text-secondary">
            {row.original.activatedAt ? formatDateTime(row.original.activatedAt) : '—'}
          </span>
        ),
      },
    ],
    []
  )

  return (
    <>
      <PageHeading
        title={title}
        readOnly={reader}
        subtitle={
          reader
            ? 'Các lĩnh vực kiến thức, dạng câu, kỹ năng và lỗi sai thường gặp đang dùng để gắn nhãn bài học và câu hỏi.'
            : 'Bộ nhãn của từng môn, nhập từ file Excel. Bản nháp chỉ được dùng sau khi kích hoạt.'
        }
        action={
          !reader && (
            <Button onClick={() => setImporting(true)} disabled={categories.status !== 'ready'}>
              <Plus size={16} />
              Nhập file Excel
            </Button>
          )
        }
      />

      <ScheduleResourceState
        status={categories.status}
        errorMessage={categories.errorMessage}
        onRetry={categories.reload}
        empty={!categories.data?.length}
        emptyMessage={reader ? 'Chưa môn nào có master data đang dùng.' : 'Chưa có môn học.'}
        skeleton="detail"
      >
        <div className="flex flex-col gap-5">
          <Panel>
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-full sm:w-72">
                  <SelectField
                    ariaLabel="Môn học"
                    value={categoryId ?? undefined}
                    onChange={chooseCategory}
                    options={categories.data ?? []}
                  />
                </div>
                {!reader && versionList.length > 0 && (
                  <div className="w-full sm:w-64">
                    <SelectField
                      ariaLabel="Phiên bản"
                      value={version?.id}
                      onChange={chooseVersion}
                      options={versionList.map((v) => ({
                        id: v.id,
                        label: `v${v.version} · ${VERSION_STATUS_LABELS[v.status]}`,
                      }))}
                    />
                  </div>
                )}
                {version && !reader && (
                  <Status tone={VERSION_STATUS_TONES[version.status]}>
                    {VERSION_STATUS_LABELS[version.status]}
                  </Status>
                )}
                {version && !reader && !isDraft && (
                  <Button
                    appearance="outline"
                    size="sm"
                    className="sm:ml-auto"
                    onClick={() => setCloning(true)}
                  >
                    <Pencil size={14} />
                    Tạo bản nháp để chỉnh sửa
                  </Button>
                )}
                {isDraft && !reader && (
                  <div className="flex flex-wrap gap-2 sm:ml-auto">
                    <Button appearance="outline" size="sm" onClick={() => setComparing(true)}>
                      <Repeat2 size={14} />
                      So sánh
                    </Button>
                    <Button size="sm" onClick={() => setConfirm('activate')}>
                      <CheckCircle2 size={14} />
                      Kích hoạt
                    </Button>
                    <Button
                      variant="danger"
                      appearance="outline"
                      size="sm"
                      onClick={() => setConfirm('delete')}
                    >
                      <Trash2 size={14} />
                      Xóa nháp
                    </Button>
                  </div>
                )}
              </div>
              {shownContent && (
                <p className="text-sm text-text-secondary">
                  {contentSummary(shownContent, !reader)}
                </p>
              )}
            </div>
          </Panel>

          {notice && <Notice tone="info">{notice}</Notice>}
          {error && (
            <Notice tone="danger">
              <span role="alert">{error}</span>
            </Notice>
          )}

          {versionsLoading ? (
            <ScheduleResourceState
              status={versions.status}
              errorMessage={versions.errorMessage}
              onRetry={versions.reload}
              skeleton="table"
            >
              {null}
            </ScheduleResourceState>
          ) : !hasData ? (
            <div className="rounded-xl border border-dashed border-card-border px-5 py-10 text-center">
              <p className="text-sm font-medium text-text-primary">Môn này chưa có master data</p>
              <p className="mt-1 text-sm text-text-tertiary">
                Nhập file Excel của môn (7 sheet) để tạo bản nháp đầu tiên.
              </p>
            </div>
          ) : (
            <ConsoleTabs value={tab} onValueChange={(value) => setTab(value as MasterDataTab)}>
              <ConsoleTabsList aria-label="Bảng master data">
                <ConsoleTabsTrigger value="structure">Cấu trúc</ConsoleTabsTrigger>
                {tabs.map((t) => (
                  <ConsoleTabsTrigger key={t.id} value={t.id}>
                    {t.label}
                  </ConsoleTabsTrigger>
                ))}
                {!reader && (
                  <ConsoleTabsTrigger value="history">Lịch sử phiên bản</ConsoleTabsTrigger>
                )}
              </ConsoleTabsList>
              <ConsoleTabsContent value="structure">
                {contentStatus === 'loading' ? (
                  <MasterDataStructureSkeleton />
                ) : (
                  <ScheduleResourceState
                    status={contentStatus}
                    errorMessage={content.errorMessage}
                    onRetry={content.reload}
                  >
                    {shownContent && tab === 'structure' && (
                      <MasterDataStructure
                        key={contentKey}
                        content={shownContent}
                        onOpen={(selection) => setStack([selection])}
                      />
                    )}
                  </ScheduleResourceState>
                )}
              </ConsoleTabsContent>
              {tabs.map((t) => (
                <ConsoleTabsContent key={t.id} value={t.id}>
                  <ScheduleResourceState
                    status={contentStatus}
                    errorMessage={content.errorMessage}
                    onRetry={content.reload}
                    skeleton="table"
                  >
                    {shownContent && tab === t.id && (
                      <MasterDataTable
                        key={contentKey}
                        tab={t.id}
                        content={shownContent}
                        onOpen={(selection) => setStack([selection])}
                        actions={actions}
                      />
                    )}
                  </ScheduleResourceState>
                </ConsoleTabsContent>
              ))}
              {!reader && (
                <ConsoleTabsContent value="history">
                  <DataTable
                    data={versionList}
                    columns={historyColumns}
                    getRowKey={(row) => row.id}
                    onRowClick={(row) => {
                      chooseVersion(row.id)
                      setTab('structure')
                    }}
                  />
                </ConsoleTabsContent>
              )}
            </ConsoleTabs>
          )}
        </div>
      </ScheduleResourceState>

      {shownContent && (
        <MasterDataDetail
          selection={stack[stack.length - 1] ?? null}
          content={shownContent}
          onOpen={(selection) => setStack((current) => [...current, selection])}
          onBack={stack.length > 1 ? () => setStack((current) => current.slice(0, -1)) : undefined}
          onClose={() => setStack([])}
          actions={sheetActions}
        />
      )}

      {editing && version && shownContent && (
        <MasterDataEditorDialog
          target={editing}
          versionId={version.id}
          prefix={codePrefix(version, shownContent)}
          content={shownContent}
          onClose={() => {
            setEditing(null)
            unpark()
          }}
          onSaved={(outcome) => {
            setEditing(null)
            unpark()
            setNotice(outcome.notice ?? '')
            setError(outcome.warning ?? '')
            content.reload()
          }}
        />
      )}

      {deleting && version && shownContent && (
        <MasterDataDeleteDialog
          target={deleting}
          versionId={version.id}
          content={shownContent}
          onClose={() => {
            setDeleting(null)
            unpark()
          }}
          onDeleted={(message) => {
            // The sheet does not come back to a record that is gone.
            const gone =
              deleting.kind === 'mappings'
                ? undefined
                : { kind: deleting.kind, code: deleting.code }
            setStack((current) =>
              gone
                ? current.filter((s) => !(s.kind === gone.kind && s.code === gone.code))
                : current
            )
            unpark(gone)
            setDeleting(null)
            setNotice(message)
            setError('')
            content.reload()
          }}
        />
      )}

      {cloning && version && (
        <MasterDataCloneDialog
          version={version}
          versions={versionList}
          onClose={() => setCloning(false)}
          onOpenDraft={(id) => {
            setCloning(false)
            chooseVersion(id)
          }}
          onCloned={(draft) => {
            setCloning(false)
            chooseVersion(draft.id)
            setNotice(`Đã tạo bản nháp v${draft.version}. Sửa xong thì so sánh và kích hoạt.`)
            versions.reload()
          }}
        />
      )}

      {importing && (
        <MasterDataImportDialog
          categories={(categories.data ?? []).map((c) => ({ id: c.id, name: c.label }))}
          initialCategoryId={categoryId}
          onClose={() => setImporting(false)}
          onImported={(importedCategory, result) => {
            setImporting(false)
            setPickedCategory(importedCategory)
            setPickedVersion(result.versionId)
            setTab('structure')
            setStack([])
            setNotice(
              `Đã nhập phiên bản ${result.version} thành bản nháp. Kiểm tra rồi kích hoạt khi sẵn sàng.`
            )
            if (importedCategory === categoryId) versions.reload()
          }}
        />
      )}

      {comparing && version && (
        <MasterDataDiffDialog
          version={version}
          canActivate={isDraft}
          onActivate={() => setConfirm('activate')}
          onClose={() => setComparing(false)}
        />
      )}

      {confirm && version && (
        <ConfirmDialog
          title={
            confirm === 'activate'
              ? `Kích hoạt phiên bản ${version.version}?`
              : `Xóa bản nháp ${version.version}?`
          }
          description={
            confirm === 'activate'
              ? `Phiên bản đang dùng của ${version.categoryName} sẽ chuyển sang "Đã ngưng". Bài học và câu hỏi mới sẽ gắn nhãn theo phiên bản này. Nên xem "So sánh" trước.`
              : 'Bản nháp và toàn bộ dữ liệu đã nhập của nó sẽ bị xóa. Không thể hoàn tác.'
          }
          cancelLabel="Hủy"
          confirmLabel={confirm === 'activate' ? 'Kích hoạt' : 'Xóa nháp'}
          busyLabel={confirm === 'activate' ? 'Đang kích hoạt...' : 'Đang xóa...'}
          variant={confirm === 'delete' ? 'danger' : 'primary'}
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => void runConfirmed()}
        />
      )}
    </>
  )
}
