import { useState } from 'react'
import { ArrowRight, Check, Sparkles, Users } from 'lucide-react'
import { ApiError } from '../../../lib/api'
import { getErrorMessage } from '../../../lib/errors'
import { formatStudyGroupLevel } from '../../../lib/studyGroupFormat'
import { showErrorToast, showSuccessToast } from '../../../lib/toastBus'
import { usePageResource } from '../../../hooks/usePageResource'
import {
  getStudyGroup,
  getSuggestedHouses,
  getSuggestedStudyGroups,
  joinStudyGroup,
  type StudyGroupDetail,
  type StudyGroupHouseSuggestion,
  type StudyGroupHouseType,
  type StudyGroupSuggestion,
} from '../../../services/studyGroupService'
import MascotState from '../../common/MascotState'
import ResourceState from '../common/ResourceState'
import ScrollableModal from '../common/ScrollableModal'
import Button from '../../ui/Button'
import Card, { CardTitle } from '../../ui/Card'
import Notice from '../../ui/Notice'
import Skeleton from '../../ui/Skeleton'
import StatusBadge from '../../ui/StatusBadge'

interface StudyGroupDiscoveryProps {
  courseId: string
  currentGroup: StudyGroupDetail | null
  onMembershipChanged: (groupId?: string) => void
  onMembershipConflict: () => Promise<void>
  onCompleteProfile: () => void
}

async function loadHouses(courseId: string) {
  try {
    return { kind: 'ready' as const, houses: await getSuggestedHouses(courseId) }
  } catch (error) {
    // CourseStudy only renders for an owned MAIN course. On this endpoint a
    // 400 therefore means the student profile is incomplete; use the HTTP
    // status rather than the BE's mutable display message.
    if (error instanceof ApiError && error.status === 400) {
      return { kind: 'profile-incomplete' as const }
    }
    throw error
  }
}

function StudyGroupDiscovery({
  courseId,
  currentGroup,
  onMembershipChanged,
  onMembershipConflict,
  onCompleteProfile,
}: StudyGroupDiscoveryProps) {
  const [selectedHouse, setSelectedHouse] = useState<StudyGroupHouseType | null>(null)
  const houses = usePageResource(() => loadHouses(courseId), [courseId])
  const houseOptions = houses.data?.kind === 'ready' ? houses.data.houses : null
  const activeHouse = selectedHouse ?? houseOptions?.find((house) => house.recommended)?.houseType ?? houseOptions?.[0]?.houseType
  const profileIncomplete = houses.data?.kind === 'profile-incomplete'

  return (
    <Card as="section" padding="lg" radius="lg" aria-labelledby="study-group-discovery-title">
      <div className="mb-3">
        <CardTitle id="study-group-discovery-title" className="mb-1 text-base">
          Nhóm học phù hợp
        </CardTitle>
        <p className="m-0 text-sm text-text-secondary">
          Các nhóm được sắp xếp theo môn cần cải thiện, trình độ và số chỗ còn trống.
        </p>
      </div>

      {houses.status === 'loading' ? (
        <div className="flex flex-col gap-3" aria-label="Đang tải nhóm học phù hợp">
          <Skeleton className="h-10 w-full max-w-[500px]" />
          <Skeleton className="h-[150px]" />
          <Skeleton className="h-[150px]" />
        </div>
      ) : profileIncomplete ? (
        <Notice tone="warning" className="justify-between">
          <span>
            Hoàn thiện hồ sơ học viên, gồm kỳ thi mục tiêu và điểm mục tiêu, để nhận gợi ý nhóm.
          </span>
          <Button className="min-h-11" onClick={onCompleteProfile}>
            Cập nhật hồ sơ
          </Button>
        </Notice>
      ) : houses.status !== 'ready' ? (
        <ResourceState
          status={houses.status}
          errorMessage={houses.errorMessage}
          onRetry={houses.reload}
          loading={<Skeleton className="h-32" />}
          forbidden={{ title: 'Bạn chưa thể xem nhóm học phù hợp.' }}
          notFound={{ title: 'Không tìm thấy các nhóm học của khóa học.' }}
          error={{ title: 'Không thể tải nhóm học phù hợp.' }}
        />
      ) : !houseOptions || houseOptions.length === 0 ? (
        <MascotState
          title="Chưa có nhóm học trong khóa này"
          message="Nhóm học sẽ xuất hiện tại đây khi khóa học có mentor phụ trách."
          className="min-h-[190px]"
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Chọn nhóm trình độ">
            {houseOptions.map((house) => (
              <Button
                key={house.houseType}
                appearance={activeHouse === house.houseType ? 'fill' : 'outline'}
                shape="pill"
                className="min-h-11"
                onClick={() => setSelectedHouse(house.houseType)}
                aria-pressed={activeHouse === house.houseType}
              >
                {house.label}
                {house.recommended && <Sparkles size={14} aria-label="Được đề xuất" />}
              </Button>
            ))}
          </div>

          {activeHouse && (
            <StudyGroupList
              key={`${courseId}-${activeHouse}`}
              courseId={courseId}
              house={houseOptions.find((item) => item.houseType === activeHouse)!}
              currentGroup={currentGroup}
              onMembershipChanged={onMembershipChanged}
              onMembershipConflict={onMembershipConflict}
            />
          )}
        </>
      )}
    </Card>
  )
}

