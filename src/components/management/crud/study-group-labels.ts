import type {
  StudyGroupHouseType,
  StudyGroupLevel,
  StudyGroupMemberStatus,
} from '../../../services/studyGroupService'

export const HOUSE_TYPE_LABELS: Record<StudyGroupHouseType, string> = {
  NEN_MONG: 'Nhà Nền Móng',
  VUNG_VANG: 'Nhà Vững Vàng',
  BUT_PHA: 'Nhà Bứt Phá',
}

export const LEVEL_LABELS: Record<StudyGroupLevel, string> = {
  BEGINNER: 'Cơ bản',
  INTERMEDIATE: 'Trung bình',
  ADVANCED: 'Nâng cao',
}

export const MEMBER_STATUS_LABELS: Record<StudyGroupMemberStatus, string> = {
  ACTIVE: 'Đang học',
  COMPLETED: 'Hoàn thành',
  DROPPED: 'Đã rời',
  SUSPENDED: 'Tạm dừng',
}

export const MEMBER_STATUS_TONES: Record<StudyGroupMemberStatus, 'success' | 'neutral' | 'warning'> = {
  ACTIVE: 'success',
  COMPLETED: 'neutral',
  DROPPED: 'neutral',
  SUSPENDED: 'warning',
}

export const LEVEL_OPTIONS = [
  { id: 'NONE', label: 'Mọi trình độ' },
  ...(Object.entries(LEVEL_LABELS) as [StudyGroupLevel, string][]).map(([id, label]) => ({
    id,
    label,
  })),
]
