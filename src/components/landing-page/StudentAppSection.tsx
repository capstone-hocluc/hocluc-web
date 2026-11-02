import { studentApp, type AppScreen } from '../../data/landing-content'
import Icon from './Icon'
import { tiltClass, usePointerTilt } from './use-pointer-tilt'

// Side buttons of a phone: [side, top %, height %].
const PHONE_BUTTONS = [
  ['left', 17, 5],
  ['left', 25, 9],
  ['left', 36, 9],
  ['right', 28, 13],
] as const

// A phone drawn in Tailwind around one screen. The screens are 2x renders of the app's own design
// (390 × 844), so the frame only adds the body, the speaker slot and the side buttons.
function Phone({ screen }: { screen: AppScreen }) {
  return (
    <div className="relative rounded-[2.2rem] bg-[#0e1014] px-[7px] pb-[7px] pt-[17px] shadow-[0_50px_80px_-40px_rgba(11,35,72,0.6),0_18px_30px_-18px_rgba(11,35,72,0.4),inset_0_0_0_1px_rgba(255,255,255,0.07)] ring-1 ring-black/40">
      {PHONE_BUTTONS.map(([side, top, height]) => (
        <span
          key={`${side}-${top}`}
          aria-hidden="true"
          className={`absolute w-[3px] bg-[#1b1e24] ${side === 'left' ? '-left-[2.5px] rounded-l-[2px]' : '-right-[2.5px] rounded-r-[2px]'}`}
          style={{ top: `${top}%`, height: `${height}%` }}
        />
      ))}
      <span aria-hidden="true" className="absolute left-1/2 top-[6px] h-[5px] w-[22%] -translate-x-1/2 rounded-full bg-[#23272f]" />
      <div className="relative overflow-hidden rounded-[1.7rem]">
        <img src={screen.src} alt={screen.alt} width={780} height={1688} loading="lazy" decoding="async" className="block h-auto w-full" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.1),transparent_34%)]"
        />
      </div>
    </div>
  )
}

// Introduces the HocLuc student app: learning from the phone, anytime. The app is not released, so
// the section has no download button or link.
export default function StudentAppSection() {
  const { status, title, text, facts, screens } = studentApp
  const [front, back] = screens
  // The pointer is tracked over the whole stage; only the phones read the tilt it writes.
  const stageRef = usePointerTilt<HTMLDivElement>(6)

  return (
    <section
      id="ung-dung"
      aria-labelledby="app-title"
      className="relative isolate overflow-hidden bg-(--soft) py-12 sm:py-14"
    >
      <div className="container">
        <div className="app-preview grid items-center gap-10 md:grid-cols-2 md:gap-12">
          <div className="flex flex-col items-start gap-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-(--ink) ring-1 ring-(--line)">
              <span aria-hidden="true" className="size-2 rounded-full bg-(--blue) motion-safe:animate-pulse" />
              {status}
            </span>
            <h2 id="app-title">{title}</h2>
            <p className="max-w-[44ch] text-lg">{text}</p>
            <ul className="flex flex-col gap-3">
              {facts.map((fact) => (
                <li key={fact} className="flex items-start gap-3 font-semibold text-(--ink)">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-(--blue-soft) text-(--blue-text) [&_.ui-icon]:size-3.5!"
                  >
                    <Icon name="check" />
                  </span>
                  {fact}
                </li>
              ))}
            </ul>
          </div>

          <div ref={stageRef} className="relative isolate mx-auto w-full max-w-[360px]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[460px] max-w-none -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(30,136,255,0.2),transparent_66%)]"
            />
            <div className={tiltClass}>
              <div className="relative">
                <div className="relative z-10 w-[64%] motion-safe:animate-float-slow">
                  <Phone screen={front} />
                </div>
                <div className="absolute right-[3%] top-[9%] w-[54%] rotate-[4deg]">
                  <div className="motion-safe:animate-float-slow motion-safe:[animation-delay:-3s]">
                    <Phone screen={back} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
