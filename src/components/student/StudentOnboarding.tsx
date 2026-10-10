import { useState } from 'react'
import { ArrowLeft, Check, GraduationCap, Target, TrendingUp } from '../console/icons'
import Logo from '../common/Logo'
import Button from '../ui/Button'
import Card from '../ui/Card'
import {
  FieldError,
  FieldLabel,
  OnboardingField,
  SearchSelect,
  SubjectChoice,
} from './onboarding/OnboardingFields'
import OnboardingRail from './onboarding/OnboardingRail'
import ScoreLimitDialog from './onboarding/ScoreLimitDialog'

const universities = [
  'Trường Đại học Bách khoa (VNUHCM-UT)',
  'Trường Đại học Khoa học Tự nhiên (VNUHCM-US)',
  'Trường Đại học Khoa học Xã hội và Nhân văn (VNUHCM-USSH)',
  'Trường Đại học Quốc tế (VNUHCM-IU)',
  'Trường Đại học Công nghệ Thông tin (VNUHCM-UIT)',
  'Trường Đại học Kinh tế - Luật (VNUHCM-UEL)',
  'Trường Đại học Khoa học Sức khỏe (VNUHCM-UHS)',
  'Trường Đại học An Giang (VNUHCM-AGU)',
]
const majors = [
  'Công nghệ thông tin',
  'Kinh doanh quốc tế',
  'Kinh tế',
  'Kỹ thuật điện - điện tử',
  'Ngôn ngữ Anh',
  'Truyền thông đa phương tiện',
  'Khác',
]

const highlights = ['3 phút hoàn thành', 'Cá nhân hóa ngay từ đầu', 'Có thể cập nhật sau']

const textInput =
  'border-line-blue bg-white/95 text-[13px] text-text-heading outline-0 focus:border-primary focus:shadow-[0_0_0_4px_rgba(28, 176, 246,0.1)]'

