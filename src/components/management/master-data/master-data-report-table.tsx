import type { ValidationItem } from '../../../services/masterDataService'
import { AlertCircle, AlertTriangle } from '../../console/icons'
import { TABLE_TABS } from './master-data-labels'

export default function ReportTable({
  items,
  tone,
  warnings = [],
  onSelect,
}: {
  items: ValidationItem[]
  tone: 'danger' | 'warning'
  warnings?: ValidationItem[]
  onSelect?: (item: ValidationItem) => void
}) {
  const rows = [
    ...items.map((item) => ({ item, tone })),
    ...warnings.map((item) => ({ item, tone: 'warning' as const })),
  ]
  return (
    <div className="max-h-64 overflow-auto rounded-lg border border-card-border">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-background-gray-secondary text-xs text-text-tertiary">
          <tr>
            <th className="px-3 py-2 font-medium">Sheet</th>
            <th className="px-3 py-2 font-medium">Dòng</th>
            <th className="px-3 py-2 font-medium">Cột</th>
            <th className="px-3 py-2 font-medium">Nội dung</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-card-border text-text-primary">
          {rows.map(({ item, tone: rowTone }, index) => {
            const selectable = !!onSelect && TABLE_TABS.some((tab) => tab.sheet === item.sheetName)
            const Icon = rowTone === 'danger' ? AlertCircle : AlertTriangle
            return (
              <tr
                key={index}
                className={
                  selectable
                    ? 'cursor-pointer hover:bg-background-gray-secondary focus-visible:outline focus-visible:outline-2'
                    : undefined
                }
                tabIndex={selectable ? 0 : undefined}
                onClick={selectable ? () => onSelect(item) : undefined}
                onKeyDown={
                  selectable
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onSelect(item)
                        }
                      }
                    : undefined
                }
              >
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="flex items-center gap-2">
                    <Icon
                      aria-label={rowTone === 'danger' ? 'Lỗi' : 'Cảnh báo'}
                      size={16}
                      className={
                        rowTone === 'danger'
                          ? 'shrink-0 text-badge-error-icon-color'
                          : 'shrink-0 text-badge-warning-icon-color'
                      }
                    />
                    {item.sheetName}
                  </span>
                </td>
                <td className="px-3 py-2">{item.rowNumber || '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{item.columnName || '—'}</td>
                <td className="px-3 py-2">{item.message}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
