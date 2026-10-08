import { useMemo, useState } from 'react'
import { Bot, ClipboardCheck, GraduationCap, Maximize2 } from 'lucide-react'
import ScrollableModal from '../../../components/student/common/ScrollableModal'
import { SegmentedTabs } from '../../../components/student/learning-profile/controls'
import { InsightCard, InsightList } from '../../../components/student/learning-profile/insights'
import {
  IconMetricCard,
  MetricGrid,
  ProfileCard,
  ProfileHeading,
  TextButton,
} from '../../../components/student/learning-profile/primitives'
import { thinScrollbar } from '../../../components/student/learning-profile/styles'
import Button from '../../../components/ui/Button'
import DropdownField from '../../../components/ui/DropdownField'
import type { LearningProfileData } from '../../../data/learningProfile'
import { cn } from '../../../lib/cn'
import { useLearningProfileData } from './learningProfileContext'
import { componentColors, practiceFilters, practiceOverviewIcons, practiceStatIcons } from './icons'
import ScoreChart from './ScoreChart'

const detailBox = 'rounded-[14px] border border-line-shell bg-[var(--color-surface-sky)] p-3.5'

function PracticeAiDetailModal({ analysis, isOpen, onClose }) {
  return (
    <ScrollableModal title="Phân tích luyện đề" isOpen={isOpen} onClose={onClose} maxWidth={720}>
      <div>
        <span className="block text-[12px] font-black text-text-secondary">{analysis.basedOn}</span>
        <p className="mt-[7px] mb-4 text-[13px] leading-[1.65] font-[750] text-text-heading-muted">
          {analysis.summary}
        </p>
        <div className="flex flex-col gap-3">
          {analysis.recommendations.map((item) => (
            <article key={item.title} className={detailBox}>
              <div className="flex items-center justify-between gap-3 max-[760px]:items-start">
                <strong className="text-[14px] font-black text-text-heading">{item.title}</strong>
                <b className="text-[12px] font-black whitespace-nowrap text-primary">
                  {item.accuracy}% chính xác
                </b>
              </div>
              <p className="my-2 text-[12px] leading-[1.55] font-[750] text-text-heading-muted">
                {item.explanation}
              </p>
              <small className="text-[12px] font-black text-warning">
                Ưu tiên: {item.priority}
              </small>
            </article>
          ))}
        </div>
      </div>
    </ScrollableModal>
  )
}

function PracticeAiHistoryModal({ analysis, isOpen, onClose }) {
  return (
    <ScrollableModal
      title="Lịch sử phân tích luyện đề"
      isOpen={isOpen}
      onClose={onClose}
      maxWidth={680}
    >
      <div className="flex flex-col gap-3">
        {analysis.history.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-line-shell bg-[var(--color-surface-sky)] p-3.5"
          >
            <div className="mb-2 flex items-center justify-between gap-3 max-[760px]:flex-col max-[760px]:items-start max-[760px]:gap-1">
              <strong className="text-[13px] font-black text-text-heading">{item.createdAt}</strong>
              <span className="text-[12px] font-extrabold text-text-secondary">{item.basedOn}</span>
            </div>
            <p className="text-[12px] leading-[1.55] font-[750] text-text-heading-muted">
              {item.summary}
            </p>
          </article>
        ))}
      </div>
    </ScrollableModal>
  )
}

function formatFeedbackDate(date) {
  if (!date) return ''

  const [year, month, day] = date.split('-')
  return day && month && year ? `${day}/${month}/${year}` : date
}

const metaLine = 'mt-[3px] block text-[12px] font-extrabold text-text-secondary'
const detailSection = 'rounded-2xl border border-line-shell bg-surface p-3.5'
const detailTitle = 'mb-2.5 text-[14px] font-black text-text-heading'

