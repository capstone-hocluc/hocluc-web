import { useEffect, useRef, useState } from 'react'
import type { Domain, LandingIconName } from '../../data/landing-content'
import Icon from './Icon'

// Marks echo real V-ACT question types from the curriculum master data (appendix C of
// 03-NoiDung-MasterData-NganHang): passages/spelling/arguments, conditionals/cloze/tenses,
// integrals/probability/Casio, deduction/patterns/charts, hypothesis/experiments/trends.
type SubjectMark = { text: string } | { icon: LandingIconName }

const subjectVisuals: Record<
  string,
  { image: string; caption: string; topics: string[]; marks: SubjectMark[] }
> = {
  'tieng-viet': {
    image: 'star-reading-v2-card.webp',
    caption: 'Đọc sâu, hiểu đúng.',
    topics: ['Đọc hiểu văn bản', 'Sử dụng tiếng Việt', 'Lập luận và suy luận'],
    marks: [{ icon: 'scroll-text' }, { icon: 'pen-line' }, { icon: 'message-square-quote' }],
  },
  'tieng-anh': {
    image: 'mai-english-v1-card.webp',
    caption: 'Hiểu ngôn ngữ trong ngữ cảnh.',
    topics: ['Từ vựng và ngữ pháp', 'Điền từ vào đoạn văn', 'Đọc hiểu tiếng Anh'],
    marks: [{ text: 'If' }, { text: '[ __ ]' }, { text: '-ed' }],
  },
  toan: {
    image: 'owl-teacher-teaching-card.webp',
    caption: 'Hiểu bản chất, tìm cách giải.',
    topics: ['Kiến thức Toán học', 'Tư duy định lượng', 'Kỹ năng máy tính'],
    marks: [{ text: '∫' }, { text: 'P(A)' }, { text: 'fx' }],
  },
  logic: {
    image: 'nam-analysis-v1-card.webp',
    caption: 'Kết nối dữ kiện, tìm quy luật.',
    topics: ['Suy luận logic', 'Bảng và biểu đồ', 'Phân tích dữ kiện'],
    marks: [{ icon: 'split' }, { icon: 'puzzle' }, { icon: 'chart-column-increasing' }],
  },
  'khoa-hoc': {
    image: 'robot-science-v2-card.webp',
    caption: 'Khám phá bằng chứng khoa học.',
    topics: ['Đọc dữ liệu khoa học', 'Phân tích thí nghiệm', 'Kiểm chứng giả thuyết'],
    marks: [{ icon: 'lightbulb' }, { icon: 'flask-conical' }, { icon: 'trending-up' }],
  },
}

export default function CatalogSection({
  domains,
  onOpenDomain,
}: {
  domains: Domain[]
  onOpenDomain: (id: string) => void
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelHover = () => {
    if (hoverTimer.current !== null) clearTimeout(hoverTimer.current)
    hoverTimer.current = null
  }

  useEffect(
    () => () => {
      if (hoverTimer.current !== null) clearTimeout(hoverTimer.current)
    },
    []
  )

  const preview = (id: string) => {
    cancelHover()
    setActiveId(id)
  }

  return (
    <section className="subjects-section" id="chuong-trinh" aria-labelledby="subjects-title">
      <div className="container">
        <div className="subjects-heading">
          <h2 id="subjects-title">Bạn muốn bắt đầu từ đâu?</h2>
        </div>
        <div className="subject-list">
          {domains.map((domain) => (
            <button
              type="button"
              className={`subject-item subject-item--${domain.id}${activeId === domain.id ? ' is-previewed' : ''}`}
              key={domain.id}
              onPointerEnter={(event) => {
                if (event.pointerType === 'touch') return
                cancelHover()
                hoverTimer.current = setTimeout(() => setActiveId(domain.id), 120)
              }}
              onPointerLeave={cancelHover}
              onFocus={() => preview(domain.id)}
              onClick={() => {
                preview(domain.id)
                onOpenDomain(domain.id)
              }}
              aria-label={`Khám phá ${domain.title}`}
              aria-haspopup="dialog"
              aria-describedby={`subject-caption-${domain.id}`}
            >
              <span className="subject-art" aria-hidden="true">
                {subjectVisuals[domain.id] ? (
                  <img
                    src={`/landing-v2/assets/${subjectVisuals[domain.id].image}`}
                    alt=""
                    width={384}
                    height={384}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span className="subject-symbol">{domain.label}</span>
                )}
                {subjectVisuals[domain.id]?.marks.map((mark) => (
                  <span className="subject-mark" key={'icon' in mark ? mark.icon : mark.text}>
                    {'icon' in mark ? <Icon name={mark.icon} /> : mark.text}
                  </span>
                ))}
              </span>
              <span className="subject-name">{domain.title}</span>
              <span className="subject-caption" id={`subject-caption-${domain.id}`}>
                {subjectVisuals[domain.id]?.caption ?? domain.desc}
              </span>
              <Icon name="arrow-up-right" />
            </button>
          ))}
        </div>
        <div className="subject-preview" role="region" aria-label="Xem trước nhóm kiến thức">
          <div
            className={`subject-preview-prompt${activeId === null ? ' is-visible' : ''}`}
            aria-hidden={activeId !== null}
          >
            <Icon name="book-open" />
            <div>
              <h3>Một nhóm kiến thức, một bước tiến.</h3>
              <p>Rê chuột hoặc dùng phím Tab để xem trước. Chọn một nhóm để khám phá chi tiết.</p>
            </div>
          </div>
          {domains.map((domain) => (
            <div
              className={`subject-preview-content${activeId === domain.id ? ' is-visible' : ''}`}
              key={domain.id}
              aria-hidden={activeId !== domain.id}
              inert={activeId !== domain.id}
            >
              <div className="subject-preview-copy">
                <h3>{domain.title}</h3>
                <p>{domain.desc}</p>
              </div>
              <ul className="subject-topics" aria-label={`Nội dung ${domain.title}`}>
                {(
                  subjectVisuals[domain.id]?.topics ??
                  domain.modules.slice(0, 3).map((module) => module.title)
                ).map((topic) => (
                  <li key={topic}>
                    <Icon name="check" />
                    {topic}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="text-link subject-preview-link"
                onClick={() => onOpenDomain(domain.id)}
                aria-haspopup="dialog"
              >
                Xem nội dung nhóm <Icon name="arrow-right" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
