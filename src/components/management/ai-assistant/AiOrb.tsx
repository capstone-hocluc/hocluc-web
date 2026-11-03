// A small dot ring for the assistant's status line, drawn in the console's
// primary ink instead of DeepTutor's canvas orb.
const RING = Array.from({ length: 8 }, (_, index) => {
  const angle = (Math.PI / 4) * index
  return {
    cx: 9 + Math.cos(angle) * 5.2,
    cy: 9 + Math.sin(angle) * 5.2,
  }
})

export default function AiOrb({
  active = false,
  box = 18,
}: {
  active?: boolean
  box?: number
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 18 18"
      width={box}
      height={box}
      className={active ? 'shrink-0 text-primary-text' : 'shrink-0 text-primary-text opacity-60'}
    >
      {RING.map((dot, index) => (
        <circle
          key={index}
          cx={dot.cx}
          cy={dot.cy}
          r={1.35}
          fill="currentColor"
          className={active ? 'animate-pulse motion-reduce:animate-none' : undefined}
          style={active ? { animationDelay: `${index * 0.12}s` } : undefined}
        />
      ))}
      <circle cx={9} cy={9} r={1.05} fill="currentColor" opacity={0.9} />
    </svg>
  )
}
