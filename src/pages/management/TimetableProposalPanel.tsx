import { useState } from 'react'
import { WandSparkles } from 'lucide-react'
import { localToday } from '../../lib/scheduling'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Notice from '../../components/ui/Notice'

const fieldClass =
  'h-10 rounded-xl border border-border-subtle bg-surface-input px-3 text-sm text-text-heading outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-60'

export default function TimetableProposalPanel() {
  const [startDate, setStartDate] = useState(localToday())
  const [endDate, setEndDate] = useState('')

  return (
    <Card as="section" padding="lg" className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text-heading">Đề xuất thời khóa biểu</h2>
        <p className="mt-1 text-sm text-text-muted">Tạo bản xem trước từ các lớp học, giờ rảnh và yêu cầu xếp lịch.</p>
      </div>
      <Notice tone="warning">
        Chưa thể tạo đề xuất vì hiện chưa có danh sách lớp của khóa học. Chức năng sẽ khả dụng khi dữ liệu lớp được đồng bộ.
      </Notice>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-text-heading">
          Từ ngày
          <input
            name="proposalStartDate"
            autoComplete="off"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className={fieldClass + ' mt-1 w-full'}
            disabled
          />
        </label>
        <label className="text-sm font-medium text-text-heading">
          Đến ngày
          <input
            name="proposalEndDate"
            autoComplete="off"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className={fieldClass + ' mt-1 w-full'}
            disabled
          />
        </label>
      </div>
      <div className="flex justify-end">
        <Button disabled title="Chưa có dữ liệu lớp để tạo đề xuất.">
          <WandSparkles size={16} />
          Tạo đề xuất
        </Button>
      </div>
    </Card>
  )
}
