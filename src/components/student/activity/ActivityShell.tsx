import type { ReactNode } from 'react'
import { ArrowLeft, ChevronRight } from '../../console/icons'
import Button from '../../ui/Button'
import StudentPageContainer from '../layout/StudentPageContainer'

interface ActivityShellProps {
  courseTitle: string
  subjectTitle: string
  chapterTitle: string
  onBack: () => void
  children: ReactNode
}

// Page frame: back link, breadcrumb, then the activity content.
function ActivityShell({
  courseTitle,
  subjectTitle,
  chapterTitle,
  onBack,
  children,
}: ActivityShellProps) {
  return (
    <StudentPageContainer className="flex flex-col gap-3.5 px-[18px] pt-2 pb-8 text-text-heading max-[760px]:px-0 max-[760px]:pt-1.5 max-[760px]:pb-7">
      <Button
        appearance="ghost"
        className="h-auto w-max gap-[7px] border-0 p-0 text-[13px] font-extrabold hover:bg-transparent"
        onClick={onBack}
      >
        <ArrowLeft size={17} />
        Quay lại khóa học
      </Button>
      <div className="flex flex-wrap items-center gap-1.5 text-[12px] font-medium text-text-secondary">
        <span>{courseTitle}</span>
        <ChevronRight size={14} />
        <span>{subjectTitle}</span>
        <ChevronRight size={14} />
        <strong className="font-bold text-text-heading">{chapterTitle}</strong>
      </div>
      {children}
    </StudentPageContainer>
  )
}

export default ActivityShell
