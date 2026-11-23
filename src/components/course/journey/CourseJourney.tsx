import { useCallback, useMemo, type CSSProperties, type ReactNode } from 'react'
import Icon from '../../landing-page/Icon'
import '../../../styles/landing/course-journey.css'
import type { JourneyContent } from './journey-content'
import { FINISH_TONE, START_TONE, stageTone } from './journey-tones'
import JourneyBackdrop from './JourneyBackdrop'
import JourneyFinale, { type JourneyOffer } from './JourneyFinale'
import JourneyIntro from './JourneyIntro'
import JourneyLandmarks from './JourneyLandmarks'
import JourneyProgress, { type JourneyStep } from './JourneyProgress'
import JourneyStage from './JourneyStage'
import { useJourneyScene } from './use-journey-scene'

interface CourseJourneyProps {
  /** Lets the page scroll to the road. */
  id?: string
  journey: JourneyContent
  offer: JourneyOffer
  /** The page's buy button, shown on the card at the finish. */
  buy: ReactNode
}

// A bundle course's roadmap as a road the page scrolls along. The scene stays on screen while the
// section scrolls: the camera drives from the start flag past one pin per stage to the finish
// arch, stopping at each stage to show its courses and at the finish to offer the course.
export default function CourseJourney({ id, journey, offer, buy }: CourseJourneyProps) {
  const stageCount = journey.stages.length
  const { tripRef, sceneRef, canvasRef, landmarksRef, progressRestRef, screens, mode, step, goTo, leave } =
    useJourneyScene(stageCount)
  const stageTones = useMemo(
    () => Array.from({ length: stageCount }, (_, index) => stageTone(index, stageCount)),
    [stageCount]
  )
  const steps = useMemo<JourneyStep[]>(
    () => [
      { label: journey.start.label, tone: START_TONE },
      ...journey.stages.map((stage, index) => ({ label: stage.name, tone: stageTones[index] })),
      { label: journey.finish.step, tone: FINISH_TONE },
    ],
    [journey, stageTones]
  )
  const pickStage = useCallback((stage: number) => goTo(stage + 1), [goTo])
  const restart = useCallback(() => goTo(0), [goTo])

  return (
    <section
      id={id}
      className="cj-trip"
      ref={tripRef}
      style={{ '--cj-screens': screens } as CSSProperties}
      aria-label={journey.title}
      data-testid="course-journey"
    >
      <div className="cj-scene" ref={sceneRef}>
        <JourneyBackdrop />
        <canvas className="cj-floor" ref={canvasRef} aria-hidden="true" />
        <JourneyLandmarks
          ref={landmarksRef}
          journey={journey}
          stageTones={stageTones}
          onPickStage={pickStage}
        />
        <div className="cj-fog" aria-hidden="true" />

        <JourneyProgress steps={steps} current={step} restRef={progressRestRef} onGo={goTo} />
        <button type="button" className="cj-skip" onClick={leave}>
          Bỏ qua <Icon name="chevron-down" />
        </button>

        <JourneyIntro shown={mode === 0} title={journey.title} summary={journey.summary} />
        {journey.stages.map((stage, index) => (
          <JourneyStage
            key={stage.key}
            stage={stage}
            number={index + 1}
            stageCount={stageCount}
            tone={stageTones[index]}
            companions={journey.companions}
            shown={mode === index + 1}
          />
        ))}
        <JourneyFinale
          finish={journey.finish}
          offer={offer}
          buy={buy}
          shown={mode === stageCount + 1}
          onRestart={restart}
        />
      </div>
    </section>
  )
}
