import { useEffect, useMemo, useState } from 'react'
import BundleCourses from '../../components/course/BundleCourses'
import BuyAction from '../../components/course/BuyAction'
import ChapterList from '../../components/course/ChapterList'
import CourseAbout from '../../components/course/CourseAbout'
import { courseFacts } from '../../components/course/course-facts'
import CourseJourney from '../../components/course/journey/CourseJourney'
import { buildJourney } from '../../components/course/journey/journey-content'
import { useJourneyScreen } from '../../components/course/journey/use-journey-screen'
import CourseReviews from '../../components/course/reviews/CourseReviews'
import IntroVideo from '../../components/course/IntroVideo'
import SmallCourseOverview from '../../components/course/small-course/SmallCourseOverview'
import SmallCourseStats from '../../components/course/small-course/SmallCourseStats'
import SmallCourseTags from '../../components/course/small-course/SmallCourseTags'
import { smallCourseContent } from '../../components/course/small-course/small-course-content'
import {
  courseNameWithoutTagline,
  ownChapters,
  parseDescription,
  shortCourseName,
  weeksBetween,
} from '../../components/course/course-detail-content'
import AuthLink from '../../components/landing-page/AuthLink'
import Icon from '../../components/landing-page/Icon'
import LandingLink from '../../components/landing-page/LandingLink'
import { formatCoursePrice } from '../../components/landing-page/landing-course-format'
import { PublicFooter, PublicHeader } from '../../components/landing-page/PublicChrome'
import { landingHero } from '../../data/landing-content'
import { ApiError } from '../../lib/api'
import { formatExamLabel } from '../../lib/courseFormat'
import { introVideoSource } from '../../lib/introVideo'
import { getErrorMessage } from '../../lib/errors'
import { showErrorToast, showSuccessToast } from '../../lib/toastBus'
import { addCartItem } from '../../services/cartService'
import {
  getCourseDetail,
  type CourseChapter,
  type CoursePhase,
  type CourseDetail,
  type CourseOutcomeView,
  type GiftCourse,
} from '../../services/courseService'
import '../../styles/landing/landing-page.css'
import '../../styles/landing/course-page.css'
import '../../styles/landing/course-page-bundle.css'
import '../../styles/landing/small-course.css'

interface CourseDetailPageProps {
  courseId: string
  onBackToHome: () => void
  onBackToCatalog: () => void
  onStartLearning: (courseId: string) => void
  onGoToCart: () => void
}

// Where "Xem lộ trình" in the hero scrolls to: the road, or the list of courses that stands in for it.
const ROADMAP_ID = 'cd-roadmap'

function GiftCard({ gift }: { gift: GiftCourse }) {
  return (
    <li className="cd-gift">
      <div className="cd-gift-head">
        <h4>
          <LandingLink href={`/courses/${encodeURIComponent(gift.courseId)}`}>{gift.title}</LandingLink>
        </h4>
        {gift.categoryName && <span className="cd-chip">{gift.categoryName}</span>}
      </div>
      <p className="cd-gift-meta">
        {gift.chapterCount} chương · {gift.lessonCount} bài học
      </p>
    </li>
  )
}

