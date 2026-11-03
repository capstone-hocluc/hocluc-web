import type { HeroSlide, LandingHero } from '../../data/landing-content'
import { studentRoutes } from '../../lib/studentRoutes'
import AuthLink from './AuthLink'
import Icon from './Icon'
import { useHeroCarousel } from './useHeroCarousel'

const rise = (delayMs: number) => ({ animationDelay: `${delayMs}ms` })

// The logo mark's rising body and its wing (viewBox 16 19 317 419), drawn large behind the students.
const MARK_BODY =
  'M328.518,19.272C299.417,96.693 287.323,118.643 214.002,165.783C178.848,188.385 143.570,205.310 114.192,239.619C78.509,281.292 54.562,318.822 54.562,375.510C54.563,397.462 59.607,417.339 66.642,436.728C75.988,433.579 146.934,373.922 156.855,362.534C198.693,314.507 195.594,255.769 229.255,219.888C283.951,161.585 350.052,109.432 328.518,19.272Z'
const MARK_WING =
  'M17.220,167.000C66.923,198.487 80.405,221.623 73.000,280.989C89.316,249.107 115.290,226.007 142.000,202.897C122.546,173.063 50.415,154.821 17.220,167.000Z'

// `first` is the LCP image. `near` marks the slides next to the shown one: they sit outside the
// viewport while hidden, so lazy loading would wait until they fade in; they load early at low priority.
type SlideProps = { slide: HeroSlide; active: boolean; first: boolean; near: boolean }

// Students cut out in front of a layered copy of the logo's rising stroke, with a dashed flight line.
function RiseArt({ slide, active, first, near }: SlideProps) {
  return (
    <>
      <svg
        aria-hidden="true"
        viewBox="16 19 317 419"
        className="absolute -bottom-[8%] right-[4%] h-[96%] w-auto overflow-visible lg:bottom-[1%] lg:right-[7%] lg:h-[92%] lg:[mask-image:linear-gradient(to_bottom,black_72%,transparent_96%)]"
      >
        <defs>
          <linearGradient id="hero-rise-body" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#0b3a82" />
            <stop offset="1" stopColor="#1e88ff" />
          </linearGradient>
          <radialGradient id="hero-rise-head" cx="0.35" cy="0.35" r="0.8">
            <stop offset="0" stopColor="#e3f1ff" />
            <stop offset="1" stopColor="#7cc8ff" />
          </radialGradient>
        </defs>
        <path transform="translate(26 -16) rotate(4 190 230)" fill="#d3e8ff" d={MARK_BODY} />
        <path transform="translate(12 -7)" fill="#7cc8ff" opacity={0.55} d={MARK_BODY} />
        <path fill="#9bd8fd" opacity={0.9} d={MARK_WING} />
        <path fill="url(#hero-rise-body)" d={MARK_BODY} />
        <circle cx="185.22" cy="118.91" r="40.53" fill="url(#hero-rise-head)" />
      </svg>
      <svg
        aria-hidden="true"
        viewBox="0 0 400 300"
        fill="none"
        className="absolute left-[6%] top-[2%] hidden h-[54%] w-[62%] overflow-visible lg:block"
      >
        <path
          d="M10 280 C 90 250, 120 160, 210 150 S 330 90, 380 20"
          stroke="#1e88ff"
          strokeWidth="2.5"
          strokeDasharray="7 9"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path d="M366 18 l22 -8 l-8 22 l-4 -9 z" fill="#0b3a82" />
      </svg>
      <img
        src={slide.src}
        srcSet={`${slide.src.replace('.webp', '-720.webp')} 720w, ${slide.src} 1400w`}
        sizes="(max-width: 1023px) 92vw, 680px"
        alt={slide.alt}
        width={1400}
        height={1028}
        fetchPriority={first ? 'high' : 'low'}
        loading={first || near ? undefined : 'lazy'}
        // From lg the group sits a little above the bottom, level with the headline, and the cut-out fades out
        // at its waist instead of being cut by the edge.
        className={`absolute bottom-0 left-1/2 w-[min(94%,680px)] -translate-x-1/2 drop-shadow-[0_24px_30px_rgba(11,35,72,0.22)] lg:bottom-[7%] lg:[mask-image:linear-gradient(to_bottom,black_78%,transparent)] ${active ? 'motion-safe:animate-rise' : ''}`}
      />
    </>
  )
}

// A photo filling the right of the hero; on large screens it fades out towards the text.
function PhotoArt({ slide, active, first, near }: SlideProps) {
  return (
    <img
      src={slide.src}
      srcSet={`${slide.src.replace('.webp', '-800.webp')} 800w, ${slide.src} 1536w`}
      sizes="(max-width: 1023px) 100vw, 60vw"
      alt={slide.alt}
      width={1536}
      height={1024}
      fetchPriority={first ? 'high' : 'low'}
      loading={first || near ? undefined : 'lazy'}
      className={`absolute inset-0 h-full w-full object-cover object-[50%_35%] lg:[mask-image:linear-gradient(to_right,transparent,black_38%)] ${active ? 'motion-safe:animate-settle' : ''}`}
    />
  )
}

