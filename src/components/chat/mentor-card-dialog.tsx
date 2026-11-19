import { useScheduleResource } from '../../hooks/useScheduleResource'
import { getMentorCard } from '../../services/mentorProfileService'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import Notice from '../ui/Notice'
import { MentorCardSkeleton, MentorCardView } from './mentor-card-view'

/** The public card of the mentor answering the student's question. */
export default function MentorCardDialog({ mentorId, onClose }: { mentorId: string; onClose: () => void }) {
  const resource = useScheduleResource(`mentor-card:${mentorId}`, () => getMentorCard(mentorId))
  return (
    <Modal open title="Hồ sơ Mentor" maxWidth={520} onClose={onClose}>
      {resource.status === 'loading' ? (
        <MentorCardSkeleton />
      ) : resource.data ? (
        <MentorCardView card={resource.data} />
      ) : (
        <Notice tone="danger">{resource.errorMessage || 'Không thể tải hồ sơ mentor.'}</Notice>
      )}
      <div className="mt-2 flex justify-end">
        <Button appearance="outline" size="sm" onClick={onClose}>
          Đóng
        </Button>
      </div>
    </Modal>
  )
}
