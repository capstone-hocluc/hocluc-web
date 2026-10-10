import { useState } from 'react'
import { BookOpenCheck, Users } from '../../console/icons'
import { formatStudyGroupLevel } from '../../../lib/studyGroupFormat'
import { ApiError } from '../../../lib/api'
import { getErrorMessage } from '../../../lib/errors'
import { showErrorToast, showSuccessToast } from '../../../lib/toastBus'
import { usePageResource } from '../../../hooks/usePageResource'
import {
  getMyStudyGroup,
  leaveStudyGroup,
  type StudyGroupDetail,
} from '../../../services/studyGroupService'
import ResourceState from '../common/ResourceState'
import Button from '../../ui/Button'
import Card, { CardEyebrow, CardTitle } from '../../ui/Card'
import ConfirmDialog from '../../ui/ConfirmDialog'
import Skeleton from '../../ui/Skeleton'
import StudyGroupDiscovery from './StudyGroupDiscovery'

interface StudyGroupCardProps {
  courseId: string
  initialGroupId: string | null
  onCompleteProfile: () => void
  onRefreshStudy: () => void
}

function MemberCount({ group }: { group: StudyGroupDetail }) {
  return (
    <span>
      {group.activeStudentCount}
      {group.capacity == null ? ' thành viên' : `/${group.capacity} thành viên`}
    </span>
  )
}

