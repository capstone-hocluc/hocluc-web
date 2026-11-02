import type { PracticeOperation } from '../../data/landing-content'
import LandingDialog from './LandingDialog'

export type LandingDetail = { kind: 'operation'; operation: PracticeOperation }

interface DetailDialogProps {
  detail: LandingDetail | null
  onClose: () => void
}

function DetailDialog({ detail, onClose }: DetailDialogProps) {
  const operation = detail?.operation
  return (
    <LandingDialog
      id="detail-dialog"
      titleId="detail-title"
      open={detail !== null}
      onClose={onClose}
      title={operation?.title ?? ''}
      subtitle={operation ? `${operation.tagline} · ${operation.hours} giờ dự kiến` : ''}
      closeLabel="Đóng chi tiết"
    >
      <div className="dialog-body" id="detail-body">
        {operation && <p className="muted">{operation.summary}</p>}
      </div>
    </LandingDialog>
  )
}

export default DetailDialog
