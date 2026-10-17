import type { LandingIconName } from '../../data/landing-content'
import Icon from '../landing-page/Icon'
import { courseDate, parseCourseDate } from '../landing-page/landing-course-format'
import type { DescriptionBlock } from './course-detail-content'

type Kind = 'audience' | 'learn' | 'get' | 'time' | 'other'

// The course descriptions use a few recurring headings; each gets its own tile.
function kindOf(heading: string | null): Kind {
  const text = (heading ?? '').toLocaleLowerCase('vi-VN')
  if (text.includes('dành cho ai')) return 'audience'
  if (text.includes('học gì') || text.includes('sẽ biết')) return 'learn'
  if (text.includes('nhận được')) return 'get'
  if (text.includes('thời gian')) return 'time'
  return 'other'
}

const GET_ICONS: LandingIconName[] = ['package', 'chart-column-increasing', 'message-circle', 'trending-up', 'sparkles', 'lightbulb']
const DAY_MS = 24 * 60 * 60 * 1000

function daysUntil(value?: string) {
  const date = parseCourseDate(value)
  if (!date) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((date.getTime() - today.getTime()) / DAY_MS)
  return days > 0 ? days : null
}

function Audience({ block }: { block: DescriptionBlock }) {
  return (
    <article className="ab-tile ab-audience">
      <div className="ab-audience-copy">
        <span className="ab-kicker">Có phải bạn?</span>
        <h3>{block.heading}</h3>
        <ul>
          {block.bullets.map((item, index) => (
            <li key={index}>
              <span className="ab-tick" aria-hidden="true">
                <Icon name="check" />
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <figure className="ab-audience-art" aria-hidden="true">
        <span className="ab-bubble">Khóa này dành cho mình!</span>
        <img src="/landing-v2/assets/mai-avatar-interaction.webp" alt="" loading="lazy" />
      </figure>
    </article>
  )
}

function Learn({ block }: { block: DescriptionBlock }) {
  return (
    <article className="ab-tile ab-learn">
      <span className="ab-kicker">Lộ trình kiến thức</span>
      <h3>{block.heading}</h3>
      <ol>
        {block.bullets.map((item, index) => (
          <li key={index}>
            <span className="ab-num" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </article>
  )
}

function Get({ block }: { block: DescriptionBlock }) {
  return (
    <article className="ab-tile ab-get">
      <span className="ab-kicker">Trọn gói</span>
      <h3>{block.heading}</h3>
      <ul>
        {block.bullets.map((item, index) => (
          <li key={index}>
            <span className={`ab-get-icon tone-${index % 4}`} aria-hidden="true">
              <Icon name={GET_ICONS[index % GET_ICONS.length]} />
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}

function Time({ block, startDate }: { block: DescriptionBlock; startDate?: string }) {
  const days = daysUntil(startDate)
  const start = parseCourseDate(startDate)
  return (
    <article className="ab-tile ab-time">
      {days && start && (
        <div className="ab-countdown">
          <strong>{days}</strong>
          <span>
            ngày nữa
            <br />
            khai giảng {courseDate.format(start)}
          </span>
        </div>
      )}
      <div className="ab-time-copy">
        <h3>{block.heading}</h3>
        <ul>
          {block.bullets.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>
    </article>
  )
}

function Other({ block }: { block: DescriptionBlock }) {
  return (
    <article className="ab-tile ab-other">
      {block.heading && <h3>{block.heading}</h3>}
      {block.lines.map((line, index) => (
        <p key={index}>{line}</p>
      ))}
      {block.bullets.length > 0 && (
        <ul>
          {block.bullets.map((item, index) => (
            <li key={index}>
              <Icon name="check" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

// "Giới thiệu khóa học" as a bento: who it is for (with Mai), what you learn as numbered steps,
// what you get on a dark tile, and the timing as a strip with a countdown to the start date.
export default function CourseAbout({ blocks, startDate }: { blocks: DescriptionBlock[]; startDate?: string }) {
  const lead = blocks.filter((block) => !block.heading).flatMap((block) => block.lines)
  const tiles = blocks.filter((block) => block.heading)
  return (
    <section className="cd-block" aria-labelledby="cd-about-title">
      <h2 id="cd-about-title">Giới thiệu khóa học</h2>
      {lead.length > 0 && <p className="ab-lead">{lead.join(' ')}</p>}
      <div className="ab-bento">
        {tiles.map((block, index) => {
          switch (kindOf(block.heading)) {
            case 'audience':
              return <Audience key={index} block={block} />
            case 'learn':
              return <Learn key={index} block={block} />
            case 'get':
              return <Get key={index} block={block} />
            case 'time':
              return <Time key={index} block={block} startDate={startDate} />
            default:
              return <Other key={index} block={block} />
          }
        })}
      </div>
    </section>
  )
}
