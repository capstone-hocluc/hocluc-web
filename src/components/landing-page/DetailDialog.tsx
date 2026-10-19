import type { CourseModule, Domain, PracticeOperation } from '../../data/landing-content'
import Icon from './Icon'
import LandingDialog from './LandingDialog'

export type LandingDetail =
  { kind: 'domain'; domain: Domain } | { kind: 'operation'; operation: PracticeOperation }

interface DetailDialogProps {
  detail: LandingDetail | null
  onClose: () => void
  onTryLesson: () => void
}

function ModuleCard({ module }: { module: CourseModule }) {
  return (
    <article className="module">
      <div className="module-header">
        <span className="module-code">{module.level}</span>
        <span className="module-time">{module.hours} giờ dự kiến</span>
      </div>
      <h3>{module.title}</h3>
      <p>{module.summary}</p>
    </article>
  )
}

function DetailDialog({ detail, onClose, onTryLesson }: DetailDialogProps) {
  const title =
    detail?.kind === 'domain'
      ? detail.domain.title
      : detail?.kind === 'operation'
        ? detail.operation.title
        : ''
  const subtitle =
    detail?.kind === 'domain'
      ? `${detail.domain.modules.length} học phần · ${detail.domain.hours} giờ dự kiến`
      : detail?.kind === 'operation'
        ? `${detail.operation.tagline} · ${detail.operation.hours} giờ dự kiến`
        : ''

  return (
    <LandingDialog
      id="detail-dialog"
      titleId="detail-title"
      open={detail !== null}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      closeLabel="Đóng chi tiết"
    >
      <div className="dialog-body" id="detail-body">
        {detail?.kind === 'domain' && (
          <>
            {detail.domain.modules.map((module) => (
              <ModuleCard key={module.code} module={module} />
            ))}
            <p className="dialog-note">Thời lượng tham khảo, tùy theo năng lực của bạn.</p>
            <button type="button" className="btn btn-primary" data-try onClick={onTryLesson}>
              Thử một bài học <Icon name="arrow-right" />
            </button>
          </>
        )}
        {detail?.kind === 'operation' && (
          <>
            <p className="muted">{detail.operation.summary}</p>
            <p className="dialog-note">
              Xem trước nội dung ôn luyện. Bạn có thể thử 3 câu mẫu bên dưới.
            </p>
            <button type="button" className="btn btn-primary" data-try onClick={onTryLesson}>
              Trải nghiệm 3 câu mẫu <Icon name="arrow-right" />
            </button>
          </>
        )}
      </div>
    </LandingDialog>
  )
}

export default DetailDialog
