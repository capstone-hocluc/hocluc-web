import { ArrowLeft, BookOpen, GraduationCap, Play } from '../../console/icons'
import Button from '../../ui/Button'
import Card from '../../ui/Card'
import Progress from '../../ui/Progress'
import StatusBadge from '../../ui/StatusBadge'

const metaPill =
  'inline-flex items-center gap-1.5 rounded-full border border-line-blue bg-surface-tint px-2.5 py-2 text-[12px] font-semibold text-text-dim [&>svg]:text-primary'

interface CourseHeroProps {
  subject: string
  title: string
  description: string
  instructor: string
  contentCount: number | string
  completedCount: number | string
  progress: number
  onBack: () => void
  onContinue: () => void
}

// Header of a student course: back link, title/meta and the progress panel.
function CourseHero({
  subject,
  title,
  description,
  instructor,
  contentCount,
  completedCount,
  progress,
  onBack,
  onContinue,
}: CourseHeroProps) {
  return (
    <Card
      as="header"
      padding="none"
      radius="lg"
      className="border-line-card bg-surface-sky bg-[linear-gradient(rgba(224,233,250,0.62)_1px,transparent_1px),linear-gradient(90deg,rgba(224,233,250,0.62)_1px,transparent_1px)] bg-[length:28px_28px] p-4 shadow-[0_12px_26px_rgba(17,24,58,0.045)] max-[760px]:rounded-2xl"
    >
      <Button
        appearance="ghost"
        className="h-auto gap-[7px] border-0 p-0 text-[13px] font-black hover:bg-transparent"
        onClick={onBack}
      >
        <ArrowLeft size={17} />
        Khóa học của tôi
      </Button>
      <div className="mt-3.5 grid grid-cols-[minmax(0,1fr)_300px] items-center gap-5 max-[1025px]:grid-cols-1">
        <div>
          <StatusBadge tone="primary" size="sm" className="px-2.5 py-[5px] font-black">
            {subject}
          </StatusBadge>
          <h1 className="mt-3 mb-2 max-w-[820px] text-[25px] leading-[1.16] font-extrabold text-text-heading">
            {title}
          </h1>
          <p className="max-w-[760px] text-[13px] leading-[1.55] font-medium text-text-body">
            {description}
          </p>
          <div className="mt-3.5 flex flex-wrap gap-[9px]">
            <span className={metaPill}>
              <GraduationCap size={16} />
              Giảng viên: {instructor}
            </span>
            <span className={metaPill}>
              <BookOpen size={16} />
              {contentCount} nội dung học
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-[9px] rounded-2xl border border-line-blue bg-primary-soft p-3.5">
          <span className="text-[13px] font-bold text-text-heading">Tiến độ khóa học</span>
          <div className="flex items-center justify-between gap-3">
            <small className="text-[12px] font-medium text-text-secondary">
              {completedCount}/{contentCount} bài học
            </small>
            <strong className="text-2xl leading-none font-black text-primary">{progress}%</strong>
          </div>
          <Progress value={progress} />
          <Button
            className="h-auto min-h-[38px] gap-[7px] rounded-xl border-0 px-3.5 text-xs leading-normal font-black shadow-[0_12px_20px_rgba(28, 176, 246,0.14)] hover:bg-primary [&>svg]:size-[15px]"
            onClick={onContinue}
          >
            Tiếp tục học
            <Play size={15} />
          </Button>
        </div>
      </div>
    </Card>
  )
}

export default CourseHero
