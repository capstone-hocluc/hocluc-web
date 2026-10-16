import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import CatalogSection from '../components/landing-page/CatalogSection'
import DetailDialog, { type LandingDetail } from '../components/landing-page/DetailDialog'
import ExamIntroSection, { ExamFacts } from '../components/landing-page/ExamIntroSection'
import CoursesSection from '../components/landing-page/CoursesSection'
import HeroSection from '../components/landing-page/HeroSection'
import JourneySection from '../components/landing-page/JourneySection'
import LandingHeader from '../components/landing-page/LandingHeader'
import LandingSprite from '../components/landing-page/LandingSprite'
import SampleLessonSection, {
  type SampleLessonHandle,
} from '../components/landing-page/SampleLessonSection'
import StartDialog from '../components/landing-page/StartDialog'
import {
  LearningSupportSection,
  ClosingCtaSection,
  FaqSection,
  LandingFooter,
} from '../components/landing-page/StaticSections'
import {
  domains,
  examIntro,
  landingHero,
  practiceOperations,
  sampleQuestions,
} from '../data/landing-content'
import '../styles/landing/landing-page.css'

function LandingPage() {
  const [detail, setDetail] = useState<LandingDetail | null>(null)
  const [startOpen, setStartOpen] = useState(false)
  const lessonRef = useRef<SampleLessonHandle>(null)

  const openDomain = (domainId: string) => {
    const domain = domains.find((item) => item.id === domainId)
    if (domain) setDetail({ kind: 'domain', domain })
  }

  const openOperation = (operationId: string) => {
    const operation = practiceOperations.find((item) => item.id === operationId)
    if (operation) setDetail({ kind: 'operation', operation })
  }

  const viewRecommendedDomain = (domainId: string) => {
    setStartOpen(false)
    openDomain(domainId)
  }

  // Close the modal first so the page behind it is no longer inert, then bring the sample lesson into view.
  const tryLesson = () => {
    flushSync(() => setDetail(null))
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document
      .getElementById('hoc-thu')
      ?.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth' })
    lessonRef.current?.focusLesson()
  }

  return (
    <div className={`landing-page${detail || startOpen ? ' modal-open' : ''}`}>
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      <LandingSprite />
      <LandingHeader />
      <main id="main">
        <HeroSection hero={landingHero} />
        <ExamFacts exam={examIntro} />
        <CatalogSection domains={domains} onOpenDomain={openDomain} />
        <CoursesSection />
        <SampleLessonSection ref={lessonRef} questions={sampleQuestions} />
        <JourneySection onStart={() => setStartOpen(true)} onOpenOperation={openOperation} />
        <LearningSupportSection />
        <ExamIntroSection exam={examIntro} />
        <FaqSection />
        <ClosingCtaSection />
      </main>
      <LandingFooter />
      <DetailDialog detail={detail} onClose={() => setDetail(null)} onTryLesson={tryLesson} />
      <StartDialog
        open={startOpen}
        domains={domains}
        onClose={() => setStartOpen(false)}
        onViewDomain={viewRecommendedDomain}
      />
    </div>
  )
}

export default LandingPage
