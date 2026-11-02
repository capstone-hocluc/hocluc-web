import type { LandingHero } from '../../data/landing-content'
import { studentRoutes } from '../../lib/studentRoutes'
import AuthLink from './AuthLink'
import Icon from './Icon'
import { tiltClass, usePointerTilt } from './use-pointer-tilt'
import { useHeroCarousel } from './useHeroCarousel'

const rise = (delayMs: number) => ({ animationDelay: `${delayMs}ms` })

// Compact hero so the course catalog starts inside the first screen: the offer, the two actions,
// and photos of how students study that keep cycling.
function HeroSection({ hero }: { hero: LandingHero }) {
  const { slides } = hero
  const { active, selectSlide } = useHeroCarousel(slides.length)
  const tilt = usePointerTilt<HTMLDivElement>(3)

  return (
    <section className="hero relative isolate overflow-hidden bg-(--soft)">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(55%_65%_at_88%_8%,rgba(30,136,255,0.18),transparent_70%),radial-gradient(45%_55%_at_0%_100%,rgba(11,58,130,0.1),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 [background-image:radial-gradient(rgba(11,58,130,0.13)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]"
      />

      <div className="container grid items-center gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:gap-14 lg:py-16">
        <div className="flex flex-col gap-6">
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

        <div className="relative motion-safe:animate-rise" style={rise(80)}>
          <div
            ref={tilt}
            className={`hero-showcase relative aspect-[3/2] overflow-hidden rounded-[28px] bg-white shadow-[0_44px_90px_-44px_rgba(11,35,72,0.55)] ring-1 ring-black/5 ${tiltClass}`}
            role="region"
            aria-roledescription="carousel"
            aria-label="Cảnh học tập cùng Học Lực"
          >
            {slides.map((slide, index) => {
              const isActive = index === active
              return (
                <figure
                  key={slide.id}
                  className={`hero-slide absolute inset-0 transition-opacity duration-700 ease-out ${isActive ? 'opacity-100' : 'opacity-0'}`}
                  id={slide.id}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${index + 1} trên ${slides.length}: ${slide.label}`}
                  aria-hidden={!isActive}
                  inert={!isActive}
                >
                  <img
                    src={slide.src}
                    srcSet={`${slide.src.replace('.webp', '-800.webp')} 800w, ${slide.src} 1536w`}
                    sizes="(max-width: 1023px) 100vw, 640px"
                    alt={slide.alt}
                    width={1536}
                    height={1024}
                    fetchPriority={index === 0 ? 'high' : undefined}
                    loading={index === 0 ? undefined : 'lazy'}
                    className={`h-full w-full object-cover ${isActive ? 'motion-safe:animate-settle' : ''}`}
                  />
                  <figcaption className="sr-only">
                    <strong>{slide.label}</strong>
                    <span>{slide.caption}</span>
                  </figcaption>
                </figure>
              )
            })}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#0b2348]/70 to-transparent"
            />
            <div
              key={slides[active]?.id}
              aria-hidden="true"
              className="absolute bottom-5 left-5 right-28 flex flex-col gap-0.5 text-white motion-safe:animate-rise"
            >
              <strong className="text-lg font-bold">{slides[active]?.label}</strong>
              <span className="hidden text-sm text-white/85 sm:block">{slides[active]?.caption}</span>
            </div>
            <div className="absolute bottom-4 right-4 flex items-center gap-0.5 rounded-full bg-[#0b2348]/35 px-1.5 backdrop-blur-sm">
              <div className="hero-slide-buttons flex items-center" aria-label="Chọn hình">
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    className="group grid h-9 place-items-center px-1"
                    aria-label={`Xem hình ${index + 1}: ${slide.label}`}
                    aria-pressed={index === active}
                    aria-controls={slide.id}
                    onClick={() => selectSlide(index)}
                  >
                    <span className="block h-2 w-2 rounded-full bg-white/55 transition-all duration-300 group-hover:bg-white group-aria-pressed:w-6 group-aria-pressed:bg-white" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HeroSection
