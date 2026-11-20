import { useEffect, useRef, useState, type PointerEvent } from 'react'
import Button from '../../ui/Button'
import ScrollableModal from '../common/ScrollableModal'
import { Info } from '../../console/icons'
import styles from './CourseTutorMascot.module.css'

const SIZE = 96
const EDGE = 12

function fitPosition(x: number, y: number) {
  return {
    x: Math.max(EDGE, Math.min(x, window.innerWidth - SIZE - EDGE)),
    y: Math.max(80, Math.min(y, window.innerHeight - SIZE - EDGE)),
  }
}

function CourseTutorMascot({ onOpenTutor }: { onOpenTutor: () => void }) {
  const [position, setPosition] = useState(() => fitPosition(window.innerWidth - SIZE - 24, window.innerHeight - SIZE - 24))
  const [guideOpen, setGuideOpen] = useState(false)
  const drag = useRef<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null)
  const moved = useRef(false)

  useEffect(() => {
    const resize = () => setPosition((current) => fitPosition(current.x, current.y))
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const beginDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0) return
    moved.current = false
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: position.x, originY: position.y }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  return (
    <>
      <button type="button" className={styles.launcher} style={{ left: position.x, top: position.y, touchAction: 'none' }}
        aria-label="Mở Gia sư AI" aria-haspopup="dialog" title="Gia sư AI · Kéo để di chuyển, bấm để sử dụng"
        onPointerDown={beginDrag}
        onPointerMove={(event) => {
          const start = drag.current
          if (!start || start.pointerId !== event.pointerId) return
          const dx = event.clientX - start.x
          const dy = event.clientY - start.y
          if (!moved.current && Math.hypot(dx, dy) < 8) return
          moved.current = true
          setPosition(fitPosition(start.originX + dx, start.originY + dy))
        }}
        onPointerUp={() => { drag.current = null }}
        onPointerCancel={() => { drag.current = null; moved.current = true }}
        onLostPointerCapture={() => { drag.current = null }}
        onClick={(event) => { if (!moved.current || event.detail === 0) setGuideOpen(true) }}
        onKeyDown={(event) => {
          if (!event.altKey || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
          event.preventDefault()
          setPosition((current) => fitPosition(
            current.x + (event.key === 'ArrowRight' ? 24 : event.key === 'ArrowLeft' ? -24 : 0),
            current.y + (event.key === 'ArrowDown' ? 24 : event.key === 'ArrowUp' ? -24 : 0)))
        }}>
        <img src="/mascot/06.png" alt="" width={96} height={96} draggable={false} />
        <span>Gia sư AI</span>
      </button>

      <ScrollableModal title="Học cùng Gia sư AI" isOpen={guideOpen} onClose={() => setGuideOpen(false)} maxWidth={520}>
        <div className={styles.guideNotice}>
          <Info size={18} aria-hidden="true" />
          <p>Gửi ảnh bài tập, nhận lời giải từng bước cùng Gia sư AI.</p>
        </div>
        <ol className={styles.guideSteps} role="list">
          <li>
            <span aria-hidden="true">1</span>
            <div><strong>Chọn ảnh đề bài</strong><p>Ảnh rõ nét, đầy đủ nội dung. PNG, JPG hoặc WEBP, tối đa 5 MB.</p></div>
          </li>
          <li>
            <span aria-hidden="true">2</span>
            <div><strong>Thêm câu hỏi của bạn</strong><p>Ghi phần cần hỗ trợ và kiểm tra phí Sao trước khi gửi.</p></div>
          </li>
          <li>
            <span aria-hidden="true">3</span>
            <div><strong>Gửi và xem lời giải</strong><p>Chờ kết quả từng bước. Các yêu cầu được lưu trong lịch sử.</p></div>
          </li>
        </ol>
        <div className={styles.guideActions}>
          <Button appearance="outline" onClick={() => setGuideOpen(false)}>Để sau</Button>
          <Button onClick={() => {
            setGuideOpen(false)
            onOpenTutor()
          }}>Bắt đầu dùng</Button>
        </div>
      </ScrollableModal>
    </>
  )
}

export default CourseTutorMascot
