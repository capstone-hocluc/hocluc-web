import type { CSSProperties } from 'react'
import { studentApp, type AppScreen } from '../../data/landing-content'
import Icon from './Icon'
import { tiltClass, usePointerTilt } from './use-pointer-tilt'

// Keys on the right edge, as on most Android phones: [top %, height %] of the power key and the
// volume rocker below it.
const SIDE_KEYS = [
  [19, 7],
  [29, 14],
] as const

// Graphite metal frame: light catches the top-left and bottom-right corners and a fine line runs
// along the edge. The drop shadows lift the phone off the page.
const frameStyle: CSSProperties = {
  background: 'linear-gradient(145deg, #a9afba 0%, #4b505a 13%, #25282f 40%, #1c1e23 62%, #3f444e 87%, #9da3ae 100%)',
  boxShadow: [
    'inset 0 0 0 0.22cqw rgba(255,255,255,0.14)',
    'inset 0 0.3cqw 0.45cqw rgba(255,255,255,0.2)',
    'inset 0 -0.3cqw 0.45cqw rgba(0,0,0,0.45)',
    '0 2cqw 4cqw -1cqw rgba(11,35,72,0.3)',
    '0 16cqw 24cqw -14cqw rgba(11,35,72,0.5)',
  ].join(', '),
}

const sideKeyStyle: CSSProperties = {
  background: 'linear-gradient(90deg, #2b2e35, #9197a2 55%, #4c515b)',
}

// Front camera: a dark lens with a faint blue glint, sitting in the app's status-bar band.
const cameraStyle: CSSProperties = {
  background: 'radial-gradient(circle at 36% 34%, #52617f 0 9%, #121620 26%, #030405 64%)',
  boxShadow: '0 0 0 0.3cqw rgba(0,0,0,0.5), inset 0 0 0.25cqw rgba(255,255,255,0.12)',
}

// Glass over the screen: a soft diagonal sheen and a dark hairline where the glass meets the bezel.
const glassStyle: CSSProperties = {
  background:
    'linear-gradient(115deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 30%, rgba(255,255,255,0) 46%), linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0) 14%)',
  boxShadow: 'inset 0 0 0 0.2cqw rgba(0,0,0,0.45)',
}

// A modern Android phone drawn in CSS around one screen. The screens are 2x captures (390 × 844) that
// keep the status-bar band empty, so the punch-hole camera sits in it. Every size is in cqw of the
// phone's own width, so the front and back phones keep the same proportions; the radii are
// concentric (screen + bezel + frame).
function Phone({ screen }: { screen: AppScreen }) {
  return (
    <div className="@container">
      <div className="relative">
        {SIDE_KEYS.map(([top, height]) => (
          <span
            key={top}
            aria-hidden="true"
            className="absolute -right-[0.8cqw] w-[1.6cqw] rounded-r-[0.6cqw]"
            style={{ ...sideKeyStyle, top: `${top}%`, height: `${height}%` }}
          />
        ))}
        <div className="relative rounded-[13.8cqw] p-[0.9cqw]" style={frameStyle}>
          <div className="rounded-[12.9cqw] bg-[#050608] p-[2.4cqw] shadow-[inset_0_0_0_0.2cqw_rgba(255,255,255,0.05)]">
            <div className="relative overflow-hidden rounded-[10.5cqw] bg-black">
              <img src={screen.src} alt={screen.alt} width={780} height={1688} loading="lazy" decoding="async" className="block h-auto w-full" />
              <span
                aria-hidden="true"
                className="absolute left-1/2 top-[2cqw] size-[2.7cqw] -translate-x-1/2 rounded-full"
                style={cameraStyle}
              />
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit]" style={glassStyle} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Contact shadow on the page under a phone. It stays still while the phone above it floats.
function GroundShadow() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-[7%] -bottom-[5%] -z-10 h-[7%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(11,35,72,0.3),rgba(11,35,72,0.1)_55%,transparent)]"
    />
  )
}

// Introduces the HocLuc Android app and links to its newest APK.
export default function StudentAppSection() {
  const { title, text, facts, download, screens } = studentApp
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
            <div className="flex flex-col items-start gap-2 pt-1">
              <a className="btn btn-primary" href={download.href}>
                <Icon name="smartphone" />
                {download.label}
              </a>
              <p className="max-w-[44ch] text-sm! text-(--muted)!">{download.note}</p>
            </div>
          </div>

          <div ref={stageRef} className="relative isolate mx-auto w-full max-w-[360px]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[460px] max-w-none -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(30,136,255,0.2),transparent_66%)]"
            />
            <div className={tiltClass}>
              <div className="relative">
                <div className="relative z-10 w-[64%]">
                  <GroundShadow />
                  <div className="motion-safe:animate-float-slow">
                    <Phone screen={front} />
                  </div>
                </div>
                <div className="absolute right-[3%] top-[9%] w-[54%] rotate-[4deg]">
                  <GroundShadow />
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
