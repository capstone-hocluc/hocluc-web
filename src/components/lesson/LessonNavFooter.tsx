import { ArrowLeft, ArrowRight } from '../console/icons'
import Button from '../ui/Button'

interface LessonNavFooterProps {
  previousLessonId: string | null
  nextLessonId: string | null
  onNavigate: (lessonId: string) => void
}

function LessonNavFooter({ previousLessonId, nextLessonId, onNavigate }: LessonNavFooterProps) {
  return (
    <div className="flex items-center justify-between gap-3 max-[640px]:flex-col-reverse [&>button]:max-[640px]:w-full">
      <Button
        appearance="outline"
        disabled={!previousLessonId}
        onClick={() => previousLessonId && onNavigate(previousLessonId)}
      >
        <ArrowLeft size={16} />
        Bài trước
      </Button>
      <Button
        disabled={!nextLessonId}
        onClick={() => nextLessonId && onNavigate(nextLessonId)}
      >
        Bài tiếp theo
        <ArrowRight size={16} />
      </Button>
    </div>
  )
}

export default LessonNavFooter
