import type { LandingHero } from '../../data/landing-content'
import Icon from './Icon'
import AuthLink from './AuthLink'
import { useHeroCarousel } from './useHeroCarousel'

function HeroSection({ hero }: { hero: LandingHero }) {
  const { slides } = hero
  const { active, handlers, manuallyPaused, togglePause, selectSlide } = useHeroCarousel(
    slides.length
  )

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
            <a className="btn btn-secondary" href="#khoa-hoc">
              <Icon name="book-open" />
              {hero.secondaryCta}
            </a>
          </div>
          <p className="hero-note">Bài đánh giá miễn phí · Cần đăng nhập</p>
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
          <div className="hero-carousel-controls">
            <div className="hero-slide-buttons" aria-label="Chọn hình minh họa">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`Xem hình ${index + 1}: ${slide.label}`}
                  aria-pressed={index === active}
                  onClick={() => selectSlide(index)}
                >
                  <span />
                </button>
              ))}
            </div>
            <button
              type="button"
              className="hero-pause"
              onClick={togglePause}
              aria-label={
                manuallyPaused ? 'Tiếp tục chuyển hình tự động' : 'Dừng chuyển hình tự động'
              }
            >
              {manuallyPaused ? 'Tiếp tục' : 'Tạm dừng'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HeroSection