/** The course's learning outcomes (CLO): what a student can do once it is done. */
function Outcomes({ outcomes }: { outcomes: CourseOutcomeView[] }) {
  return (
    <section className="cd-block" aria-labelledby="cd-outcomes-title">
      <h2 id="cd-outcomes-title">Sau khóa học, bạn sẽ</h2>
      <ol className="cd-outcomes">
        {outcomes.map((outcome) => (
          <li key={outcome.id}>
            <span className="cd-outcome-code">{outcome.code}</span>
            <span>{outcome.description}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Roadmap({ phases }: { phases: CoursePhase[] }) {
  return (
    <section className="cd-block" aria-labelledby="cd-roadmap-title">
      <h2 id="cd-roadmap-title">Lộ trình học</h2>
      <ol className="cd-stages">
        {phases.map((phase, index) => (
          <li key={phase.id ?? 'unphased'} className="cd-stage">
            <span className="cd-stage-mark" aria-hidden="true">{phase.id ? index + 1 : <Icon name="rotate-ccw" />}</span>
            <div className="cd-stage-body">
              <h3>{phase.name ?? 'Xuyên suốt lộ trình'}</h3>
              {phase.sections.flatMap((section) => section.chapters).map((chapter) => <p key={chapter.id}>{chapter.title}</p>)}
              {phase.gifts.length > 0 && <ul className="cd-gifts">{phase.gifts.map((gift) => <GiftCard key={gift.courseId} gift={gift} />)}</ul>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Chapters({ chapters, purchased }: { chapters: CourseChapter[]; purchased: boolean }) {
  return (
    <section className="cd-block cd-curriculum" aria-labelledby="cd-content-title">
      <h2 id="cd-content-title">Nội dung khóa học</h2>
      <ChapterList chapters={chapters} purchased={purchased} />
    </section>
  )
}

// Public course page in the landing look, ordered as a purchase decision: what it is and what it
// costs, who it is for, the roadmap with the courses that come with it, then help to decide.
// A course made of smaller courses in stages tells that roadmap as a road across the whole page
// (CourseJourney) where the screen has room for it, and as a list of the courses everywhere else.
function CourseDetailPage({ courseId, onBackToCatalog, onStartLearning, onGoToCart }: CourseDetailPageProps) {
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'not-found'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [addingToCart, setAddingToCart] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [coverFailed, setCoverFailed] = useState(false)
  const journeyScreen = useJourneyScreen()

  useEffect(() => {
    let cancelled = false
    getCourseDetail(courseId)
      .then((response) => {
        if (cancelled) return
        if (!response.data) {
          setStatus('not-found')
          return
        }
        setCourse(response.data)
        setStatus('ready')
      })
      .catch((error) => {
        if (cancelled) return
        if (error instanceof ApiError && error.status === 404) {
          setStatus('not-found')
          return
        }
        setErrorMessage(getErrorMessage(error))
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [courseId, reloadKey])

  const handleAddToCart = async () => {
    if (!course || addingToCart) return
    setAddingToCart(true)
    try {
      const response = await addCartItem(course.id)
      const isNowInCart = response.data
        ? response.data.items.some((item) => item.courseId === course.id)
        : true
      setCourse({ ...course, inCart: isNowInCart })
      showSuccessToast('Đã thêm khóa học vào giỏ hàng.')
    } catch (error) {
      showErrorToast(getErrorMessage(error))
    } finally {
      setAddingToCart(false)
    }
  }

  const view = useMemo(() => {
    if (!course) return null
    const phases = [...(course.phases ?? [])].sort((a, b) => (a.sequence ?? Infinity) - (b.sequence ?? Infinity))
    const gifts = phases.flatMap((phase) => phase.gifts)
    const stages = phases.some((phase) => phase.id) ? phases : null
    // The roadmap section tells the stages, so the description's own roadmap paragraph is dropped.
    const about = parseDescription(course.description).filter(
      (block) => !(stages && block.heading?.startsWith('Lộ trình'))
    )
    const giftLessons = gifts.reduce((sum, gift) => sum + gift.lessonCount, 0)
    const chapters = ownChapters(course)
    // Made only of smaller courses (it teaches no chapters itself): shown as the set it is.
    const bundle = gifts.length > 0 && chapters.length === 0
    // Any other course shows its description part by part, its fact line as tags in the hero.
    const small = bundle ? null : smallCourseContent(about)
    const lessons = (course.lessonCount ?? 0) + giftLessons
    const weeks = weeksBetween(course.startDate, course.endDate)
    return {
      gifts,
      phases,
      bundle,
      journey: bundle ? buildJourney(course) : null,
      stages,
      about,
      small,
      chapters,
      facts: courseFacts(course, {
        bundle,
        giftCount: gifts.length,
        chapterCount: chapters.length,
        lessonCount: lessons,
        weeks,
        hours: small?.hours ?? null,
      }),
    }
  }, [course])

  const buy = course && (
    <BuyAction
      course={course}
      adding={addingToCart}
      onAdd={() => void handleAddToCart()}
      onStart={() => onStartLearning(course.id)}
      onCart={onGoToCart}
    />
  )
  const price = course ? formatCoursePrice(course.price) : null
  const journey = journeyScreen ? (view?.journey ?? null) : null

  return (
    <>
      <PublicHeader />
      <div className="landing-page course-page">
        <main id="main">
          {status === 'loading' && (
            <div className="container cd-loading" aria-busy="true">
              <p className="sr-only" role="status">
                Đang tải khóa học
              </p>
              <div className="cd-skeleton is-title" />
              <div className="cd-layout">
                <div className="cd-skeleton is-body" />
                <div className="cd-skeleton is-card" />
              </div>
            </div>
          )}

          {(status === 'error' || status === 'not-found') && (
            <div className="container cd-state">
              <div className="course-empty" role="status">
                <Icon name="book-open" />
                <div>
                  <h3>{status === 'error' ? 'Chưa tải được khóa học' : 'Không tìm thấy khóa học'}</h3>
                  <p>{status === 'error' ? errorMessage : 'Khóa học này không tồn tại hoặc đã ngừng bán.'}</p>
                </div>
                {status === 'error' ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setStatus('loading')
                      setReloadKey((current) => current + 1)
                    }}
                  >
                    Thử lại <Icon name="rotate-ccw" />
                  </button>
                ) : (
                  <button type="button" className="btn btn-secondary" onClick={onBackToCatalog}>
                    Xem tất cả khóa học
                  </button>
                )}
              </div>
            </div>
          )}

          {status === 'ready' && course && view && (
            <>
              <div className="container">
                <nav className="cd-breadcrumb" aria-label="Breadcrumb">
                  <LandingLink href="/">Trang chủ</LandingLink>
                  <span aria-hidden="true">/</span>
                  <LandingLink href="/courses">Khóa học</LandingLink>
                  <span aria-hidden="true">/</span>
                  <span aria-current="page">{shortCourseName(course.title)}</span>
                </nav>

                <div className={`cd-layout${view.bundle ? ' is-bundle' : ''}${journey ? ' is-before-road' : ''}`}>
                  <div className="cd-main">
                    <header className="cd-hero">
                      {view.small ? (
                        <SmallCourseTags exam={formatExamLabel(course.targetExam) || null} tags={view.small.tags} />
                      ) : (
                        formatExamLabel(course.targetExam) && (
                          <span className="eyebrow">{formatExamLabel(course.targetExam)}</span>
                        )
                      )}
                      <h1>{course.title}</h1>
                      {course.shortIntroduction && <p className="cd-lead">{course.shortIntroduction}</p>}
                      {view.small?.intro.map((line, index) => (
                        <p key={index} className="sc-intro">
                          {line}
                        </p>
                      ))}
                      {view.small ? (
                        <SmallCourseStats facts={view.facts} />
                      ) : (
                        <dl className="cd-facts">
                          {view.facts.map((fact) => (
                            <div key={fact.key}>
                              <dt>{fact.label}</dt>
                              <dd>
                                {fact.value}
                                {fact.note && <span className="cd-facts-note"> · {fact.note}</span>}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      {view.bundle && (
                        <button
                          type="button"
                          className="btn btn-secondary cd-hero-jump"
                          onClick={() => document.getElementById(ROADMAP_ID)?.scrollIntoView({ block: 'start' })}
                        >
                          Xem lộ trình <Icon name="chevron-down" />
                        </button>
                      )}
                    </header>

                    {view.small ? (
                      <SmallCourseOverview content={view.small} outcomes={course.outcomes ?? []} />
                    ) : (
                      <>
                        {view.about.length > 0 && (
                          <CourseAbout blocks={view.about} startDate={course.startDate} includedCount={view.gifts.length} />
                        )}
                        {course.outcomes && course.outcomes.length > 0 && <Outcomes outcomes={course.outcomes} />}
                      </>
                    )}

                    {journey ? null : view.bundle ? (
                      <BundleCourses id={ROADMAP_ID} phases={view.phases} purchased={Boolean(course.purchased)} />
                    ) : view.stages ? (
                      <Roadmap phases={view.stages} />
                    ) : (
                      view.gifts.length > 0 && (
                        <section className="cd-block" aria-labelledby="cd-gifts-title">
                          <h2 id="cd-gifts-title">Khóa học đi kèm ({view.gifts.length})</h2>
                          <ul className="cd-gifts">
                            {view.gifts.map((gift) => (
                              <GiftCard key={gift.courseId} gift={gift} />
                            ))}
                          </ul>
                        </section>
                      )
                    )}

                    {view.chapters.length > 0 && (
                      <Chapters chapters={view.chapters} purchased={Boolean(course.purchased)} />
                    )}

                    {!journey && <CourseReviews courseId={course.id} />}
                  </div>

                  <aside className="cd-aside" aria-label="Đăng ký khóa học">
                    <div className="cd-buy">
                      <div className="cd-buy-cover">
                        {introVideoSource(course.videoUrl) ? (
                          <IntroVideo url={course.videoUrl} title={course.title} poster={course.imageUrl} />
                        ) : course.imageUrl && !coverFailed ? (
                          <img src={course.imageUrl} alt="" onError={() => setCoverFailed(true)} />
                        ) : (
                          <div className="course-cover-fallback">
                            <Icon name="book-open" />
                          </div>
                        )}
                      </div>
                      <div className="cd-buy-body">
                        {price && (
                          <p className="cd-price">
                            <span>Học phí</span>
                            <strong>{price}</strong>
                          </p>
                        )}
                        {view.bundle && (
                          <p className="-mt-2! text-(length:--small)">
                            Trọn bộ {view.gifts.length} khóa học, mua một lần là học được tất cả.
                          </p>
                        )}
                        {buy}
                        {course.purchased && <p className="cd-buy-note">Bạn đã sở hữu khóa học này.</p>}
                        {view.gifts.length > 0 && (
                          <LandingLink className="text-link" href="/courses">
                            So sánh các lộ trình <Icon name="arrow-right" />
                          </LandingLink>
                        )}
                      </div>
                    </div>
                  </aside>
                </div>
              </div>

              {journey && (
                <>
                  <CourseJourney
                    id={ROADMAP_ID}
                    journey={journey}
                    offer={{
                      title: courseNameWithoutTagline(course.title),
                      cover: course.imageUrl,
                      price,
                      owned: Boolean(course.purchased),
                    }}
                    buy={buy}
                  />
                  <div className="cd-after-road">
                    <div className="container">
                      <CourseReviews courseId={course.id} />
                    </div>
                  </div>
                </>
              )}

              <section className="closing-cta cd-closing" aria-labelledby="cd-help-title">
                <div className="container closing-cta-inner">
                  <div>
                    <h2 id="cd-help-title">
                      {view.gifts.length > 0 ? 'Chưa chắc lộ trình này có hợp với bạn?' : 'Chưa biết nên bắt đầu từ đâu?'}
                    </h2>
                    <p>Làm bài đánh giá miễn phí để biết phần nào cần ôn trước.</p>
                  </div>
                  <div className="closing-cta-actions">
                    <AuthLink className="btn btn-primary">
                      {landingHero.assessmentCta} <Icon name="arrow-right" />
                    </AuthLink>
                    <LandingLink className="btn btn-secondary" href="/courses">
                      Xem khóa học khác
                    </LandingLink>
                  </div>
                </div>
              </section>

              <div className="cd-mobile-bar">
                {price && (
                  <div className="grid leading-tight">
                    <strong>{price}</strong>
                    {view.bundle && (
                      <span className="text-(length:--small) text-(--muted)">Trọn bộ {view.gifts.length} khóa</span>
                    )}
                  </div>
                )}
                {buy}
              </div>
            </>
          )}
        </main>
      </div>
      <PublicFooter />
    </>
  )
}

export default CourseDetailPage
