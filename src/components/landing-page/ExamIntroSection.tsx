import type { ExamIntro } from '../../data/landing-content'
import Icon from './Icon'

// Quiet sub-heading shared by the two columns under the figures (the table caption and the season title).
const subheading = 'text-[1.25rem] font-semibold leading-[1.4] tracking-[-0.02em] text-(--ink)'
const cell = 'px-2 py-3 sm:px-3 sm:py-4'

export default function ExamIntroSection({ exam }: { exam: ExamIntro }) {
  return (
    <section className="section exam-intro" id="ky-thi" aria-labelledby="exam-intro-title">
      <div className="container exam-layout flex flex-col gap-10 lg:gap-12">
        <div className="section-heading mb-0!">
          <div>
            <span className="eyebrow">Kỳ thi ĐGNL ĐHQG-HCM</span>
            <h2 id="exam-intro-title">
              Hiểu kỳ thi.
              <br />
              Chuẩn bị vững vàng.
            </h2>
          </div>
          <a
            className="text-link"
            href={exam.source.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            Thông tin từ ĐHQG-HCM <Icon name="arrow-up-right" />
            <span className="sr-only"> (mở trong thẻ mới)</span>
          </a>
        </div>

        {/* The figures of the paper at a glance. Six cells divide evenly into 2, 3 and 6 columns, and the
            1px gaps over the line-coloured backdrop draw the dividers at every breakpoint. */}
        <dl className="exam-key-facts grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-(--line) ring-1 ring-(--line) md:grid-cols-3 xl:grid-cols-6">
          {exam.facts.map((fact) => (
            <div
              key={fact.label}
              className="flex flex-col-reverse justify-end gap-1.5 bg-(--soft) px-3 py-4 min-[400px]:px-4 sm:gap-2 sm:px-6 sm:py-6"
            >
              <dt className="text-[0.8125rem] leading-snug text-(--muted) sm:text-sm">
                {fact.label}
              </dt>
              <dd className="text-[1.25rem] leading-none font-bold tracking-[-0.03em] text-(--ink) tabular-nums min-[400px]:text-[1.5rem] sm:text-[1.75rem]">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16 xl:gap-24">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className={`${subheading} mb-4 text-left`}>Cấu trúc đề thi V-ACT</caption>
                <thead className="bg-(--soft) text-[0.8125rem] text-(--muted)">
                  <tr>
                    <th scope="col" className={`${cell} font-semibold`}>
                      Phần thi
                    </th>
                    <th scope="col" className={`${cell} text-right font-semibold whitespace-nowrap`}>
                      Số câu
                    </th>
                    <th scope="col" className={`${cell} text-right font-semibold whitespace-nowrap`}>
                      Điểm tối đa
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {exam.parts.map((part) => (
                    <tr key={part.id} className="border-b border-(--line)">
                      <th scope="row" className={`${cell} font-semibold text-(--ink)`}>
                        {part.title}
                        {part.detail && (
                          <small className="mt-1 block text-xs leading-relaxed font-normal text-(--muted) sm:text-[0.8125rem]">
                            {part.detail}
                          </small>
                        )}
                      </th>
                      <td className={`${cell} text-right tabular-nums`}>{part.questions}</td>
                      <td className={`${cell} text-right tabular-nums`}>{part.maxScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[0.8125rem]">{exam.scoringNote}</p>
          </div>

          <div className="flex flex-col gap-5">
            <h3>{exam.seasonTitle}</h3>
            <ol className="flex flex-col">
              {exam.season.map((step, index) => (
                <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
                  <span
                    aria-hidden="true"
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-(--blue-soft) text-sm font-semibold text-(--blue-text) tabular-nums"
                  >
                    {index + 1}
                  </span>
                  {index < exam.season.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute top-9 bottom-1 left-4 w-px -translate-x-1/2 bg-(--line)"
                    />
                  )}
                  <div className="flex min-w-0 flex-col gap-1 pt-0.5">
                    <strong className="font-semibold text-(--ink)">{step.title}</strong>
                    <p className="text-[0.9375rem] leading-relaxed">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <p className="exam-source text-[0.8125rem]">
          Theo thông tin kỳ thi năm 2026 của ĐHQG-HCM, cập nhật {exam.source.updatedAt}. Xem lịch thi và
          lệ phí tại nguồn chính thức.
        </p>
      </div>
    </section>
  )
}
