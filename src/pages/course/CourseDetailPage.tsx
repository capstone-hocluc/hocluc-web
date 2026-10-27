import { useEffect, useMemo, useState } from 'react'
import CourseAbout from '../../components/course/CourseAbout'
import {
  ownChapters,
  parseDescription,
  roadmapStages,
  shortCourseName,
  weeksBetween,
  type RoadmapStage,
} from '../../components/course/course-detail-content'
import AuthLink from '../../components/landing-page/AuthLink'
import Icon from '../../components/landing-page/Icon'
import LandingLink from '../../components/landing-page/LandingLink'
import {
  courseDate,
  formatCoursePrice,
  parseCourseDate,
} from '../../components/landing-page/landing-course-format'
import { PublicFooter, PublicHeader } from '../../components/landing-page/PublicChrome'
import { landingHero } from '../../data/landing-content'
import { ApiError } from '../../lib/api'
import { formatDuration, formatExamLabel } from '../../lib/courseFormat'
import { getErrorMessage } from '../../lib/errors'
import { showErrorToast, showSuccessToast } from '../../lib/toastBus'
import { addCartItem } from '../../services/cartService'
import {
  getCourseDetail,
  type CourseChapter,
  type CourseDetail,
  type CourseOutcomeView,
  type GiftCourse,
} from '../../services/courseService'
import '../../styles/landing/landing-page.css'
import '../../styles/landing/course-page.css'

interface CourseDetailPageProps {
  courseId: string
  onBackToHome: () => void
  onBackToCatalog: () => void
  onStartLearning: (courseId: string) => void
  onGoToCart: () => void
}

const day = (value?: string) => {
  const date = parseCourseDate(value)
  return date ? courseDate.format(date) : null
}

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
      <h2 id="cd-outcomes-title">Học xong bạn sẽ</h2>
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

