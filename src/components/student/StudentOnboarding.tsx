import { useEffect, useState } from 'react'
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
  'border-line bg-surface text-[15px] font-semibold text-text-heading outline-0 focus:border-primary focus:shadow-[0_0_0_4px_rgba(28,176,246,0.15)]'

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

  // Onboarding renders outside StudentLayout, so it marks <html data-student> itself to get the
  // landing-page token set (student-theme.css), including for the portalled dialog.
  useEffect(() => {
    document.documentElement.dataset.student = ''
    return () => {
      delete document.documentElement.dataset.student
    }
  }, [])

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
    <main className="relative min-h-screen bg-app-bg px-6 pt-6 pb-[58px] text-text-heading max-[701px]:px-3.5 max-[701px]:pt-4 max-[701px]:pb-7">
      <header className="relative z-1 mx-auto mb-6 flex w-[min(1180px,100%)] items-center justify-between max-[701px]:mb-[18px]">
        <Button
          appearance="outline"
          size="icon"
          onClick={onBack}
          aria-label="Quay lại"
        >
          <ArrowLeft size={18} />
        </Button>
        <span className="absolute left-1/2 flex -translate-x-1/2 items-center">
          <Logo />
        </span>
        <span className="w-10" />
      </header>
      <Card
        as="section"
        variant="elevated"
        radius="xl"
        padding="none"
        className="relative z-1 mx-auto w-[min(1180px,100%)] p-7 max-[701px]:p-[18px]"
      >
        <div className="relative z-1 grid grid-cols-[minmax(0,1.4fr)_minmax(290px,0.78fr)] gap-6 max-[701px]:grid-cols-1 max-[701px]:gap-[18px]">
          <div className="min-w-0">
            <div className="mb-[22px] max-w-[720px] max-[701px]:mb-[18px]">
              <span className="text-xs font-black tracking-[0.1em] text-primary-text">
                BƯỚC 1 / 1 · HỒ SƠ HỌC TẬP
              </span>
              <h1 className="my-2.5 max-w-[12ch] text-[length:clamp(29px,3.2vw,42px)] leading-[1.1] font-black tracking-[-0.9px] max-[701px]:max-w-none max-[701px]:text-[length:clamp(26px,8vw,34px)]">
                Cùng thiết lập mục tiêu học tập của bạn
              </h1>
              <p className="max-w-[60ch] text-base leading-[1.7] text-text-body">
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
                    className="inline-flex min-h-9 items-center rounded-full border-[1.5px] border-line-brand bg-surface-brand px-3.5 text-[13px] font-extrabold text-primary-text max-[701px]:min-h-8"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="mb-6 flex items-center gap-[13px] rounded-2xl border-[1.5px] border-line-brand bg-surface-brand px-[18px] py-4 shadow-[0_4px_0_#b9e3f7] max-[701px]:items-start">
              <span className="grid size-11 place-items-center rounded-2xl bg-primary text-white shadow-[0_3px_0_#0797d6]">
                <GraduationCap size={22} />
              </span>
              <div className="flex flex-1 flex-col gap-1">
                <small className="text-xs font-extrabold tracking-[0.08em] text-text-body uppercase">
                  Kỳ thi đang ôn luyện
                </small>
                <strong className="text-base leading-[1.4] font-black text-text-heading">
                  Đánh giá năng lực ĐHQG TP.HCM
                </strong>
              </div>
              <Check size={20} className="text-primary-text" />
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
                  <label className="mt-2.5 flex flex-col gap-[7px] text-sm font-extrabold text-text-heading">
                    <span>Tên ngành học của bạn</span>
                    <input
                      className={`h-12 rounded-xl border-2 px-3.5 placeholder:font-normal placeholder:text-text-subtle ${textInput}`}
                      value={form.major}
                      placeholder="Nhập tên ngành học"
                      onChange={(event) => update('major', event.target.value)}
                    />
                    {errors.major && <FieldError>{errors.major}</FieldError>}
                  </label>
                )}
              </div>
              <OnboardingField className="col-span-full self-start rounded-3xl border-[1.5px] border-line-card bg-surface p-5 shadow-card-soft">
                <FieldLabel icon={TrendingUp}>Điểm ĐGNL mục tiêu</FieldLabel>
                <div className="mt-px mb-2.5 flex items-baseline gap-[7px]">
                  <strong className="text-4xl leading-none font-black text-primary">{form.score}</strong>
                  <span className="text-[13px] font-bold text-text-body">/ 1200 điểm</span>
                </div>
                <input
                  className="w-full cursor-pointer accent-primary [color-scheme:light]"
                  type="range"
                  min="0"
                  max="1200"
                  step="10"
                  value={form.score}
                  onChange={(event) => update('score', Number(event.target.value))}
                />
                <div className="mt-2.5 flex items-center gap-[7px] text-[13px] font-bold text-text-body">
                  <input
                    className="w-24 rounded-xl border-2 border-line bg-surface px-2.5 py-2 text-[15px] font-bold text-text-heading outline-0 focus:border-primary focus:shadow-[0_0_0_4px_rgba(28,176,246,0.15)]"
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
            <div className="mt-7 flex items-center justify-between gap-[18px] border-t-2 border-line pt-[22px] max-[701px]:flex-col-reverse max-[701px]:items-stretch">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-text-body max-[701px]:justify-center">
                <span className="size-2 rounded-full bg-success shadow-[0_0_0_6px_rgba(54,179,126,0.12)]" />
                Thông tin này có thể cập nhật sau
              </span>
              <Button
                size="lg"
                className="h-auto min-h-[50px] whitespace-normal py-3 max-[701px]:w-full"
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
