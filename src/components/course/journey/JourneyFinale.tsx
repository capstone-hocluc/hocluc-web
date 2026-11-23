import { memo, useState, type CSSProperties, type ReactNode } from 'react'
import type { JourneyContent } from './journey-content'
import { FINISH_TONE, toneVars } from './journey-tones'
import JourneyStats from './JourneyStats'

/** The course on sale, as the card at the finish shows it. */
export interface JourneyOffer {
  title: string
  cover?: string
  price: string | null
  owned: boolean
}

interface JourneyFinaleProps {
  finish: JourneyContent['finish']
  offer: JourneyOffer
  /** The page's buy button. */
  buy: ReactNode
  shown: boolean
  onRestart: () => void
}

// Confetti thrown when the finish comes on: where each piece lands, its spin and its colour.
const CONFETTI: [x: number, y: number, spin: number, color: string][] = [
  [-210, -150, 220, '#e5484d'],
  [-150, -230, -160, '#1e88ff'],
  [-80, -270, 300, '#f5b63f'],
  [-20, -200, -240, '#27735b'],
  [40, -280, 190, '#f7b500'],
  [100, -220, -280, '#7652bf'],
  [160, -250, 260, '#1e88ff'],
  [220, -160, -200, '#f5b63f'],
  [-250, -70, 140, '#7652bf'],
  [250, -80, -150, '#e5484d'],
  [-120, -120, 320, '#1e88ff'],
  [130, -130, -310, '#27735b'],
]

// The end of the road: the exam day and the whole roadmap in figures on the left, the course to
// buy on the right.
function JourneyFinale({ finish, offer, buy, shown, onRestart }: JourneyFinaleProps) {
  const [coverFailed, setCoverFailed] = useState(false)
  return (
    <div className={`cj-stage${shown ? ' is-on' : ''}`} style={toneVars(FINISH_TONE)} data-testid="journey-finish">
      <div className="cj-burst" aria-hidden="true">
        {CONFETTI.map(([x, y, spin, color], index) => (
          <i
            key={index}
            style={{ '--x': `${x}px`, '--y': `${y}px`, '--r': `${spin}deg`, background: color } as CSSProperties}
          />
        ))}
      </div>
      <div className="cj-head">
        <span className="cj-badge">Về đích</span>
        <h3>
          {finish.headline.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h3>
        {finish.note && <p>{finish.note}</p>}
        <JourneyStats stats={finish.stats} />
      </div>
      <div className="cj-side is-offer">
        <div className="cj-buy">
          {offer.cover && !coverFailed && (
            <img className="cj-buy-cover" src={offer.cover} alt="" onError={() => setCoverFailed(true)} />
          )}
          <h4>{offer.title}</h4>
          {offer.price && <p className="cj-buy-price">{offer.price}</p>}
          {buy}
          {offer.owned && <p className="cj-buy-note">Bạn đã sở hữu khóa học này.</p>}
          <button type="button" className="text-link" onClick={onRestart}>
            Đi lại từ đầu
          </button>
        </div>
      </div>
    </div>
  )
}

export default memo(JourneyFinale)