function Roadmap({ stages }: { stages: RoadmapStage[] }) {
  const phases = stages.filter((stage) => stage.id !== 'throughout').length
  return (
    <section className="cd-block" aria-labelledby="cd-roadmap-title">
      <h2 id="cd-roadmap-title">Lộ trình {phases} giai đoạn</h2>
      <ol className="cd-stages">
        {stages.map((stage, index) => (
          <li key={stage.id} className="cd-stage">
            <span className="cd-stage-mark" aria-hidden="true">
              {stage.id === 'throughout' ? <Icon name="rotate-ccw" /> : index + 1}
            </span>
            <div className="cd-stage-body">
              <h3>{stage.name}</h3>
              {stage.note && <p>{stage.note}</p>}
              {stage.gifts.length > 0 && (
                <ul className="cd-gifts">
                  {stage.gifts.map((gift) => (
                    <GiftCard key={gift.courseId} gift={gift} />
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Chapters({ chapters, purchased }: { chapters: CourseChapter[]; purchased: boolean }) {
  return (
    <section className="cd-block" aria-labelledby="cd-content-title">
      <h2 id="cd-content-title">Nội dung khóa học</h2>
      <div className="cd-chapters">
        {chapters.map((chapter, index) => {
          const lessons = [...chapter.lessons].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
          return (
            <details key={chapter.id} className="cd-chapter" open={index === 0}>
              <summary>
                <span className="cd-chapter-index">Chương {index + 1}</span>
                <span className="cd-chapter-title">{chapter.title}</span>
                <span className="cd-chapter-count">{lessons.length} bài</span>
                <Icon name="chevron-down" />
              </summary>
              <ul className="cd-lessons">
                {lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <span className="cd-lesson-title">{lesson.title}</span>
                    {lesson.preview && !purchased && <span className="cd-chip is-preview">Học thử</span>}
                    {lesson.durationSeconds ? (
                      <span className="cd-lesson-time">{formatDuration(lesson.durationSeconds)}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </details>
          )
        })}
      </div>
    </section>
  )
}

function BuyAction({
  course,
  adding,
  onAdd,
  onStart,
  onCart,
}: {
  course: CourseDetail
  adding: boolean
  onAdd: () => void
  onStart: () => void
  onCart: () => void
}) {
  if (course.purchased)
    return (
      <button type="button" className="btn btn-primary" onClick={onStart}>
        Vào học <Icon name="arrow-right" />
      </button>
    )
  if (course.inCart)
    return (
      <button type="button" className="btn btn-secondary" onClick={onCart}>
        <Icon name="shopping-cart" /> Xem giỏ hàng
      </button>
    )
  return (
    <button type="button" className="btn btn-primary" onClick={onAdd} disabled={adding}>
      <Icon name="shopping-cart" /> {adding ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}
    </button>
  )
}

// Public course page in the landing look, ordered as a purchase decision: what it is and what it
// costs, who it is for, the roadmap with the courses that come with it, then help to decide.
function CourseDetailPage({ courseId, onBackToCatalog, onStartLearning, onGoToCart }: CourseDetailPageProps) {
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'not-found'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [addingToCart, setAddingToCart] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [coverFailed, setCoverFailed] = useState(false)

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
    const gifts = course.gifts ?? []
    const stages = roadmapStages(course.phases ?? [], gifts)
    // The roadmap section tells the stages, so the description's own roadmap paragraph is dropped.
    const about = parseDescription(course.description).filter(
      (block) => !(stages && block.heading?.startsWith('Lộ trình'))
    )
    const giftLessons = gifts.reduce((sum, gift) => sum + gift.lessonCount, 0)
    return {
      gifts,
      stages,
      about,
      chapters: ownChapters(course),
      lessons: (course.lessonCount ?? 0) + giftLessons,
      weeks: weeksBetween(course.startDate, course.endDate),
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
                  <h3>{status === 'error' ? 'Không thể tải khóa học' : 'Không tìm thấy khóa học'}</h3>
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
                    Xem các khóa học
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

                <div className="cd-layout">
                  <div className="cd-main">
                    <header className="cd-hero">
                      {formatExamLabel(course.targetExam) && (
                        <span className="eyebrow">{formatExamLabel(course.targetExam)}</span>
                      )}
                      <h1>{course.title}</h1>
                      {course.shortIntroduction && <p className="cd-lead">{course.shortIntroduction}</p>}
                      <dl className="cd-facts">
                        {day(course.startDate) && (
                          <div>
                            <dt>Khai giảng</dt>
                            <dd>
                              {day(course.startDate)}
                              {day(course.endDate) && ` – ${day(course.endDate)}`}
                            </dd>
                          </div>
                        )}
                        {day(course.examSessionDate) && (
                          <div>
                            <dt>Ngày thi</dt>
                            <dd>
                              {course.examSession && `${course.examSession.name} · `}
                              {day(course.examSessionDate)}
                              {course.examSession && !course.examSession.dateConfirmed && ' (dự kiến)'}
                            </dd>
                          </div>
                        )}
                        {view.weeks && (
                          <div>
                            <dt>Thời gian học</dt>
                            <dd>{view.weeks} tuần</dd>
                          </div>
                        )}
                        {view.gifts.length > 0 && (
                          <div>
                            <dt>Khóa đi kèm</dt>
                            <dd>{view.gifts.length} khóa</dd>
                          </div>
                        )}
                        {view.lessons > 0 && (
                          <div>
                            <dt>Bài học</dt>
                            <dd>{view.lessons} bài</dd>
                          </div>
                        )}
                      </dl>
                    </header>

                    {view.about.length > 0 && <CourseAbout blocks={view.about} startDate={course.startDate} />}

                    {course.outcomes && course.outcomes.length > 0 && <Outcomes outcomes={course.outcomes} />}

                    {view.stages ? (
                      <Roadmap stages={view.stages} />
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
                  </div>

                  <aside className="cd-aside" aria-label="Đăng ký khóa học">
                    <div className="cd-buy">
                      <div className="cd-buy-cover">
                        {course.imageUrl && !coverFailed ? (
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

              <section className="closing-cta cd-closing" aria-labelledby="cd-help-title">
                <div className="container closing-cta-inner">
                  <div>
                    <h2 id="cd-help-title">
                      {view.gifts.length > 0 ? 'Chưa chắc lộ trình này hợp với bạn?' : 'Chưa biết nên học phần nào trước?'}
                    </h2>
                    <p>Làm bài đánh giá miễn phí để biết phần nào cần ôn trước.</p>
                  </div>
                  <div className="closing-cta-actions">
                    <AuthLink className="btn btn-primary">
                      {landingHero.primaryCta} <Icon name="arrow-right" />
                    </AuthLink>
                    <LandingLink className="btn btn-secondary" href="/courses">
                      Xem khóa học khác
                    </LandingLink>
                  </div>
                </div>
              </section>

              <div className="cd-mobile-bar">
                {price && <strong>{price}</strong>}
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
