import type { CourseStudyLiveClass } from '../../../services/courseService'
import Card, { CardEyebrow } from '../../ui/Card'
import LiveClassActions from './LiveClassActions'
import LiveClassMeta from './LiveClassMeta'

interface NextLiveClassCardProps {
  liveClass: CourseStudyLiveClass
}

function NextLiveClassCard({ liveClass }: NextLiveClassCardProps) {
  return (
    <Card variant="live">
      <CardEyebrow className="text-live">Buổi học trực tuyến tiếp theo</CardEyebrow>
      <h3 className="mb-2 text-lg font-semibold text-text-heading">{liveClass.title}</h3>
      {liveClass.description && (
        <p className="mb-3 text-[15px] text-text-body">{liveClass.description}</p>
      )}

      <LiveClassMeta liveClass={liveClass} className="mb-3" />

      <LiveClassActions liveClass={liveClass} size="md" joinLabel="Tham gia buổi học" />
    </Card>
  )
}

export default NextLiveClassCard