function StudyGroupCard({
  courseId,
  initialGroupId,
  onCompleteProfile,
  onRefreshStudy,
}: StudyGroupCardProps) {
  const [discoveryOpen, setDiscoveryOpen] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [memberGroupId, setMemberGroupId] = useState(initialGroupId)
  const [refreshKey, setRefreshKey] = useState(0)
  const groupResource = usePageResource(
    async () => {
      if (!memberGroupId) return null
      try {
        return await getMyStudyGroup(courseId)
      } catch (error) {
        // CourseStudy exposes activeStudyGroupId. If that id went stale and
        // /study-groups/me returns its documented 404, reconcile to no group
        // without depending on the mutable error message text.
        if (error instanceof ApiError && error.status === 404) return null
        throw error
      }
    },
    [courseId, memberGroupId],
    {
      onLoaded: (loaded) => {
        if (!loaded && memberGroupId) {
          setConfirmLeave(false)
          setMemberGroupId(null)
        }
      },
    }
  )
  const group = groupResource.data

  const handleLeave = async () => {
    if (!group || leaving) return
    setLeaving(true)
    try {
      await leaveStudyGroup(courseId, group.id)
      showSuccessToast('Bạn đã rời nhóm học.')
      setConfirmLeave(false)
      setMemberGroupId(null)
      groupResource.reload()
      setRefreshKey((current) => current + 1)
    } catch (error) {
      showErrorToast(getMutationErrorMessage(error))
      if (error instanceof ApiError && error.status === 404) {
        setConfirmLeave(false)
        setMemberGroupId(null)
        groupResource.reload()
        setRefreshKey((current) => current + 1)
      } else if (error instanceof ApiError && error.status === 403) {
        onRefreshStudy()
      }
    } finally {
      setLeaving(false)
    }
  }

  const refreshAfterJoin = (groupId?: string) => {
    if (!groupId) {
      void reconcileMembership()
      return
    }
    setMemberGroupId(groupId)
    groupResource.reload()
    setRefreshKey((current) => current + 1)
  }

  const reconcileMembership = async () => {
    try {
      const currentGroup = await getMyStudyGroup(courseId)
      setMemberGroupId(currentGroup.id)
      groupResource.setData(currentGroup)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setConfirmLeave(false)
        setMemberGroupId(null)
        groupResource.setData(null)
        return
      }
      onRefreshStudy()
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card as="section" padding="lg" radius="lg" aria-labelledby="study-group-card-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardEyebrow>HỌC CÙNG BẠN BÈ</CardEyebrow>
            <CardTitle id="study-group-card-title" className="mb-1 text-base">
              Nhóm học của bạn
            </CardTitle>
            <p className="m-0 text-sm text-text-secondary">
              Tìm bạn học và mentor phù hợp với mục tiêu của bạn.
            </p>
          </div>
          <BookOpenCheck size={22} className="mt-1 shrink-0 text-primary" aria-hidden="true" />
        </div>

        {groupResource.status === 'loading' ? (
          <div className="mt-4 flex flex-col gap-2" aria-label="Đang tải nhóm học">
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
        ) : groupResource.status === 'ready' && group ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line-blue bg-primary-soft px-4 py-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-primary">
                <Users size={19} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <strong className="block truncate text-sm font-bold text-text-heading">
                  {group.name}
                </strong>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary">
                  <span>{group.houseLabel}</span>
                  <span>{formatStudyGroupLevel(group.level)}</span>
                  <MemberCount group={group} />
                </div>
                {group.mentors.length > 0 && (
                  <p className="mt-1.5 mb-0 text-xs text-text-secondary">
                    Mentor: {group.mentors.map((mentor) => mentor.fullName).join(', ')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <Button
                appearance="outline"
                className="min-h-11 flex-1 sm:flex-none"
                onClick={() => setDiscoveryOpen((open) => !open)}
                aria-expanded={discoveryOpen}
              >
                {discoveryOpen ? 'Ẩn nhóm khác' : 'Tìm nhóm khác'}
              </Button>
              <Button
                variant="danger"
                appearance="outline"
                className="min-h-11 flex-1 sm:flex-none"
                onClick={() => setConfirmLeave(true)}
              >
                Rời nhóm
              </Button>
            </div>
          </div>
        ) : groupResource.status === 'ready' ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line-soft bg-surface-soft px-4 py-3">
            <div>
              <strong className="block text-sm font-semibold text-text-heading">
                Bạn chưa tham gia nhóm học nào
              </strong>
              <p className="mt-1 mb-0 text-sm text-text-secondary">
                Xem các nhóm được đề xuất theo mục tiêu và trình độ của bạn.
              </p>
            </div>
            <Button
              className="min-h-11 w-full sm:w-auto"
              onClick={() => setDiscoveryOpen((open) => !open)}
              aria-expanded={discoveryOpen}
            >
              {discoveryOpen ? 'Ẩn nhóm phù hợp' : 'Tìm nhóm phù hợp'}
            </Button>
          </div>
        ) : (
          <ResourceState
            status={groupResource.status}
            errorMessage={groupResource.errorMessage}
            onRetry={groupResource.reload}
            loading={<Skeleton className="mt-4 h-16" />}
            forbidden={{ title: 'Bạn chưa thể xem nhóm học của khóa học này.' }}
            notFound={{ title: 'Không tìm thấy thông tin nhóm học.' }}
            error={{ title: 'Không thể tải nhóm học hiện tại.' }}
          />
        )}
      </Card>

      {discoveryOpen && groupResource.status === 'ready' && (
        <StudyGroupDiscovery
          key={`${courseId}-${refreshKey}`}
          courseId={courseId}
          currentGroup={group}
          onMembershipChanged={refreshAfterJoin}
          onMembershipConflict={() => reconcileMembership()}
          onCompleteProfile={onCompleteProfile}
        />
      )}

      {confirmLeave && group && (
        <ConfirmDialog
          title="Rời nhóm học?"
          description={
            <>
              Bạn sẽ rời <strong>{group.name}</strong>. Sau đó bạn có thể tham gia một nhóm khác.
            </>
          }
          cancelLabel="Ở lại nhóm"
          confirmLabel="Rời nhóm"
          busy={leaving}
          busyLabel="Đang cập nhật..."
          variant="danger"
          mobileTouchTargets
          onCancel={() => !leaving && setConfirmLeave(false)}
          onConfirm={handleLeave}
        />
      )}
    </div>
  )
}

function getMutationErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 409) {
    if (error.message.includes('already at capacity')) return 'Nhóm này đã đủ thành viên.'
    if (error.message.includes('already have an active study group')) {
      return 'Bạn đang ở một nhóm học. Hãy rời nhóm hiện tại trước khi tham gia nhóm khác.'
    }
  }
  return getErrorMessage(error)
}

export default StudyGroupCard