function StudyGroupList({
  courseId,
  house,
  currentGroup,
  onMembershipChanged,
  onMembershipConflict,
}: {
  courseId: string
  house: StudyGroupHouseSuggestion
  currentGroup: StudyGroupDetail | null
  onMembershipChanged: (groupId?: string) => void
  onMembershipConflict: () => Promise<void>
}) {
  const [busyGroupId, setBusyGroupId] = useState<string | null>(null)
  const [detailsGroupId, setDetailsGroupId] = useState<string | null>(null)
  const groups = usePageResource(
    () => getSuggestedStudyGroups(courseId, house.houseType),
    [courseId, house.houseType]
  )

  const handleJoin = async (group: StudyGroupSuggestion) => {
    if (currentGroup || group.joined || isGroupFull(group) || busyGroupId) return
    setBusyGroupId(group.id)
    try {
      const membership = await joinStudyGroup(courseId, group.id)
      showSuccessToast(`Bạn đã tham gia ${group.name}.`)
      onMembershipChanged(membership.studyGroupId)
    } catch (error) {
      showErrorToast(getJoinErrorMessage(error))
      if (error instanceof ApiError && error.status === 409) {
        groups.reload()
        await onMembershipConflict()
      }
    } finally {
      setBusyGroupId(null)
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-soft px-3.5 py-3">
        <div>
          <strong className="text-sm font-semibold text-text-heading">{house.label}</strong>
          <p className="mt-0.5 mb-0 text-xs text-text-secondary">
            Điểm mục tiêu {house.minScore}–{house.maxScore}
            {' · '}{house.groupCount} nhóm
          </p>
        </div>
        {house.recommended && (
          <StatusBadge tone="primary" size="sm" className="font-semibold">
            Gợi ý cho bạn
          </StatusBadge>
        )}
      </div>

      {groups.status !== 'ready' || !groups.data ? (
        <ResourceState
          status={groups.status}
          errorMessage={groups.errorMessage}
          onRetry={groups.reload}
          loading={
            <div className="flex flex-col gap-3" aria-label="Đang tải danh sách nhóm">
              <Skeleton className="h-[145px]" />
              <Skeleton className="h-[145px]" />
            </div>
          }
          forbidden={{ title: 'Bạn chưa thể xem các nhóm trong khóa học này.' }}
          notFound={{ title: 'Không tìm thấy các nhóm trong khóa học này.' }}
          error={{ title: 'Không thể tải danh sách nhóm học.' }}
        />
      ) : groups.data.length === 0 ? (
        <MascotState
          title="Nhà này chưa có nhóm đang tuyển"
          message="Bạn có thể chọn nhà khác để xem thêm nhóm học."
          className="min-h-[180px]"
        />
      ) : (
        <div className="flex flex-col gap-3" role="list" aria-label={`Nhóm thuộc ${house.label}`}>
          {groups.data.map((group) => {
            const full = isGroupFull(group)
            const canJoin = !currentGroup && !group.joined && !full
            return (
              <article
                key={group.id}
                role="listitem"
                className="rounded-xl border border-line-blue bg-surface p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="m-0 text-sm font-bold text-text-heading">{group.name}</h3>
                      {group.recommended && (
                        <StatusBadge tone="primary" size="sm" className="font-semibold">
                          <Sparkles size={12} aria-hidden="true" />
                          Phù hợp nhất
                        </StatusBadge>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-text-secondary">
                      <span>{formatStudyGroupLevel(group.level)}</span>
                      <span className="inline-flex items-center gap-1">
                        <Users size={13} aria-hidden="true" />
                        {formatMemberCount(group)}
                      </span>
                    </div>
                    {group.mentors.length > 0 && (
                      <p className="mt-2 mb-0 text-xs text-text-secondary">
                        Mentor chính: {group.mentors.find((mentor) => mentor.primaryMentor)?.fullName ?? group.mentors[0].fullName}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {group.matchesWeakSubject && (
                        <StatusBadge tone="success" size="sm">Khớp môn cần cải thiện</StatusBadge>
                      )}
                      {group.matchesLevel && (
                        <StatusBadge tone="info" size="sm">Phù hợp trình độ</StatusBadge>
                      )}
                    </div>
                  </div>
                  {full && <StatusBadge tone="neutral" size="sm">Đã đủ thành viên</StatusBadge>}
                </div>

                <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-line-soft pt-3">
                  <Button
                    appearance="outline"
                    className="min-h-11 flex-1 sm:flex-none"
                    onClick={() => setDetailsGroupId(group.id)}
                  >
                    Chi tiết
                  </Button>
                  <Button
                    className="min-h-11 flex-1 sm:flex-none"
                    disabled={!canJoin || busyGroupId !== null}
                    onClick={() => handleJoin(group)}
                  >
                    {busyGroupId === group.id
                      ? 'Đang tham gia...'
                      : group.joined
                        ? 'Đã tham gia'
                        : currentGroup
                          ? 'Rời nhóm hiện tại trước'
                          : full
                            ? 'Đã đủ chỗ'
                            : 'Tham gia nhóm'}
                    {!busyGroupId && canJoin && <ArrowRight size={15} aria-hidden="true" />}
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {detailsGroupId && (
        <StudyGroupDetailsDialog
          courseId={courseId}
          groupId={detailsGroupId}
          onClose={() => setDetailsGroupId(null)}
        />
      )}
    </div>
  )
}

function StudyGroupDetailsDialog({
  courseId,
  groupId,
  onClose,
}: {
  courseId: string
  groupId: string
  onClose: () => void
}) {
  const group = usePageResource(() => getStudyGroup(courseId, groupId), [courseId, groupId])

  return (
    <ScrollableModal title="Chi tiết nhóm học" isOpen onClose={onClose} maxWidth={600}>
      <ResourceState
        status={group.status}
        errorMessage={group.errorMessage}
        onRetry={group.reload}
        loading={
          <div className="flex flex-col gap-3">
            <Skeleton className="h-7 w-60" />
            <Skeleton className="h-16" />
            <Skeleton className="h-28" />
          </div>
        }
        forbidden={{ title: 'Bạn chưa thể xem nhóm học này.' }}
        notFound={{ title: 'Không tìm thấy nhóm học.' }}
        error={{ title: 'Không thể tải chi tiết nhóm học.' }}
      />

      {group.status === 'ready' && group.data && (
        <div>
          <h3 className="mt-0 mb-1 text-lg font-bold text-text-heading">{group.data.name}</h3>
          <p className="mt-0 mb-4 text-sm text-text-secondary">
            {group.data.houseLabel} · {formatStudyGroupLevel(group.data.level)} · {formatMemberCount(group.data)}
          </p>
          {group.data.joined && (
            <StatusBadge tone="success" className="mb-4">
              <Check size={14} aria-hidden="true" />
              Bạn đang ở nhóm này
            </StatusBadge>
          )}
          <div className="flex flex-col gap-3">
            <h4 className="m-0 text-sm font-bold text-text-heading">Mentor của nhóm</h4>
            {group.data.mentors.length === 0 ? (
              <p className="m-0 text-sm text-text-secondary">Nhóm chưa có mentor được cập nhật.</p>
            ) : (
              group.data.mentors.map((mentor) => (
                <div key={mentor.id} className="rounded-xl border border-line-soft bg-surface-soft p-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm font-semibold text-text-heading">{mentor.fullName}</strong>
                    {mentor.primaryMentor && <StatusBadge tone="primary" size="sm">Mentor chính</StatusBadge>}
                  </div>
                  {mentor.strongSubjects.length > 0 && (
                    <p className="mt-1.5 mb-0 text-xs text-text-secondary">
                      Thế mạnh: {mentor.strongSubjects.join(', ')}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </ScrollableModal>
  )
}

function isGroupFull(group: Pick<StudyGroupSuggestion, 'capacity' | 'activeStudentCount'>) {
  return group.capacity != null && group.activeStudentCount >= group.capacity
}

function formatMemberCount(group: Pick<StudyGroupSuggestion, 'capacity' | 'activeStudentCount'>) {
  return group.capacity == null
    ? `${group.activeStudentCount} thành viên`
    : `${group.activeStudentCount}/${group.capacity} thành viên`
}

function getJoinErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 409) {
    if (error.message.includes('already at capacity')) return 'Nhóm này đã đủ thành viên.'
    if (error.message.includes('already have an active study group')) {
      return 'Bạn đang ở một nhóm học. Hãy rời nhóm hiện tại trước khi tham gia nhóm khác.'
    }
  }
  return getErrorMessage(error)
}

export default StudyGroupDiscovery
