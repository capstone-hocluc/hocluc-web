import { type CSSProperties, useState } from 'react'
import { Award, BarChart3, Brain, LineChart, Trophy } from '../../../components/console/icons'
import ScrollableModal from '../../../components/student/common/ScrollableModal'
import { cn } from '../../../lib/cn'
import { ComparisonDropdown } from '../../../components/student/learning-profile/controls'
import { InsightCard, InsightList } from '../../../components/student/learning-profile/insights'
import {
  IconTile,
  MetricCard,
  ProfileCard,
  ProfileHeading,
  ProfileProgress,
  TextButton,
  TrendBadge,
} from '../../../components/student/learning-profile/primitives'
import Button from '../../../components/ui/Button'
import { useLearningProfileData } from './learningProfileContext'
import { componentIcons } from './icons'
import ScoreChart from './ScoreChart'

const achievementTone = { amber: 'trophyAmber', green: 'trophyGreen' }

function OverallCompetencySummary() {
  const learningProfilePage = useLearningProfileData()
  const profile = learningProfilePage
  const scorePercent = Math.round((profile.currentScore / profile.maxScore) * 100)

  return (
    <div className="flex min-w-0 flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--color-line-blue)] bg-surface p-[18px] max-[1181px]:items-start">
      <ProfileHeading
        title="Tổng quan năng lực"
        subtitle="Điểm ĐGNL hiện tại"
        className="mb-1 block w-full text-center max-[1181px]:text-left"
        titleClassName="text-[18px] leading-[1.25]"
      />
      <div
        className="grid size-[148px] place-items-center content-center rounded-full bg-[radial-gradient(circle_at_center,var(--color-surface)_0_58%,transparent_59%),conic-gradient(var(--color-primary)_var(--hl-profile-score),var(--color-line)_0)] shadow-[inset_0_0_0_1px_var(--color-line)] max-[1181px]:self-center"
        style={{ '--hl-profile-score': `${scorePercent}%` } as CSSProperties}
      >
        <strong className="text-[42px] leading-none font-black text-primary max-[760px]:text-[36px]">
          {profile.currentScore}
        </strong>
        <span className="text-[13px] font-black text-text-body">/ {profile.maxScore}</span>
      </div>
      <p className="text-center text-[12px] font-black text-text-secondary max-[1181px]:self-center">
        {scorePercent}% tổng thang điểm
      </p>
    </div>
  )
}

function ComponentCard({ component, trend = component.trend, trendLabel }) {
  const Icon = componentIcons[component.key] || Brain

  return (
    <ProfileCard
      as="article"
      className="flex h-full flex-col gap-3 rounded-[14px] bg-surface p-4 shadow-none"
    >
      <div className="flex items-center gap-2.5">
        <IconTile tone={component.accent}>
          <Icon size={18} />
        </IconTile>
        <strong className="text-[14px] leading-[1.25] font-black text-text-dark">
          {component.name}
        </strong>
      </div>
      <div className="flex items-baseline gap-[5px]">
        <b className="text-[31px] leading-none font-black text-text-heading">{component.score}</b>
        <small className="text-[12px] font-extrabold text-text-faint">/ {component.maxScore}</small>
      </div>
      <ProfileProgress value={component.score} max={component.maxScore} />
      <div className="flex items-center justify-between gap-3 text-[12px] font-extrabold text-text-secondary">
        <span>Độ chính xác</span>
        <strong className="text-primary">{component.accuracy}%</strong>
      </div>
      <TrendBadge value={trend} label={trendLabel} />
      {component.skills && (
        <div className="flex flex-col gap-[7px] border-t border-[var(--color-line)] pt-2.5">
          {component.skills.map((skill) => (
            <p
              key={skill.name}
              className="flex items-center justify-between gap-3 text-[12px] leading-[1.4] font-extrabold text-text-secondary"
            >
              <span>{skill.name}</span>
              <b className="text-primary">{skill.accuracy}%</b>
            </p>
          ))}
        </div>
      )}
    </ProfileCard>
  )
}

