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
    <section className="hero" {...handlers}>
      <div className="container hero-grid">
        <div className="hero-copy">
          <p className="hero-tagline">
            <img src="/hocluc-mark.svg" alt="" width="20" height="26" />
            <span>Học vững · Lực bền · Vươn xa</span>
          </p>
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
                  srcSet={`${slide.src.replace('.webp', '-800.webp')} 800w, ${slide.src} 1536w`}
                  sizes="(max-width: 760px) 100vw, 54vw"
                  alt={slide.alt}
                  width={1536}
                  height={1024}
                  fetchPriority={index === 0 ? 'high' : undefined}
                  loading={index === 0 ? undefined : 'lazy'}
                />
                <figcaption className="sr-only">
                  <strong>{slide.label}</strong>
                  <span>{slide.caption}</span>
                </figcaption>
              </figure>
            )
          })}
        </div>
      </div>
      <div className="container hero-topic-controls">
        <div className="hero-slide-buttons" aria-label="Chọn chủ đề học tập">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Xem hình ${index + 1}: ${slide.label}`}
              aria-pressed={index === active}
              aria-controls={slide.id}
              onClick={() => selectSlide(index)}
            >
              <span className="hero-topic-number" aria-hidden="true">
                0{index + 1}
              </span>
              <span className="hero-topic-copy">
                <strong>{slide.label}</strong>
                <span>{slide.caption}</span>
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="hero-pause"
          onClick={togglePause}
          aria-label={manuallyPaused ? 'Tiếp tục chuyển hình tự động' : 'Dừng chuyển hình tự động'}
        >
          {manuallyPaused ? 'Tiếp tục' : 'Tạm dừng'}
        </button>
      </div>
    </section>
  )
}

export default HeroSection