function TeacherFeedbackDetailModal({ feedback, isOpen, onClose }) {
  if (!feedback) return null

  return (
    <ScrollableModal
      title="Chi tiết nhận xét giáo viên"
      isOpen={isOpen}
      onClose={onClose}
      maxWidth={760}
    >
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center gap-3 rounded-2xl border border-line-shell bg-[var(--color-surface-sky)] p-3.5 max-[760px]:items-start">
          <span
            className="grid size-11 flex-none place-items-center overflow-hidden rounded-[14px] bg-primary-soft text-primary"
            aria-hidden="true"
          >
            {feedback.teacher.avatar ? (
              <img className="size-full object-cover" src={feedback.teacher.avatar} alt="" />
            ) : (
              <GraduationCap size={20} />
            )}
          </span>
          <div>
            <strong className="block text-[14px] font-black text-text-heading">
              {feedback.teacher.name}
            </strong>
            <span className={metaLine}>
              {feedback.teacher.role} · {feedback.teacher.subject}
            </span>
            <time className={metaLine}>{formatFeedbackDate(feedback.createdAt)}</time>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1">
          <section className={detailSection}>
            <h3 className={detailTitle}>Điểm làm tốt</h3>
            <InsightList
              tone="strength"
              items={feedback.strengths.map((item) => ({ key: item, text: item }))}
            />
          </section>
          <section className={detailSection}>
            <h3 className={detailTitle}>Nội dung cần cải thiện</h3>
            <InsightList
              tone="improvement"
              items={feedback.improvements.map((item) => ({ key: item, text: item }))}
            />
          </section>
        </div>

        <section className={detailSection}>
          <h3 className={detailTitle}>Lời khuyên</h3>
          <p className="text-[13px] leading-[1.6] font-[750] text-text-heading-muted">
            {feedback.comment}
          </p>
        </section>
      </div>
    </ScrollableModal>
  )
}

