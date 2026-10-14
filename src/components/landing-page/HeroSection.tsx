import type { LandingHero } from '../../data/landing-content'
import Icon from './Icon'
import AuthLink from './AuthLink'
import { useHeroCarousel } from './useHeroCarousel'

function HeroSection({ hero }: { hero: LandingHero }) {
  const { slides } = hero
  const { active, handlers } = useHeroCarousel(slides.length)

  return (
    <section className="hero" id="top" {...handlers}>
      <div className="container hero-grid">
        <div className="hero-copy">
          <h1>
            <span className="hero-title-line">{hero.titleLines[0]}</span>
            <span className="hero-title-line accent">{hero.titleLines[1]}</span>
          </h1>
          <p className="hero-copy-description">{hero.description}</p>
          <div className="hero-buttons">
            <AuthLink className="btn btn-primary">
              {hero.primaryCta}
              <Icon name="arrow-right" />
            </AuthLink>
            <a className="btn btn-secondary" href="#chuong-trinh">
              <Icon name="book-open" />
              {hero.secondaryCta}
            </a>
          </div>
        </div>
        <div
          className="hero-showcase hero-carousel"
          role="region"
          aria-roledescription="carousel"
          aria-label="Cảnh học tập cùng Học Lực"
        >
          {slides.map((slide, index) => {
            const isActive = index === active
            return (
              <figure
                key={slide.id}
                className={`hero-slide${isActive ? ' is-active' : ''}`}
                id={slide.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} trên ${slides.length}: ${slide.label}`}
                aria-hidden={!isActive}
                inert={!isActive}
              >
                <img
                  src={slide.src}
                  alt={slide.alt}
                  width={1672}
                  height={940}
                  fetchPriority={index === 0 ? 'high' : undefined}
                  loading={index === 0 ? undefined : 'lazy'}
                />
              </figure>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default HeroSection
