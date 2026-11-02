import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import CourseCatalogSection, { ROADMAP_TAB } from '../components/landing-page/CourseCatalogSection'
import DetailDialog, { type LandingDetail } from '../components/landing-page/DetailDialog'
import ExamIntroSection from '../components/landing-page/ExamIntroSection'
import { useScrollReveal } from '../components/landing-page/use-scroll-reveal'
import HeroSection from '../components/landing-page/HeroSection'
import JourneySection from '../components/landing-page/JourneySection'
import LandingHeader from '../components/landing-page/LandingHeader'
import LandingSprite from '../components/landing-page/LandingSprite'
import StartDialog from '../components/landing-page/StartDialog'
import StudentAppSection from '../components/landing-page/StudentAppSection'
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
} from '../data/landing-content'
import { useLearnerTheme } from '../hooks/useLearnerTheme'
import '../styles/landing/landing-page.css'

function scrollToSection(id: string) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth' })
}

// A course shop first: the hero, then the catalog by subject, then the calculator app; everything
// that explains how studying works follows below.
function LandingPage() {
  useLearnerTheme()
  const [detail, setDetail] = useState<LandingDetail | null>(null)
  const [startOpen, setStartOpen] = useState(false)
  const [courseTab, setCourseTab] = useState(ROADMAP_TAB)
  const rootRef = useRef<HTMLDivElement>(null)
  useScrollReveal(rootRef)

  // Opens one subject's courses from anywhere on the page.
  const showSubject = (subjectKey: string) => {
    setCourseTab(subjectKey)
    scrollToSection('khoa-hoc')
  }

  const openOperation = (operationId: string) => {
    const operation = practiceOperations.find((item) => item.id === operationId)
    if (operation) setDetail({ kind: 'operation', operation })
  }

  // Close the modal first so the page behind it is no longer inert, then move to the courses.
  const viewRecommendedSubject = (subjectKey: string) => {
    flushSync(() => setStartOpen(false))
    showSubject(subjectKey)
  }

  return (
    <div id="top" ref={rootRef} className={`landing-page${detail || startOpen ? ' modal-open' : ''}`}>
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      <LandingSprite />
      <LandingHeader />
      <main id="main">
        <HeroSection hero={landingHero} />
        <CourseCatalogSection activeTab={courseTab} onTabChange={setCourseTab} />
        <StudentAppSection />
        <JourneySection onStart={() => setStartOpen(true)} onOpenOperation={openOperation} />
        <LearningSupportSection />
        <ExamIntroSection exam={examIntro} />
        <FaqSection />
        <ClosingCtaSection />
      </main>
      <LandingFooter />
      <DetailDialog detail={detail} onClose={() => setDetail(null)} />
      <StartDialog
        open={startOpen}
        domains={domains}
        onClose={() => setStartOpen(false)}
        onViewSubject={viewRecommendedSubject}
      />
    </div>
  )
}

export default LandingPage
