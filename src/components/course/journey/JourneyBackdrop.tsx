// The far scenery behind the road: sky, a low sun between hills, and two drifting clouds.
export default function JourneyBackdrop() {
  return (
    <div aria-hidden="true">
      <div className="cj-sky" />
      <div className="cj-glow" />
      <div className="cj-far">
        <i className="cj-sun" />
        <i className="cj-hill is-a" />
        <i className="cj-hill is-b" />
        <i className="cj-hill is-c" />
      </div>
      <i className="cj-cloud is-a" />
      <i className="cj-cloud is-b" />
    </div>
  )
}