// The offer and the two actions stay put on the left; the picture on the right cycles between the
// students in front of the logo shape and bright photos of studying. The hero fills the first screen
// under the sticky header (84px from lg, 76px below), so the course catalog starts right under the
// fold instead of being cut through by it.
function HeroSection({ hero }: { hero: LandingHero }) {
  const { slides } = hero
  const { active, paused, selectSlide, step, rootProps, viewportProps } = useHeroCarousel()
  const count = slides.length
  const isNear = (index: number) =>
    index === (active + 1) % count || index === (active + count - 1) % count

  return (
    <section className="hero relative isolate flex min-h-[calc(100svh-76px)] flex-col justify-center overflow-hidden bg-(--soft) lg:min-h-[calc(100svh-84px)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(55%_65%_at_88%_8%,rgba(30,136,255,0.18),transparent_70%),radial-gradient(45%_55%_at_0%_100%,rgba(11,58,130,0.1),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 [background-image:radial-gradient(rgba(11,58,130,0.13)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]"
      />

      {/* From lg the grid's empty right column lies over the picture; let pointers through to it. */}
      <div className="container relative z-10 grid items-center gap-10 py-14 lg:pointer-events-none lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:py-20">
        <div className="pointer-events-auto relative flex flex-col gap-6">
          <h1
            className="text-[clamp(2.5rem,4.6vw,3.75rem)]! leading-[1.08]! motion-safe:animate-rise"
            style={rise(0)}
          >
            <span className="block">{hero.titleLines[0]}</span>
            <span className="block text-(--blue)">{hero.titleLines[1]}</span>
          </h1>
          <p className="max-w-[44ch] text-lg! motion-safe:animate-rise" style={rise(80)}>
            {hero.description}
          </p>
          <div className="hero-buttons flex flex-wrap gap-3 motion-safe:animate-rise" style={rise(160)}>
            <a className="btn btn-primary" href="#khoa-hoc">
              <Icon name="book-open" />
              {hero.coursesCta}
            </a>
            <AuthLink
              destination={studentRoutes.placement()}
              className="btn btn-secondary bg-white! hover:bg-(--blue-soft)!"
            >
              {hero.assessmentCta}
              <Icon name="arrow-right" />
            </AuthLink>
          </div>
        </div>
      </div>

      {/* The carousel wrapper is left unpositioned: from lg the picture and its controls are placed
          against the section, the picture over the right 58% and the controls on its bottom-right corner. */}
      <div role="region" aria-roledescription="carousel" aria-label="Cảnh học tập cùng Hocluc" {...rootProps}>
        <div
          {...viewportProps}
          className="hero-showcase relative mx-4 mb-4 h-[min(78vw,440px)] overflow-hidden rounded-[28px] sm:mx-6 lg:absolute lg:inset-y-0 lg:right-0 lg:m-0 lg:h-auto lg:w-[58%] lg:overflow-visible lg:rounded-none"
        >
          <div className="flex h-full touch-pan-y touch-pinch-zoom" aria-live={paused ? 'polite' : 'off'}>
            {slides.map((slide, index) => {
              const isActive = index === active
              const Art = slide.kind === 'rise' ? RiseArt : PhotoArt
              return (
                // Until Embla takes over the opacity, only the selected slide shows.
                <figure
                  key={slide.id}
                  className={`hero-slide relative m-0 h-full min-w-0 shrink-0 grow-0 basis-full ${isActive ? '' : 'opacity-0'}`}
                  id={slide.id}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${index + 1}/${slides.length}: ${slide.label}`}
                  aria-hidden={!isActive}
                  inert={!isActive}
                >
                  <Art slide={slide} active={isActive} first={index === 0} near={isNear(index)} />
                  <figcaption className="sr-only">
                    <strong>{slide.label}</strong>
                    <span>{slide.caption}</span>
                  </figcaption>
                </figure>
              )
            })}
          </div>
        </div>

        {/* Below the picture on small screens; over its bottom-right corner from lg. */}
        <div className="relative z-20 mx-auto -mt-2 mb-8 flex w-fit items-center gap-0.5 rounded-full bg-white/85 p-1 shadow-[0_12px_30px_-14px_rgba(11,35,72,0.45)] backdrop-blur-md lg:absolute lg:bottom-8 lg:right-8 lg:m-0">
          <button
            type="button"
            className="grid size-9 place-items-center rounded-full text-(--ink) transition-colors hover:bg-white"
            aria-label="Hình trước"
            onClick={() => step(-1)}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div className="hero-slide-buttons flex items-center" role="group" aria-label="Chọn hình">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                className="group grid h-9 place-items-center px-1"
                aria-label={`Xem hình ${index + 1}: ${slide.label}`}
                aria-current={index === active ? 'true' : undefined}
                aria-controls={slide.id}
                onClick={() => selectSlide(index)}
              >
                <span className="block h-2 w-2 rounded-full bg-[#0b2348]/25 transition-all duration-300 group-hover:bg-[#0b2348]/50 group-aria-[current=true]:w-6 group-aria-[current=true]:bg-(--blue)" />
              </button>
            ))}
          </div>
          <button
            type="button"
            className="grid size-9 place-items-center rounded-full text-(--ink) transition-colors hover:bg-white"
            aria-label="Hình sau"
            onClick={() => step(1)}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      <a
        href="#khoa-hoc"
        aria-label="Xem các khóa học bên dưới"
        className="absolute bottom-5 left-1/2 z-20 hidden size-11 -translate-x-1/2 place-items-center rounded-full bg-white/85 text-(--ink)! shadow-[0_12px_30px_-14px_rgba(11,35,72,0.45)] ring-1 ring-(--line) backdrop-blur-md transition-colors hover:bg-white lg:grid [&_.ui-icon]:size-5!"
      >
        <span className="grid place-items-center motion-safe:animate-float-slow">
          <Icon name="chevron-down" />
        </span>
      </a>
    </section>
  )
}

export default HeroSection