function StudentOnboarding({ onBack }) {
  const [form, setForm] = useState({
    university: '',
    major: '',
    score: 600,
    weakest: [],
    strongest: [],
  })
  const [otherMajor, setOtherMajor] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [scoreLimitOpen, setScoreLimitOpen] = useState(false)

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }
  const handleScoreChange = (rawValue) => {
    if (rawValue === '') {
      update('score', 0)
      return
    }

    const nextScore = Number(rawValue)
    if (Number.isNaN(nextScore)) return

    if (nextScore > 1200) {
      setScoreLimitOpen(true)
      update('score', 1200)
      return
    }

    update('score', Math.max(0, nextScore))
  }
  const validate = () => {
    const next: Record<string, string> = {}
    if (!form.university) next.university = 'Bạn hãy chọn trường đại học mục tiêu.'
    if (!form.major) next.major = 'Bạn hãy chọn ngành học mục tiêu.'
    if (!form.weakest.length) next.weakest = 'Hãy chọn ít nhất một môn bạn muốn cải thiện.'
    if (!form.strongest.length) next.strongest = 'Hãy chọn ít nhất một môn bạn tự tin nhất.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_7%_8%,rgba(28, 176, 246,0.16)_0,transparent_24%),radial-gradient(circle_at_92%_12%,rgba(251,195,79,0.18)_0,transparent_18%),radial-gradient(circle_at_85%_90%,rgba(28, 176, 246,0.08)_0,transparent_26%),linear-gradient(180deg,var(--color-surface-sky)_0%,var(--color-surface-brand)_100%)] px-6 pt-6 pb-[58px] text-text-heading before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.55)_1px,transparent_1px)] before:bg-[length:84px_84px] before:opacity-[0.22] before:content-[''] before:[mask-image:linear-gradient(180deg,rgba(0,0,0,0.9),transparent_88%)] max-[701px]:px-3.5 max-[701px]:pt-4 max-[701px]:pb-7">
      <header className="relative z-1 mx-auto mb-6 flex w-[min(1180px,100%)] items-center justify-between max-[701px]:mb-[18px]">
        <Button
          appearance="outline"
          className="size-[42px] rounded-full border-[rgba(223,230,247,0.9)] bg-white/90 p-0 shadow-[0_10px_24px_rgba(28, 176, 246,0.08)] backdrop-blur-[10px] hover:bg-white/90 [&>svg]:size-[18px]"
          onClick={onBack}
          aria-label="Quay lại"
        >
          <ArrowLeft size={18} />
        </Button>
        <span className="absolute left-1/2 flex -translate-x-1/2 items-center">
          <Logo />
        </span>
        <span className="w-[42px]" />
      </header>
      <Card
        as="section"
        padding="none"
        className="relative z-1 mx-auto w-[min(1180px,100%)] rounded-[32px] border-[rgba(213,223,246,0.95)] bg-white/82 p-7 shadow-[0_34px_80px_rgba(28, 176, 246,0.12)] backdrop-blur-[14px] before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[linear-gradient(135deg,rgba(28, 176, 246,0.16),rgba(251,195,79,0.26),rgba(28, 176, 246,0.08))] before:p-px before:content-[''] before:[mask-image:linear-gradient(var(--color-surface)_0_0),linear-gradient(var(--color-surface)_0_0)] before:[mask-origin:content-box,padding-box] before:[mask-clip:content-box,border-box] before:[mask-composite:exclude] max-[701px]:rounded-[22px] max-[701px]:p-[18px]"
      >
        <div className="relative z-1 grid grid-cols-[minmax(0,1.4fr)_minmax(290px,0.78fr)] gap-6 max-[701px]:grid-cols-1 max-[701px]:gap-[18px]">
          <div className="min-w-0">
            <div className="mb-[22px] max-w-[720px] max-[701px]:mb-[18px]">
              <span className="text-[11px] font-black tracking-[1.5px] text-primary">
                BƯỚC 1 / 1 · HỒ SƠ HỌC TẬP
              </span>
              <h1 className="my-2.5 max-w-[12ch] text-[length:clamp(29px,3.2vw,42px)] leading-[1.1] tracking-[-0.9px] max-[701px]:max-w-none max-[701px]:text-[length:clamp(26px,8vw,34px)]">
                Cùng thiết lập mục tiêu học tập của bạn
              </h1>
              <p className="max-w-[60ch] text-[14px] leading-[1.7] text-text-body">
                Cho chúng mình biết một chút về mục tiêu và điểm mạnh, điểm yếu của bạn để cá nhân
                hóa lộ trình học phù hợp hơn.
              </p>
              <div
                className="mt-[18px] flex flex-wrap gap-2.5 max-[701px]:gap-2"
                aria-label="Điểm nổi bật của onboarding"
              >
                {highlights.map((item) => (
                  <span
                    key={item}
                    className="inline-flex min-h-[34px] items-center rounded-full border border-line-blue bg-white/90 px-3 text-[12px] font-bold text-text-heading-muted shadow-[0_10px_20px_rgba(28, 176, 246,0.06)] max-[701px]:min-h-8 max-[701px]:text-[11px]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="mb-6 flex items-center gap-[13px] rounded-[18px] border border-line-brand bg-[linear-gradient(100deg,var(--color-surface-brand),var(--color-surface-sky))] px-[18px] py-4 shadow-[0_10px_22px_rgba(28, 176, 246,0.07)] max-[701px]:items-start">
              <span className="grid size-11 place-items-center rounded-[14px] bg-[linear-gradient(135deg,var(--color-primary),var(--color-primary-dark))] text-surface shadow-[0_12px_22px_rgba(28, 176, 246,0.22)]">
                <GraduationCap size={22} />
              </span>
              <div className="flex flex-1 flex-col gap-1">
                <small className="text-[11px] tracking-[0.8px] text-text-body uppercase">
                  Kỳ thi đang ôn luyện
                </small>
                <strong className="text-[14px] leading-[1.4] text-text-heading">
                  Đánh giá năng lực ĐHQG TP.HCM
                </strong>
              </div>
              <Check size={20} className="text-primary" />
            </div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-6 max-[701px]:grid-cols-1 max-[701px]:gap-[18px]">
              <SearchSelect
                label="Trường đại học mục tiêu"
                placeholder="Tìm hoặc chọn trường đại học"
                options={universities}
                value={form.university}
                onChange={(value) => update('university', value)}
                icon={GraduationCap}
                error={errors.university}
              />
              <div className="min-w-0">
                <SearchSelect
                  label="Ngành học mục tiêu"
                  placeholder="Tìm hoặc chọn ngành học"
                  options={majors}
                  value={otherMajor ? 'Khác' : form.major}
                  onChange={(value) => {
                    setOtherMajor(value === 'Khác')
                    update('major', value === 'Khác' ? '' : value)
                  }}
                  icon={Target}
                  error={otherMajor ? '' : errors.major}
                />
                {otherMajor && (
                  <label className="mt-2.5 flex flex-col gap-[7px] text-[11px] font-bold text-text-body">
                    <span>Tên ngành học của bạn</span>
                    <input
                      className={`h-11 rounded-[11px] border-[1.5px] px-[13px] placeholder:text-text-subtle ${textInput}`}
                      value={form.major}
                      placeholder="Nhập tên ngành học"
                      onChange={(event) => update('major', event.target.value)}
                    />
                    {errors.major && <FieldError>{errors.major}</FieldError>}
                  </label>
                )}
              </div>
              <OnboardingField className="col-span-full self-start rounded-[18px] border border-line-shell bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(247,250,255,0.96))] p-[18px] shadow-[0_14px_30px_rgba(17,24,58,0.05)]">
                <FieldLabel icon={TrendingUp}>Điểm ĐGNL mục tiêu</FieldLabel>
                <div className="mt-px mb-2.5 flex items-baseline gap-[7px]">
                  <strong className="text-[30px] leading-none text-primary">{form.score}</strong>
                  <span className="text-[12px] text-text-subtle">/ 1200 điểm</span>
                </div>
                <input
                  className="w-full cursor-pointer accent-primary"
                  type="range"
                  min="0"
                  max="1200"
                  step="10"
                  value={form.score}
                  onChange={(event) => update('score', Number(event.target.value))}
                />
                <div className="mt-2.5 flex items-center gap-[7px] text-[12px] text-text-subtle">
                  <input
                    className="w-[88px] rounded-[10px] border border-line bg-surface px-[9px] py-[7px] text-text-heading outline-0 focus:border-primary focus:shadow-[0_0_0_4px_rgba(28, 176, 246,0.1)]"
                    type="number"
                    min="0"
                    max="1200"
                    value={form.score}
                    onChange={(event) => handleScoreChange(event.target.value)}
                  />
                  <span>điểm</span>
                </div>
              </OnboardingField>
              <SubjectChoice
                label="Môn học cần cải thiện"
                hint="Chọn tất cả môn bạn muốn ưu tiên cải thiện"
                selected={form.weakest}
                onChange={(value) => update('weakest', value)}
                error={errors.weakest}
              />
              <SubjectChoice
                label="Môn học tự tin nhất"
                hint="Chọn tất cả môn bạn cảm thấy có nền tảng tốt"
                selected={form.strongest}
                onChange={(value) => update('strongest', value)}
                error={errors.strongest}
              />
            </div>
            <div className="mt-7 flex items-center justify-between gap-[18px] border-t border-lock-soft pt-[22px] max-[701px]:flex-col-reverse max-[701px]:items-stretch">
              <span className="flex items-center gap-2 text-[11.5px] text-text-subtle max-[701px]:justify-center">
                <span className="size-2 rounded-full bg-success shadow-[0_0_0_6px_rgba(54,179,126,0.12)]" />
                Thông tin này có thể cập nhật sau
              </span>
              <Button
                className="inline-block h-auto rounded-[10px] border-0 whitespace-normal px-5 py-3.5 text-[14px] font-medium max-[701px]:w-full"
                onClick={() => {
                  if (validate()) alert('Thông tin đã được ghi nhận!')
                }}
              >
                Tiếp tục làm bài đánh giá đầu vào <span className="ml-2.5 text-[18px]">→</span>
              </Button>
            </div>
          </div>
          <OnboardingRail />
        </div>
      </Card>
      <ScoreLimitDialog open={scoreLimitOpen} onClose={() => setScoreLimitOpen(false)} />
    </main>
  )
}

export default StudentOnboarding
