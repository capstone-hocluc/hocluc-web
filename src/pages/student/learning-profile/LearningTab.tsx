import { type CSSProperties, useState } from 'react'
import { BookOpen, Brain } from '../../../components/console/icons'
import type { LearningProfileData } from '../../../data/learningProfile'
import { cn } from '../../../lib/cn'
import { ComparisonDropdown } from '../../../components/student/learning-profile/controls'
import {
  IconMetricCard,
  IconTile,
  MetricGrid,
  ProfileCard,
  ProfileHeading,
  ProfileProgress,
  TrendBadge,
} from '../../../components/student/learning-profile/primitives'
import { useLearningProfileData } from './learningProfileContext'
import { componentIcons, learningMetricIcons } from './icons'

function LearningAccuracyCard({ item, comparisonLabel }) {
  const Icon = componentIcons[item.key] || Brain

  return (
    <ProfileCard as="article" className="flex min-h-[156px] flex-col gap-2.5 p-[18px]">
      <div className="flex items-center gap-2.5">
        <IconTile tone={item.accent}>
          <Icon size={17} />
        </IconTile>
        <span className="text-sm leading-[1.25] font-bold text-text-heading">{item.name}</span>
      </div>
      <strong className="text-[32px] leading-none font-bold tracking-[-0.5px] text-primary-text">
        {item.accuracy}%
      </strong>
      <TrendBadge value={item.trend} label={comparisonLabel.toLowerCase()} />
    </ProfileCard>
  )
}

const legendBox = 'size-3 rounded-[4px]'

function LearningTab({ onAction, panelId, labelledBy }) {
  const learningProfilePage = useLearningProfileData()
  const [selectedAccuracyPeriod, setSelectedAccuracyPeriod] = useState(
    learningProfilePage.learningAccuracyPeriods[0]
  )
  const totalCourses = learningProfilePage.courseProgress.length
  const completedCourses = learningProfilePage.courseProgress.filter(
    (course) => course.progress >= 100
  ).length
  const activeCourses = learningProfilePage.courseProgress.filter(
    (course) => course.progress > 0 && course.progress < 100
  ).length
  const untouchedCourses = totalCourses - completedCourses - activeCourses
  const accuracyItems = learningProfilePage.weeklyAccuracy.map((item) => {
    const component = learningProfilePage.components.find((entry) => entry.key === item.key)
    const periodValues = selectedAccuracyPeriod.values[item.key] || item

    return {
      ...item,
      ...periodValues,
      accent: component?.accent || 'blue',
    }
  })

  return (
    <div
      className="flex flex-col gap-[18px]"
      role="tabpanel"
      id={panelId}
      aria-labelledby={labelledBy}
    >
      <section className="grid grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] gap-[18px] max-[1181px]:grid-cols-1">
        <ProfileCard as="article" className="p-5">
          <ProfileHeading title="Tiến độ khóa học" action="Xem tất cả" onAction={onAction} />
          <div className="grid grid-cols-[148px_minmax(150px,0.45fr)_minmax(0,1fr)] items-center gap-5 max-[1181px]:grid-cols-1 max-[760px]:gap-4">
            <div
              className="grid size-[132px] place-items-center content-center rounded-full bg-[radial-gradient(circle_at_center,var(--color-surface)_0_54%,transparent_55%),conic-gradient(var(--color-primary)_var(--hl-profile-progress),var(--color-line)_0)] max-[1181px]:justify-self-start"
              style={
                {
                  '--hl-profile-progress': `${Math.round((activeCourses / totalCourses) * 100)}%`,
                } as CSSProperties
              }
            >
              <strong className="text-[28px] font-bold text-text-heading">{totalCourses}</strong>
              <span className="text-xs font-bold text-text-body">Tổng khóa học</span>
            </div>
            <div className="flex flex-col gap-2.5 text-[13px] font-bold text-text-body">
              {[
                { color: 'bg-[var(--color-line)]', text: `Chưa bắt đầu: ${untouchedCourses}` },
                { color: 'bg-primary', text: `Đang học: ${activeCourses}` },
                { color: 'bg-success', text: `Hoàn thành: ${completedCourses}` },
              ].map((item) => (
                <span key={item.text} className="inline-flex items-center gap-[7px]">
                  <i className={cn(legendBox, item.color)} /> {item.text}
                </span>
              ))}
            </div>
            <div className="flex flex-col gap-[13px]">
              <strong className="text-[15px] font-bold text-text-heading">Khóa học gần đây</strong>
              {learningProfilePage.courseProgress.map((course) => (
                <div key={course.name}>
                  <p className="mb-2 flex items-center justify-between gap-3 text-sm leading-[1.4] font-bold text-text-heading">
                    <span className="min-w-0">{course.name}</span>
                    <b className="text-primary-text">{course.progress}%</b>
                  </p>
                  <ProfileProgress value={course.progress} />
                </div>
              ))}
            </div>
          </div>
        </ProfileCard>

        <MetricGrid>
          {learningProfilePage.learningMetrics.map((metric) => (
            <IconMetricCard
              key={metric.key}
              icon={learningMetricIcons[metric.key] || BookOpen}
              tone={metric.tone}
              label={metric.label}
              value={metric.value}
            />
          ))}
        </MetricGrid>
      </section>

      <section>
        <div className="mb-3.5 flex items-start justify-between gap-4 max-[760px]:flex-col">
          <ProfileHeading
            title="Độ chính xác trung bình"
            subtitle={selectedAccuracyPeriod.comparisonLabel}
            className="mb-0"
          />
          <ComparisonDropdown<LearningProfileData['learningAccuracyPeriods'][number]>
            options={learningProfilePage.learningAccuracyPeriods}
            selected={selectedAccuracyPeriod}
            onChange={setSelectedAccuracyPeriod}
          />
        </div>
        <div className="grid grid-cols-4 gap-3.5 max-[1181px]:grid-cols-2 max-[760px]:grid-cols-1">
          {accuracyItems.map((item) => (
            <LearningAccuracyCard
              key={item.key}
              item={item}
              comparisonLabel={selectedAccuracyPeriod.comparisonLabel}
            />
          ))}
        </div>
      </section>

      <ProfileCard as="article" className="p-5">
        <ProfileHeading
          title="Lịch sử học tập"
          subtitle="Hoạt động trong 30 ngày gần đây"
          className="relative z-1 mb-3 border-b border-[var(--color-line)] bg-surface pb-3"
        />
        <div className="flex max-h-[300px] flex-col gap-3.5 overflow-y-auto pr-2 [scrollbar-color:var(--color-line-brand)_var(--color-surface-sky)] [scrollbar-width:thin] max-[760px]:max-h-[260px] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border [&::-webkit-scrollbar-thumb]:border-[var(--color-surface-sky)] [&::-webkit-scrollbar-thumb]:bg-[var(--color-line-brand)] [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-[var(--color-surface-sky)]">
          {learningProfilePage.learningHistory.map((item) => (
            <div
              key={`${item.date}-${item.title}`}
              className="grid grid-cols-[58px_12px_minmax(0,1fr)] items-start gap-[13px]"
            >
              <time className="text-[13px] font-semibold text-text-body">{item.date}</time>
              <span className="mt-[3px] size-3 rounded-full border-[3px] border-primary bg-surface" />
              <p className="flex flex-col gap-[3px]">
                <strong className="text-[15px] font-bold text-text-heading">{item.title}</strong>
                <small className="text-[13px] font-semibold text-text-body">{item.meta}</small>
              </p>
            </div>
          ))}
        </div>
      </ProfileCard>
    </div>
  )
}

export default LearningTab
