import Button from '../../console/button'
import ConsoleDialog from '../../console/dialog'
import Notice from '../../console/notice'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import { getVersionDiff, type MasterDataVersion, type VersionDiff } from '../../../services/masterDataService'

const ROWS: { label: string; added: keyof VersionDiff; removed: keyof VersionDiff }[] = [
  { label: 'Domain', added: 'addedDomains', removed: 'removedDomains' },
  { label: 'Dạng câu', added: 'addedPatterns', removed: 'removedPatterns' },
  { label: 'Kỹ năng', added: 'addedSkills', removed: 'removedSkills' },
  { label: 'Micro-skill', added: 'addedMicroSkills', removed: 'removedMicroSkills' },
  { label: 'Lỗi sai thường gặp', added: 'addedErrorCodes', removed: 'removedErrorCodes' },
]

function CodeList({ codes, removed }: { codes: string[]; removed?: boolean }) {
  if (!codes.length) return <span className="text-text-tertiary">—</span>
  return (
    <span className={`flex flex-wrap gap-x-2 gap-y-1 ${removed ? 'text-danger' : 'text-text-primary'}`}>
      {codes.map((code) => (
        <span key={code}>
          {removed ? '−' : '+'} {code}
        </span>
      ))}
    </span>
  )
}

/** What activating a draft would change against the subject's active version. */
export default function MasterDataDiffDialog({
  version,
  canActivate,
  onActivate,
  onClose,
}: {
  version: MasterDataVersion
  canActivate: boolean
  onActivate: () => void
  onClose: () => void
}) {
  const resource = useScheduleResource(`diff:${version.id}`, () => getVersionDiff(version.id))
  const diff = resource.data
  const removedCount = diff ? ROWS.reduce((sum, row) => sum + (diff[row.removed] as string[]).length, 0) : 0

  return (
    <ConsoleDialog
      open
      onClose={onClose}
      maxWidth={760}
      title={`So sánh phiên bản ${version.version}`}
      description={
        diff?.activeVersion
          ? `Với phiên bản đang dùng ${diff.activeVersion} của ${version.categoryName}.`
          : `${version.categoryName} chưa có phiên bản đang dùng; mọi mã đều là mã mới.`
      }
      footer={
        <>
          <Button appearance="outline" onClick={onClose}>
            Đóng
          </Button>
          {canActivate && (
            <Button onClick={onActivate} disabled={!diff}>
              Kích hoạt phiên bản này
            </Button>
          )}
        </>
      }
    >
      <ScheduleResourceState
        status={resource.status}
        errorMessage={resource.errorMessage}
        onRetry={resource.reload}
        skeleton="table"
      >
        {diff && (
          <div className="flex flex-col gap-4">
            {removedCount > 0 && (
              <Notice tone="warning">
                {removedCount} mã sẽ bị bỏ. Bài học và câu hỏi đang gắn các mã này sẽ cần gắn lại: khoảng{' '}
                {diff.affectedLessonsCount} bài học và {diff.affectedQuestionsCount} câu hỏi.
              </Notice>
            )}
            <div className="overflow-x-auto rounded-lg border border-card-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-background-gray-secondary text-xs text-text-tertiary">
                  <tr>
                    <th className="px-3 py-2 font-medium">Loại</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">Thêm mới</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">Bị bỏ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {ROWS.map((row) => (
                    <tr key={row.label} className="align-top">
                      <td className="px-3 py-2 font-medium whitespace-nowrap text-text-primary">{row.label}</td>
                      <td className="px-3 py-2">
                        <CodeList codes={diff[row.added] as string[]} />
                      </td>
                      <td className="px-3 py-2">
                        <CodeList codes={diff[row.removed] as string[]} removed />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {removedCount === 0 && (
              <p className="text-sm text-text-tertiary">
                Không có mã nào bị bỏ; kích hoạt không ảnh hưởng bài học và câu hỏi đã gắn nhãn.
              </p>
            )}
          </div>
        )}
      </ScheduleResourceState>
    </ConsoleDialog>
  )
}
