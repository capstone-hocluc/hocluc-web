import { useState } from 'react'
import type { FormEvent } from 'react'
import { startDialogOptions, type CourseModule, type Domain } from '../../data/landing-content'
import Icon from './Icon'
import LandingDialog from './LandingDialog'

interface StartDialogProps {
  open: boolean
  domains: Domain[]
  onClose: () => void
  onViewDomain: (domainId: string) => void
}

type Level = (typeof startDialogOptions.levels)[number]['value']

function pickModule(domain: Domain, level: Level): CourseModule {
  if (level === 'practice') return domain.modules[domain.modules.length - 1]
  if (level === 'skill') {
    return domain.modules.find((module) => module.level.startsWith('Kỹ năng')) ?? domain.modules[0]
  }
  return domain.modules[0]
}

function StartDialog({ open, domains, onClose, onViewDomain }: StartDialogProps) {
  const [domainId, setDomainId] = useState<string>(startDialogOptions.defaultDomain)
  const [level, setLevel] = useState<Level>(startDialogOptions.levels[0].value)
  const [recommended, setRecommended] = useState<{ domain: Domain; module: CourseModule } | null>(
    null
  )

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const domain = domains.find((item) => item.id === domainId)
    if (!domain) return
    setRecommended({ domain, module: pickModule(domain, level) })
  }

  return (
    <LandingDialog
      id="start-dialog"
      titleId="start-title"
      open={open}
      onClose={onClose}
      title="Chào bạn, mình bắt đầu nhé!"
      subtitle="Chọn một mục tiêu nhỏ để khám phá cách học phù hợp."
      closeLabel="Đóng chọn lộ trình"
    >
      <div className="dialog-body">
        <form className="start-form" id="start-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="start-domain">Bạn muốn bắt đầu với nhóm nào?</label>
            <select
              id="start-domain"
              name="domain"
              value={domainId}
              onChange={(event) => {
                setDomainId(event.target.value)
                setRecommended(null)
              }}
            >
              {startDialogOptions.domains.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="start-level">Mục tiêu hiện tại của bạn là gì?</label>
            <select
              id="start-level"
              name="level"
              value={level}
              onChange={(event) => {
                setLevel(event.target.value as Level)
                setRecommended(null)
              }}
            >
              {startDialogOptions.levels.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary">
            Xem gợi ý học tập
            <Icon name="arrow-right" />
          </button>
        </form>
        <div
          id="recommendation"
          className="recommendation"
          hidden={!recommended}
          aria-live="polite"
        >
          {recommended && (
            <>
              <h3>Gợi ý học tập: {recommended.module.title}</h3>
              <p>{recommended.module.summary}</p>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                id="view-recommended"
                onClick={() => onViewDomain(recommended.domain.id)}
              >
                Xem học phần của nhóm <Icon name="arrow-right" />
              </button>
            </>
          )}
        </div>
        <p className="demo-label">
          Gợi ý tham khảo. Đánh giá đầu vào sẽ giúp xác định lộ trình phù hợp hơn.
        </p>
      </div>
    </LandingDialog>
  )
}

export default StartDialog