function ComponentSection({ selectedComparison, onComparisonChange }) {
  const learningProfilePage = useLearningProfileData()
  return (
    <div className="min-w-0">
      <div className="mb-3.5 flex items-start justify-between gap-3.5 max-[760px]:flex-col">
        <ProfileHeading
          title="Năng lực theo thành phần"
          subtitle="Chi tiết điểm số và độ chính xác của từng thành phần"
        />
        <ComparisonDropdown
          options={learningProfilePage.comparisonRanges}
          selected={selectedComparison}
          onChange={onComparisonChange}
        />
      </div>
      <div className="grid grid-cols-4 gap-3.5 max-[1181px]:grid-cols-2 max-[760px]:grid-cols-1">
        {learningProfilePage.components.map((component) => (
          <ComponentCard
            key={component.key}
            component={component}
            trend={selectedComparison.trends[component.key] ?? component.trend}
            trendLabel={`so với ${selectedComparison.label.toLowerCase()}`}
          />
        ))}
      </div>
    </div>
  )
}

function UnifiedCompetencySection() {
  const learningProfilePage = useLearningProfileData()
  const [selectedComparison, setSelectedComparison] = useState(
    learningProfilePage.comparisonRanges[0]
  )

  return (
    <ProfileCard
      as="section"
      className="relative grid grid-cols-[minmax(210px,0.24fr)_minmax(0,0.76fr)] items-stretch gap-[22px] overflow-hidden bg-transparent bg-[linear-gradient(rgba(28, 176, 246,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(28, 176, 246,0.045)_1px,transparent_1px),linear-gradient(135deg,rgba(248,251,255,0.98),rgba(255,255,255,0.92))] bg-[length:26px_26px,26px_26px,auto] p-5 before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_12%_18%,rgba(49,168,255,0.08),transparent_28%),radial-gradient(circle_at_86%_8%,rgba(28, 176, 246,0.07),transparent_24%)] before:content-[''] max-[1181px]:grid-cols-1 [&>*]:relative [&>*]:z-1"
    >
      <OverallCompetencySummary />
      <ComponentSection
        selectedComparison={selectedComparison}
        onComparisonChange={setSelectedComparison}
      />
    </ProfileCard>
  )
}

const legendBox = 'size-3 rounded-[4px]'
const heatLevels = ['bg-[var(--color-lock-soft)]', 'bg-[var(--color-primary-soft)]', 'bg-[var(--color-brand-soft)]', 'bg-primary']

