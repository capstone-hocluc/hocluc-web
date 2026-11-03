// People cut out of a photo, standing on the section background the way the hero's students do: soft colour shapes
// behind them, a dashed line and a few small marks, and a faint shadow where they rest. The shapes mix a warm
// accent with the light blue so the section is not all blue.

interface CutoutStageProps {
  src: string
  /** The ~800px wide version, for small screens. */
  small: string
  width: number
  height: number
  alt: string
  sizes: string
  /** Which side the warm shape leans to, so two stages on a page do not mirror each other exactly. */
  lean?: 'left' | 'right'
  className?: string
}

export default function CutoutStage({ src, small, width, height, alt, sizes, lean = 'left', className = '' }: CutoutStageProps) {
  const warmSide = lean === 'left' ? 'left-[2%]' : 'right-[2%]'
  const coolSide = lean === 'left' ? 'right-[4%]' : 'left-[4%]'
  return (
    // The caller places it (relative in the flow, or absolute in a panel); the shapes inside need it positioned.
    <div className={`isolate ${className}`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        {/* a warm blob and a light blue one, overlapping behind the people */}
        <div
          className={`absolute top-[8%] ${warmSide} aspect-square w-[58%] rounded-[46%_54%_52%_48%/55%_47%_53%_45%] bg-[radial-gradient(circle_at_40%_40%,#ffe1c7,#fff1e6_60%,transparent_72%)]`}
        />
        <div
          className={`absolute top-[18%] ${coolSide} aspect-square w-[52%] rounded-full bg-[radial-gradient(circle_at_55%_45%,#dcebff,#eef5ff_58%,transparent_72%)]`}
        />
        {/* a dashed arc rising over them, and two small marks */}
        <svg viewBox="0 0 400 300" className="absolute inset-x-0 top-0 h-[70%] w-full" fill="none">
          <path
            d={lean === 'left' ? 'M20 230 C 90 90, 230 40, 380 30' : 'M380 230 C 310 90, 170 40, 20 30'}
            stroke="#f0a35e"
            strokeOpacity="0.7"
            strokeWidth="2"
            strokeDasharray="6 8"
            strokeLinecap="round"
          />
        </svg>
        <span className={`absolute top-[6%] ${lean === 'left' ? 'right-[12%]' : 'left-[12%]'} size-3 rounded-full bg-[#f0a35e]`} />
        <span className={`absolute top-[30%] ${lean === 'left' ? 'left-[6%]' : 'right-[6%]'} size-2 rounded-[3px] bg-(--blue)/60`} />
        {/* where they rest */}
        <div className="absolute inset-x-[12%] bottom-0 h-[8%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(11,35,72,0.16),transparent)]" />
      </div>
      <img
        src={src}
        srcSet={`${small} 800w, ${src} ${width}w`}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        className="relative block h-auto w-full"
      />
    </div>
  )
}
