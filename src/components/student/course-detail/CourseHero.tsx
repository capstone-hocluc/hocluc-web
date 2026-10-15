import { ArrowLeft, BookOpen, GraduationCap, Play } from '../../console/icons'
import Button from '../../ui/Button'
import Card from '../../ui/Card'
import Progress from '../../ui/Progress'
import StatusBadge from '../../ui/StatusBadge'

const metaPill =
  'inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-bold text-text-body [&>svg]:text-primary'

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
      radius="xl"
      className="bg-surface-brand p-6 max-[760px]:p-4"
    >
      <Button
        appearance="ghost"
        className="h-auto gap-2 border-0 p-0 text-sm font-extrabold text-primary-text hover:bg-transparent hover:underline"
        onClick={onBack}
      >
        <ArrowLeft size={17} />
        Khóa học của tôi
      </Button>
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_320px] items-center gap-6 max-[1025px]:grid-cols-1">
        <div>
          <StatusBadge tone="primary" size="sm" className="bg-surface px-3 py-1 text-xs uppercase">
            {subject}
          </StatusBadge>
          <h1 className="mt-3 mb-2 max-w-[820px] text-[clamp(24px,2.6vw,32px)] leading-[1.16] font-black tracking-[-0.5px] text-text-heading">
            {title}
          </h1>
          <p className="max-w-[760px] text-base leading-[1.6] text-text-body">
            {description}
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
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
        <div className="flex flex-col gap-3 rounded-2xl border-[1.5px] border-line-card bg-surface p-5 shadow-card-soft">
          <span className="text-sm font-extrabold text-text-heading">Tiến độ khóa học</span>
          <div className="flex items-center justify-between gap-3">
            <small className="text-sm font-semibold text-text-secondary">
              {completedCount}/{contentCount} bài học
            </small>
            <strong className="text-4xl leading-none font-black text-primary-text">{progress}%</strong>
          </div>
          <Progress value={progress} />
          <Button size="lg" onClick={onContinue}>
            Tiếp tục học
            <Play size={18} />
          </Button>
        </div>
      </div>
    </Card>
  )
}

export default CourseHero