function TeacherFeedbackPanel({
  feedbackList,
  onOpenDetail,
}: {
  feedbackList: LearningProfileData['teacherFeedback']
  onOpenDetail: (feedback: LearningProfileData['teacherFeedback'][number]) => void
}) {
  const [selectedDate, setSelectedDate] = useState('all')
  const feedbackDates = [...new Set(feedbackList.map((item) => item.createdAt))]
  const visibleFeedback =
    selectedDate === 'all'
      ? feedbackList
      : feedbackList.filter((item) => item.createdAt === selectedDate)

  if (!feedbackList.length) {
    return (
      <div className="grid min-h-36 place-items-center content-center gap-2 rounded-2xl border border-dashed border-[var(--color-line-brand)] bg-[var(--color-surface-sky)] p-5 text-center [&>svg]:text-primary">
        <GraduationCap size={28} />
        <strong className="text-[14px] font-black text-text-heading">
          Chưa có nhận xét từ giáo viên
        </strong>
        <p className="max-w-[460px] text-[12px] leading-[1.55] font-[750] text-text-secondary">
          Nhận xét từ giáo viên hoặc mentor sẽ xuất hiện tại đây sau khi họ đánh giá quá trình học
          tập của bạn.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3 max-[760px]:flex-col max-[760px]:items-stretch">
        <span className="text-[12px] font-[850] text-text-secondary">Lọc theo ngày</span>
        <DropdownField
          ariaLabel="Lọc nhận xét theo ngày"
          className="w-auto"
          triggerClassName="min-h-[34px] rounded-[10px] border-line-blue bg-surface px-3 text-[12px] font-[850] text-text-emphasis outline-0"
          options={[
            { id: 'all', label: 'Tất cả nhận xét' },
            ...feedbackDates.map((date) => ({ id: date, label: formatFeedbackDate(date) })),
          ]}
          value={selectedDate}
          onChange={(value) => {
            if (value !== null) setSelectedDate(value)
          }}
        />
      </div>

      <div
        className={cn('flex max-h-[260px] flex-col gap-2.5 overflow-y-auto pr-1.5', thinScrollbar)}
      >
        {visibleFeedback.map((item) => (
          <button
            key={item.id}
            type="button"
            className="grid min-h-[92px] w-full cursor-pointer grid-cols-[minmax(0,1fr)_18px] items-start gap-3 rounded-2xl border border-[var(--color-line-brand)] bg-[var(--color-surface-sky)] p-[13px] text-left transition hover:-translate-y-px hover:border-line-brand hover:bg-[var(--color-primary-soft)] max-[760px]:grid-cols-[minmax(0,1fr)] [&>svg]:mt-1 [&>svg]:text-[var(--color-lock)] max-[760px]:[&>svg]:hidden"
            onClick={() => onOpenDetail(item)}
          >
            <div>
              <div className="flex items-center justify-between gap-2.5 max-[760px]:flex-col max-[760px]:items-start max-[760px]:gap-[3px]">
                <strong className="text-[13px] font-[850] text-text-heading">
                  {item.teacher.name}
                </strong>
                <time className="text-[12px] font-[650] text-text-secondary">
                  {formatFeedbackDate(item.createdAt)}
                </time>
              </div>
              <span className="text-[12px] font-[650] text-text-secondary">
                {item.teacher.role} · {item.teacher.subject}
              </span>
              <p className="mt-[7px] line-clamp-2 text-[12px] leading-[1.45] font-medium text-text-heading-muted">
                {item.comment}
              </p>
            </div>
            <Maximize2 size={14} />
          </button>
        ))}
      </div>
    </div>
  )
}

const sources = [
  { key: 'ai', label: 'AI phân tích', icon: <Bot size={15} /> },
  { key: 'teacher', label: 'Nhận xét giáo viên', icon: <GraduationCap size={15} /> },
]

function PracticeAiRecommendations({ onAction }) {
  const learningProfilePage = useLearningProfileData()
  const [analysis, setAnalysis] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [activeSource, setActiveSource] = useState('ai')
  const [feedbackDetail, setFeedbackDetail] = useState(null)
  const activeAnalysis = analysis
  const teacherFeedback = learningProfilePage.teacherFeedback || []
  const practiceStrengths = learningProfilePage.strengths.slice(0, 3)
  const practiceImprovements = activeAnalysis?.recommendations.slice(0, 3) || []

  const runPracticeAnalysis = () => {
    if (isAnalyzing) return

    setIsAnalyzing(true)
    window.setTimeout(() => {
      setAnalysis(learningProfilePage.practiceAiAnalysis)
      setIsAnalyzing(false)
      onAction('Phân tích luyện đề hoàn tất.')
    }, 680)
  }

  return (
    <ProfileCard as="article" className="p-5">
      <ProfileHeading
        title="Nội dung cần cải thiện"
        subtitle="Phân tích và nhận xét giúp bạn xác định nội dung cần ưu tiên cải thiện."
        className="mb-3"
      />

      <div className="mb-3 flex items-center justify-between gap-3 max-[760px]:flex-col max-[760px]:items-stretch">
        <SegmentedTabs
          variant="source"
          ariaLabel="Nguồn đánh giá"
          tabs={sources}
          active={activeSource}
          onChange={setActiveSource}
        />
        {activeSource === 'ai' && (
          <Button
            className="h-auto min-h-[38px] flex-none rounded-lg border-0 px-4 text-[14px] font-medium whitespace-nowrap hover:bg-primary-dark disabled:cursor-progress disabled:opacity-[0.72] max-[760px]:w-full"
            onClick={runPracticeAnalysis}
            disabled={isAnalyzing}
          >
            {isAnalyzing
              ? 'Đang phân tích...'
              : activeAnalysis
                ? 'Cập nhật phân tích'
                : 'Phân tích ngay'}
          </Button>
        )}
      </div>

      {activeSource === 'ai' ? (
        <>
          {!activeAnalysis && (
            <p className="mt-3.5 mb-0.5 text-center text-[12px] leading-[1.55] font-[650] text-[var(--color-lock)]">
              Hiện tại chưa có nội dung phân tích.
            </p>
          )}

          {activeAnalysis ? (
            <>
              <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1">
                <InsightCard
                  tone="strength"
                  size="lg"
                  title="Điểm mạnh"
                  onDetail={() => setDetailOpen(true)}
                >
                  <InsightList
                    tone="strength"
                    dense
                    items={practiceStrengths.map((item) => ({ key: item, text: item }))}
                  />
                </InsightCard>

                <InsightCard
                  tone="improvement"
                  size="lg"
                  title="Cần cải thiện"
                  onDetail={() => setDetailOpen(true)}
                >
                  <InsightList
                    tone="improvement"
                    dense
                    items={practiceImprovements.map((item) => ({
                      key: item.title,
                      text: item.title,
                      extra: (
                        <small className="ml-auto text-[12px] font-black whitespace-nowrap text-warning">
                          {item.accuracy}%
                        </small>
                      ),
                    }))}
                  />
                </InsightCard>
              </div>

              <TextButton className="mt-3 text-primary" onClick={() => setHistoryOpen(true)}>
                Xem lại phân tích cũ
              </TextButton>
            </>
          ) : null}
        </>
      ) : (
        <TeacherFeedbackPanel feedbackList={teacherFeedback} onOpenDetail={setFeedbackDetail} />
      )}

      {activeAnalysis && activeSource === 'ai' && (
        <>
          <PracticeAiDetailModal
            analysis={activeAnalysis}
            isOpen={detailOpen}
            onClose={() => setDetailOpen(false)}
          />
          <PracticeAiHistoryModal
            analysis={activeAnalysis}
            isOpen={historyOpen}
            onClose={() => setHistoryOpen(false)}
          />
        </>
      )}
      <TeacherFeedbackDetailModal
        feedback={feedbackDetail}
        isOpen={Boolean(feedbackDetail)}
        onClose={() => setFeedbackDetail(null)}
      />
    </ProfileCard>
  )
}

function PracticeTab({ onAction, panelId, labelledBy }) {
  const learningProfilePage = useLearningProfileData()
  const [filter, setFilter] = useState('Tất cả')
  const [selectedComponents, setSelectedComponents] = useState(() =>
    learningProfilePage.components.map((item) => item.key)
  )
  const attempts = useMemo(() => {
    if (filter === 'Tất cả') return learningProfilePage.practiceAttempts
    return learningProfilePage.practiceAttempts.filter((item) => item.type === filter)
  }, [filter])
  const componentPoints = attempts.map((attempt) => ({
    label: attempt.label,
    score: Math.round(
      selectedComponents.reduce((sum, key) => sum + (attempt.components[key] || 0), 0) /
        Math.max(1, selectedComponents.length)
    ),
  }))
  const componentSeries = learningProfilePage.components
    .filter((component) => selectedComponents.includes(component.key))
    .map((component) => ({
      key: component.key,
      label: component.name,
      color: componentColors[component.key],
      points: attempts.map((attempt) => ({
        label: attempt.label,
        score: attempt.components[component.key] || 0,
      })),
    }))

  const toggleComponent = (key) => {
    setSelectedComponents((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    )
  }

  return (
    <div
      className="flex flex-col gap-[18px]"
      role="tabpanel"
      id={panelId}
      aria-labelledby={labelledBy}
    >
      <MetricGrid four>
        {learningProfilePage.practiceOverview.map((metric) => (
          <IconMetricCard
            key={metric.key}
            icon={practiceOverviewIcons[metric.key] || ClipboardCheck}
            tone={metric.tone}
            label={metric.label}
            value={metric.value}
          />
        ))}
      </MetricGrid>

      <section className="grid grid-cols-2 items-stretch gap-[18px] max-[1181px]:grid-cols-1">
        <ScoreChart
          className="h-full"
          title="Theo dõi điểm số"
          subtitle="Dựa trên các bài thi thử gần nhất"
          points={attempts}
          filterLabel={null}
          toolbar={
            <SegmentedTabs
              variant="chip"
              ariaLabel="Lọc bài luyện đề"
              tabs={practiceFilters.map((item) => ({ key: item, label: item }))}
              active={filter}
              onChange={setFilter}
            />
          }
        />

        <ScoreChart
          className="h-full"
          title="Kết quả theo thành phần"
          points={componentPoints}
          series={componentSeries}
          target={230}
          max={300}
          componentMode
          filterLabel={null}
          toolbar={
            <div className="mb-3 flex flex-wrap gap-2">
              {learningProfilePage.components.map((component) => (
                <label
                  key={component.key}
                  className="inline-flex min-h-[34px] cursor-pointer items-center gap-2 rounded-full border border-[var(--color-line)] bg-surface px-3 text-[12px] font-black text-text-emphasis"
                >
                  <input
                    type="checkbox"
                    className="size-3.5 accent-primary"
                    checked={selectedComponents.includes(component.key)}
                    onChange={() => toggleComponent(component.key)}
                  />
                  <span>{component.name}</span>
                </label>
              ))}
            </div>
          }
        />
      </section>

      <section>
        <ProfileHeading title="Hiệu suất luyện đề" />
        <MetricGrid four>
          {learningProfilePage.practiceStats.map((metric) => (
            <IconMetricCard
              key={metric.key}
              icon={practiceStatIcons[metric.key] || ClipboardCheck}
              tone={metric.tone}
              label={metric.label}
              value={metric.value}
            />
          ))}
        </MetricGrid>
      </section>

      <PracticeAiRecommendations onAction={onAction} />
    </div>
  )
}

export default PracticeTab
