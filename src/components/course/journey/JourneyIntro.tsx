import Icon from '../../landing-page/Icon'

// What the trip opens on: the roadmap's title over the whole road, and a nudge to start scrolling.
export default function JourneyIntro({ shown, title, summary }: { shown: boolean; title: string; summary: string }) {
  return (
    <>
      <div className={`cj-intro${shown ? ' is-on' : ''}`}>
        <h2>{title}</h2>
        <p>{summary}</p>
      </div>
      <div className={`cj-hint${shown ? ' is-on' : ''}`} aria-hidden="true">
        <Icon name="chevron-down" />
        Cuộn để bắt đầu
      </div>
    </>
  )
}