function ActivityHeatmap({ data }) {
  return (
    <ProfileCard as="article" className="p-5">
      <ProfileHeading
        title="Tần suất học tập"
        subtitle="Duy trì thói quen học tập để đạt kết quả tốt nhất"
      />
      <div className="flex flex-wrap gap-[13px] text-[12px] font-extrabold text-text-secondary">
        {['bg-[var(--color-line)]', 'bg-[var(--color-primary-soft)]', 'bg-[var(--color-brand-soft)]', 'bg-primary'].map((color, index) => (
          <span key={color} className="inline-flex items-center gap-[7px]">
            <i className={cn(legendBox, color)} />{' '}
            {['Không có hoạt động', '<15 phút', '15-60 phút', '>60 phút'][index]}
          </span>
        ))}
      </div>
      <div className="mt-5 mb-2.5 ml-12 grid grid-cols-4 text-[12px] font-extrabold text-text-secondary max-[760px]:ml-[45px]">
        {data.months.map((month) => (
          <span key={month}>{month}</span>
        ))}
      </div>
      <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-2 overflow-hidden">
        <div className="grid grid-rows-[repeat(7,22px)] gap-[5px] text-[11px] font-extrabold text-text-secondary">
          {data.days.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="min-w-0 overflow-x-auto">
          {data.days.map((day, row) => (
            <div
              key={day}
              className="mb-[5px] grid grid-cols-[repeat(15,minmax(22px,1fr))] gap-[5px] max-[760px]:grid-cols-[repeat(15,22px)]"
            >
              {data.totals.map((total, column) => {
                const level = total === 0 ? 0 : total < 15 ? 1 : total < 60 ? 2 : 3
                return (
                  <span
                    key={`${row}-${column}`}
                    className={cn('h-[22px] min-w-[22px] rounded-md', heatLevels[level])}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </ProfileCard>
  )
}

function AchievementCard({ onAction }) {
  const learningProfilePage = useLearningProfileData()
  return (
    <ProfileCard as="article" className="p-[18px]">
      <div className="mb-[13px] flex items-center justify-between gap-3 max-[760px]:flex-col max-[760px]:items-start">
        <strong className="inline-flex items-center gap-2 text-[15px] font-black text-text-dark">
          <Award size={18} />
          Thành tựu gần đây
        </strong>
        <Button
          appearance="ghost"
          className="h-auto rounded-full border-0 bg-[var(--color-surface-brand)] px-2.5 py-[7px] text-[11px] font-black hover:bg-[var(--color-surface-brand)]"
          onClick={onAction}
        >
          Xem tất cả
        </Button>
      </div>
      <div className="flex flex-col gap-3">
        {learningProfilePage.achievements.map((item) => (
          <div
            key={item.title}
            className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-2.5"
          >
            <IconTile tone={achievementTone[item.tone] ?? item.tone} size="lg">
              <Award size={15} />
            </IconTile>
            <p className="text-[12px] leading-[1.45] font-black text-text-emphasis">{item.title}</p>
            <time className="text-[11px] font-black text-text-faint">{item.date}</time>
          </div>
        ))}
      </div>
    </ProfileCard>
  )
}

const historyStrong = 'text-[13px] font-black text-text-heading'
const historySpan = 'text-[12px] font-extrabold text-text-secondary'

// Rendered inside a history item, so it takes that item's span/strong styling.
function AnalysisResult({ analysis }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className={historySpan}>Phân tích dựa trên kết quả làm đề gần đây</span>
      <p className="text-[12px] leading-[1.55] font-[750] text-text-emphasis">{analysis.summary}</p>
      <div className="grid grid-cols-1 gap-2.5">
        {[
          { title: 'Điểm mạnh', items: analysis.strengths, box: 'border-[var(--color-line-practice)] bg-[var(--color-practice-soft)]' },
          {
            title: 'Cần cải thiện',
            items: analysis.improvements,
            box: 'border-[var(--color-live-line)] bg-[var(--color-live-tint)]',
          },
        ].map((group) => (
          <div key={group.title} className={cn('rounded-[13px] border px-3 py-[11px]', group.box)}>
            <strong className={cn('inline-flex items-center gap-[7px]', historyStrong)}>
              {group.title}
            </strong>
            <ul className="mt-[9px] flex flex-col gap-1.5">
              {group.items.map((item) => (
                <li
                  key={item}
                  className="text-[12px] leading-[1.4] font-extrabold text-text-heading-muted"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

const detailBox = 'rounded-[14px] border border-line-shell bg-[var(--color-surface-sky)] p-3.5'

function AiInsightDetailModal({ insight, analysis, isOpen, onClose }) {
  if (!insight || !analysis) return null

  return (
    <ScrollableModal title={insight.detailTitle} isOpen={isOpen} onClose={onClose} maxWidth={720}>
      <div>
        <p className="mb-4 text-[13px] leading-[1.65] font-[750] text-text-heading-muted">
          {analysis.summary}
        </p>
        <div className="flex flex-col gap-3">
          {insight.items.map((item) => (
            <article key={item} className={detailBox}>
              <strong className="block text-[14px] leading-[1.35] font-black text-text-heading">
                {item}
              </strong>
              <span className="mt-[5px] block text-[12px] leading-[1.55] font-[750] text-text-secondary">
                {insight.description}
              </span>
            </article>
          ))}
        </div>
      </div>
    </ScrollableModal>
  )
}

function AiInsightCard({ type, title, items, onDetail }) {
  return (
    <InsightCard
      tone={type === 'strength' ? 'strength' : 'improvement'}
      size="sm"
      title={title}
      onDetail={onDetail}
    >
      <InsightList
        tone={type === 'strength' ? 'strength' : 'improvement'}
        dense
        items={items.map((item) => ({ key: item, text: item }))}
      />
    </InsightCard>
  )
}

const bannerButton =
  'h-auto min-h-10 rounded-lg border-0 px-3.5 text-[14px] font-medium whitespace-nowrap hover:bg-primary-dark disabled:cursor-progress disabled:opacity-[0.72] max-[760px]:w-full'

function AiLearningAssistant({ analysis, isAnalyzing, onAnalyze, onOpenHistory }) {
  const [detailType, setDetailType] = useState(null)
  const activeAnalysis = analysis
  const insightDetails = {
    strength: {
      detailTitle: 'Chi tiết điểm mạnh',
      items: activeAnalysis?.strengths || [],
      description:
        'Nên tiếp tục duy trì nhịp luyện tập ở nhóm kỹ năng này trong các bài học và đề gần nhất.',
    },
    improvement: {
      detailTitle: 'Chi tiết cần cải thiện',
      items: activeAnalysis?.improvements || [],
      description:
        'Nên ưu tiên ôn tập có chủ đích và theo dõi lại độ chính xác sau mỗi phiên luyện đề.',
    },
  }
  const selectedInsight = detailType ? insightDetails[detailType] : null

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-3 border border-transparent',
        activeAnalysis &&
          'rounded-[20px] border-[var(--color-line)] bg-surface p-2.5 shadow-[0_12px_26px_rgba(17,24,58,0.045)]'
      )}
    >
      <section className="relative min-h-[82px] min-w-0 rounded-[18px] border border-[var(--color-line-brand)] bg-linear-to-b from-[var(--color-primary-bright)] to-primary p-2.5 shadow-[0_14px_26px_rgba(28, 176, 246,0.16)] max-[760px]:min-h-0 max-[760px]:p-3.5">
        <div className="relative z-2 -mr-0.5 grid min-w-0 grid-cols-[minmax(126px,auto)_minmax(0,1fr)] items-center gap-2.5 rounded-[17px] border border-white/72 bg-surface p-2 shadow-[0_14px_28px_rgba(12,37,118,0.16)] max-[760px]:mr-0 max-[760px]:grid-cols-1 max-[760px]:p-3">
          <Button className={bannerButton} onClick={onAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? 'Đang phân tích...' : analysis ? 'Cập nhật phân tích' : 'Phân tích ngay'}
          </Button>
          <p className="text-[12px] leading-[1.45] font-medium text-text-emphasis">
            Phân tích kết quả làm đề của bạn để tìm ra điểm mạnh và nội dung cần cải thiện.
          </p>
        </div>
      </section>

      {activeAnalysis ? (
        <div className="flex flex-col gap-2.5">
          <AiInsightCard
            type="strength"
            title="Điểm mạnh"
            items={activeAnalysis.strengths}
            onDetail={() => setDetailType('strength')}
          />
          <AiInsightCard
            type="improvement"
            title="Cần cải thiện"
            items={activeAnalysis.improvements}
            onDetail={() => setDetailType('improvement')}
          />

          <TextButton className="self-start text-primary" onClick={onOpenHistory}>
            Xem lại phân tích cũ
          </TextButton>
        </div>
      ) : null}

      <AiInsightDetailModal
        insight={selectedInsight}
        analysis={activeAnalysis}
        isOpen={Boolean(selectedInsight)}
        onClose={() => setDetailType(null)}
      />
    </div>
  )
}

function AiAnalysisHistoryModal({ isOpen, onClose }) {
  const learningProfilePage = useLearningProfileData()
  const [expandedId, setExpandedId] = useState(learningProfilePage.aiAnalysisHistory[0]?.id)

  return (
    <ScrollableModal title="Lịch sử phân tích AI" isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col gap-3">
        {learningProfilePage.aiAnalysisHistory.map((item) => {
          const expanded = expandedId === item.id
          return (
            <article
              key={item.id}
              className="rounded-2xl border border-line-shell bg-[var(--color-surface-sky)] p-3.5"
            >
              <div className="mb-2 flex items-center justify-between gap-3 max-[760px]:flex-col max-[760px]:items-start max-[760px]:gap-1">
                <strong className={historyStrong}>{item.createdAt}</strong>
                <span className={historySpan}>{item.basedOn}</span>
              </div>
              <p className="mb-2.5 text-[12px] leading-[1.55] font-[750] text-text-heading-muted">
                {item.summary}
              </p>
              {expanded && <AnalysisResult analysis={item} />}
              <TextButton
                className="mt-2.5 text-primary"
                onClick={() => setExpandedId(expanded ? '' : item.id)}
              >
                {expanded ? 'Thu gọn' : 'Xem chi tiết'}
              </TextButton>
            </article>
          )
        })}
      </div>
    </ScrollableModal>
  )
}

function AchievementHistoryModal({ isOpen, onClose }) {
  const learningProfilePage = useLearningProfileData()
  return (
    <ScrollableModal title="Tất cả thành tựu" isOpen={isOpen} onClose={onClose} maxWidth={640}>
      <div className="flex flex-col gap-3">
        {learningProfilePage.achievements.map((item) => (
          <article
            key={item.id}
            className="grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-line-shell bg-[var(--color-surface-sky)] p-3.5 max-[760px]:grid-cols-[42px_minmax(0,1fr)] max-[760px]:items-start"
          >
            <IconTile tone={achievementTone[item.tone] ?? item.tone} size="xl">
              <Award size={17} />
            </IconTile>
            <div>
              <strong className="block text-[13px] leading-[1.35] font-black text-text-heading">
                {item.title}
              </strong>
              <p className="mt-1 text-[12px] leading-[1.45] font-[750] text-text-secondary">
                {item.description}
              </p>
            </div>
            <time className="text-[12px] font-black text-text-faint max-[760px]:col-start-2">
              {item.date}
            </time>
          </article>
        ))}
      </div>
    </ScrollableModal>
  )
}

function OverviewTab({
  analysis,
  isAnalyzing,
  onAnalyze,
  panelId,
  labelledBy,
}: {
  analysis: unknown
  isAnalyzing: boolean
  onAnalyze: () => void
  panelId: string
  labelledBy: string
  // Accepted for parity with the other tabs' onAction prop - unused here
  // today since this tab's only action button (AchievementCard) has its
  // own local handler instead.
  onAction?: (text?: string) => void
}) {
  const learningProfilePage = useLearningProfileData()
  const profile = learningProfilePage
  const [aiHistoryOpen, setAiHistoryOpen] = useState(false)
  const [achievementHistoryOpen, setAchievementHistoryOpen] = useState(false)
  const average = Math.round(
    profile.scoreAttempts.reduce((sum, item) => sum + item.score, 0) / profile.scoreAttempts.length
  )
  const best = Math.max(...profile.scoreAttempts.map((item) => item.score))

  return (
    <div
      className="flex flex-col gap-[18px]"
      role="tabpanel"
      id={panelId}
      aria-labelledby={labelledBy}
    >
      <UnifiedCompetencySection />

      <section className="grid grid-cols-[minmax(0,1.85fr)_minmax(300px,1fr)] items-start gap-[18px] max-[1181px]:grid-cols-1">
        <div className="flex min-w-0 flex-col gap-3.5">
          <ScoreChart
            title="Xu hướng điểm ĐGNL"
            subtitle="Kết quả các bài thi thử gần đây"
            points={profile.scoreAttempts}
          />

          <div className="grid grid-cols-3 gap-3.5 max-[760px]:grid-cols-1">
            <MetricCard icon={LineChart} label="Điểm gần nhất" value={profile.latestScore} />
            <MetricCard icon={Trophy} label="Điểm cao nhất" value={best} />
            <MetricCard icon={BarChart3} label="Trung bình" value={average} />
          </div>

          <ActivityHeatmap data={profile.activityFrequency} />
        </div>

        <div className="flex min-w-0 flex-col gap-3.5 self-stretch">
          <AiLearningAssistant
            analysis={analysis}
            isAnalyzing={isAnalyzing}
            onAnalyze={onAnalyze}
            onOpenHistory={() => setAiHistoryOpen(true)}
          />
          <AchievementCard onAction={() => setAchievementHistoryOpen(true)} />
        </div>
      </section>

      <AiAnalysisHistoryModal isOpen={aiHistoryOpen} onClose={() => setAiHistoryOpen(false)} />
      <AchievementHistoryModal
        isOpen={achievementHistoryOpen}
        onClose={() => setAchievementHistoryOpen(false)}
      />
    </div>
  )
}

export default OverviewTab
