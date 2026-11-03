import type { CSSProperties } from 'react'
import { examPhotos, examUniversities, type ExamIntro, type ExamPhoto } from '../../data/landing-content'
import CutoutStage from './CutoutStage'
import Icon from './Icon'

// White on the section's blue, without an outline: a faint shadow is enough to lift it.
const card = 'rounded-3xl bg-white shadow-[0_10px_30px_-22px_rgba(11,35,72,0.35)]'
const subheading = 'text-[1.25rem] font-semibold leading-[1.4] tracking-[-0.02em] text-(--ink)'
const number = new Intl.NumberFormat('vi-VN')

const EXAM_CUTOUT = {
  src: '/landing-v2/assets/cutouts/exam-student-v2.webp',
  small: '/landing-v2/assets/cutouts/exam-student-v2-800.webp',
  width: 1356,
  height: 1024,
  alt: 'Nữ sinh cầm đề thi, tô đáp án trên phiếu trả lời trắc nghiệm',
}

// The official list of schools that admit with the ĐGNL result, kept by the ĐHQG-HCM testing centre (CETQA).
const SCHOOLS_LIST_URL = 'https://cetqa.vnuhcm.edu.vn/danh-gia-nang-luc/c-12/cac-don-vi-su-dung-ket-qua-cid-8'

const MASKS = {
  // the photo's left edge melts into the panel beside the text
  left: 'linear-gradient(to right, transparent 0%, #000 22%)',
  bottom: 'linear-gradient(to top, transparent 0%, #000 30%)',
  all: 'radial-gradient(ellipse 72% 70% at 50% 46%, #000 55%, transparent 100%)',
} as const

/** A photo whose edges dissolve into the section background instead of ending in a hard frame. */
function BlendedPhoto({
  photo,
  fade,
  className = '',
  sizes,
}: {
  photo: ExamPhoto
  /** Which edges fade into the background. */
  fade: keyof typeof MASKS
  className?: string
  sizes: string
}) {
  const style: CSSProperties = { maskImage: MASKS[fade], WebkitMaskImage: MASKS[fade] }
  return (
    <div className={`overflow-hidden ${className}`}>
      <img
        src={photo.src}
        srcSet={`${photo.small} 800w, ${photo.src} 1365w`}
        sizes={sizes}
        alt={photo.alt}
        loading="lazy"
        className="absolute inset-0 size-full object-cover"
        style={style}
      />
      {/* A wash of the section's blue ties the photo's whites to the background. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-(--blue-soft) opacity-40 mix-blend-multiply"
        style={style}
      />
    </div>
  )
}

/** The figures of the paper, as white cards on the panel. */
function Facts({ exam }: { exam: ExamIntro }) {
  return (
    <dl className="exam-key-facts grid grid-cols-2 gap-3 sm:grid-cols-3">
      {exam.facts.map((fact) => (
        <div
          key={fact.label}
          className="flex flex-col-reverse justify-end gap-1.5 rounded-2xl bg-white px-4 py-4 shadow-[0_12px_30px_-18px_rgba(11,35,72,0.45)] sm:px-5"
        >
          <dt className="text-[0.8125rem] leading-snug text-(--muted)">{fact.label}</dt>
          <dd className="text-[1.5rem] leading-none font-bold tracking-[-0.03em] text-(--ink) tabular-nums sm:text-[1.75rem]">
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** The three parts of the paper as plain rows, then their total. */
function Parts({ exam }: { exam: ExamIntro }) {
  const questions = exam.parts.reduce((sum, part) => sum + part.questions, 0)
  const score = exam.parts.reduce((sum, part) => sum + part.maxScore, 0)
  return (
    <div className="flex flex-col gap-4">
      <h3 className={subheading}>Cấu trúc đề thi ĐGNL</h3>
      <table className={`${card} w-full overflow-hidden text-left text-[0.9375rem]`}>
        <thead className="text-[0.8125rem] text-(--muted)">
          <tr>
            <th scope="col" className="px-5 py-3 font-semibold">
              Phần thi
            </th>
            <th scope="col" className="px-3 py-3 text-right font-semibold whitespace-nowrap">
              Số câu
            </th>
            <th scope="col" className="px-5 py-3 text-right font-semibold whitespace-nowrap">
              Điểm
            </th>
          </tr>
        </thead>
        <tbody>
          {exam.parts.map((part) => (
            <tr key={part.id} className="border-t border-(--soft)">
              <th scope="row" className="px-5 py-4 font-semibold text-(--ink)">
                {part.title}
                {part.detail && (
                  <small className="mt-1 block text-[0.8125rem] leading-relaxed font-normal text-(--muted)">
                    {part.detail}
                  </small>
                )}
              </th>
              <td className="px-3 py-4 text-right align-top text-(--ink) tabular-nums">{part.questions}</td>
              <td className="px-5 py-4 text-right align-top text-(--ink) tabular-nums">{number.format(part.maxScore)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-(--soft) font-semibold text-(--ink)">
            <th scope="row" className="px-5 py-3">
              Tổng
            </th>
            <td className="px-3 py-3 text-right tabular-nums">{questions}</td>
            <td className="px-5 py-3 text-right tabular-nums">{number.format(score)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="text-[0.8125rem] text-(--muted)">{exam.scoringNote}</p>
    </div>
  )
}

/** The steps of one round as a pipeline: numbered stops on one line, across at desktop width, down on a phone. */
function Pipeline({ exam }: { exam: ExamIntro }) {
  const last = exam.season.length - 1
  return (
    <div className="flex flex-col gap-6">
      <h3 className={subheading}>{exam.seasonTitle}</h3>
      <ol className="grid gap-0 lg:grid-cols-4 lg:gap-6">
        {exam.season.map((step, index) => (
          <li key={step.title} className="relative flex gap-4 pb-7 last:pb-0 lg:flex-col lg:gap-4 lg:pb-0">
            {/* The line runs from this stop to the next: down on a phone, across at desktop width. */}
            {index < last && (
              <span
                aria-hidden="true"
                className="absolute top-10 bottom-0 left-5 w-0.5 -translate-x-1/2 bg-(--line) lg:top-5 lg:right-[-1.5rem] lg:bottom-auto lg:left-10 lg:h-0.5 lg:w-auto lg:translate-x-0"
              />
            )}
            <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-white text-[0.9375rem] font-bold text-(--ink) tabular-nums shadow-[0_6px_16px_-8px_rgba(11,35,72,0.35)] ring-4 ring-(--soft)">
              {index + 1}
            </span>
            <div className="flex min-w-0 flex-col gap-1.5 pt-1.5 lg:pt-0">
              <strong className="text-[1.0625rem] font-semibold text-(--ink)">{step.title}</strong>
              <p className="text-[0.9375rem] leading-relaxed">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** The member universities of ĐHQG-HCM in an even grid of logos. */
function Universities() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h3 className={subheading}>Trường xét tuyển bằng điểm ĐGNL</h3>
        <p className="text-[0.9375rem] text-(--muted)">
          Các trường thành viên ĐHQG-HCM, cùng hơn 100 trường đại học, cao đẳng khác.
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {examUniversities.map((school) => (
          <li key={school.short} className={`${card} flex flex-col items-center gap-3 px-3 py-5 text-center`}>
            {school.logo ? (
              <img src={school.logo} alt="" loading="lazy" className="h-16 w-auto max-w-[8rem] object-contain" />
            ) : (
              <span
                aria-hidden="true"
                className="grid size-12 place-items-center rounded-full text-[0.75rem] font-bold tracking-wide text-white"
                style={{ background: school.tone }}
              >
                {school.short}
              </span>
            )}
            <span className="text-[0.875rem] leading-snug font-medium text-(--ink)">{school.name}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* The CC BY and CC BY-SA licences of some files ask for this credit (see universities/SOURCES.md). */}
        <p className="text-[0.75rem] text-(--muted)">
          Logo các trường: Wikimedia Commons (CC BY-SA 4.0, CC BY 4.0, CC0, phạm vi công cộng).
        </p>
        <a className="text-link w-fit" href={SCHOOLS_LIST_URL} target="_blank" rel="noopener noreferrer">
          Xem danh sách đầy đủ <Icon name="arrow-up-right" />
          <span className="sr-only"> các trường xét tuyển bằng điểm ĐGNL, trên trang ĐHQG-HCM (mở trong thẻ mới)</span>
        </a>
      </div>
    </div>
  )
}

// One wide panel holds the explanation and the figures, with a photo of the exam on its right; under it the paper,
// a photo of an exam hall, the steps of a round, and the schools that admit with the result.
export default function ExamIntroSection({ exam }: { exam: ExamIntro }) {
  // The summary's second half explains the exam; its first half (what "ĐGNL" means) is said here in short.
  const explanation = exam.summary.split(': ')[1] ?? ''
  return (
    <section className="section exam-intro bg-(--soft)" id="ky-thi" aria-labelledby="exam-intro-title">
      <div className="container flex flex-col gap-12 lg:gap-16">
        <div className="relative overflow-hidden rounded-[2rem] bg-(--blue-soft)">
          {/* The student taking the paper stands in the panel's right side, on its colour. */}
          <CutoutStage
            {...EXAM_CUTOUT}
            sizes="(max-width: 1023px) 100vw, 45vw"
            lean="right"
            className="absolute right-2 bottom-0 hidden w-[47%] lg:block"
          />
          <div className="relative flex flex-col gap-8 p-6 sm:p-10 lg:w-[58%] lg:p-14">
            <div className="flex flex-col gap-4">
              <span className="eyebrow">{exam.eyebrow}</span>
              <h2 id="exam-intro-title">
                Hiểu rõ kỳ thi.
                <br />
                Vững vàng bước đi.
              </h2>
              <p className="max-w-2xl text-base leading-relaxed text-(--muted)">
                Kỳ thi <strong className="font-semibold text-(--ink)">Đánh giá năng lực (ĐGNL)</strong> của
                ĐHQG-HCM, hay còn gọi là <strong className="font-semibold text-(--ink)">V-ACT</strong>: {explanation}
              </p>
            </div>
            <Facts exam={exam} />
            <a className="text-link w-fit" href={exam.source.href} target="_blank" rel="noopener noreferrer">
              Thông tin từ ĐHQG-HCM <Icon name="arrow-up-right" />
              <span className="sr-only"> (mở trong thẻ mới)</span>
            </a>
          </div>
          <CutoutStage {...EXAM_CUTOUT} sizes="100vw" lean="right" className="relative mx-6 sm:mx-10 lg:hidden" />
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <Parts exam={exam} />
          <BlendedPhoto
            photo={examPhotos.hall}
            fade="all"
            sizes="(max-width: 1023px) 100vw, 560px"
            className="relative aspect-[4/3]"
          />
        </div>

        <Pipeline exam={exam} />
        <Universities />

        <p className="exam-source text-[0.8125rem]">
          Theo thông tin kỳ thi năm 2026 của ĐHQG-HCM, cập nhật {exam.source.updatedAt}. Xem lịch thi và lệ phí tại
          nguồn chính thức.
        </p>
      </div>
    </section>
  )
}
