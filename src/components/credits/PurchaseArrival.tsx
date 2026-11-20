import { useEffect, useRef } from 'react'
import Card from '../ui/Card'
import { CreditIcon } from './CreditIcon'
import { Check } from '../console/icons'
import confirmedUrl from '../../assets/lottie/payment-confirmed.json?url'
import { CREDIT_UNIT, landArrival, useCredits } from '../../lib/credits'
import { DotLottieReact, prefersReducedMotion } from '../../lib/lottie'
import { cn } from '../../lib/cn'

/** When the "+N" leaves the card: after the check has been drawn. */
const FLY_AT_MS = 1400
const FLY_MS = 700
/** Without motion the card simply stays up a moment, then the balance changes. */
const STILL_MS = 1600

/**
 * The wallet's welcome for a pack just paid for: a card with a check drawn in, then the "+N" flies up to the
 * balance in the top bar, which counts it in.
 */
export default function PurchaseArrival() {
  const { arrival } = useCredits()
  const chipRef = useRef<HTMLSpanElement>(null)
  const orderId = arrival && !arrival.landed ? arrival.orderId : null

  useEffect(() => {
    if (!orderId) return
    const still = prefersReducedMotion()
    const chip = chipRef.current
    let flyer: HTMLElement | null = null
    let flight: Animation | null = null
    const timer = window.setTimeout(
      () => {
        const pill = document.querySelector<HTMLElement>('[data-credit-pill]')
        const target = pill?.getBoundingClientRect()
        if (still || !chip || !target?.width) {
          landArrival(orderId)
          return
        }
        const from = chip.getBoundingClientRect()
        const dx = target.left + target.width / 2 - (from.left + from.width / 2)
        const dy = target.top + target.height / 2 - (from.top + from.height / 2)
        // A copy of the chip flies on top of everything, the sticky top bar included.
        flyer = chip.cloneNode(true) as HTMLElement
        Object.assign(flyer.style, {
          position: 'fixed',
          left: `${from.left}px`,
          top: `${from.top}px`,
          margin: '0',
          zIndex: '70',
          pointerEvents: 'none',
        })
        document.body.appendChild(flyer)
        chip.style.visibility = 'hidden'
        flight = flyer.animate(
          [
            { transform: 'translate(0, 0) scale(1)' },
            { transform: `translate(${dx * 0.4}px, ${dy * 0.4 - 70}px) scale(0.95)`, offset: 0.45 },
            { transform: `translate(${dx}px, ${dy}px) scale(0.5)`, opacity: 0.85 },
          ],
          { duration: FLY_MS, easing: 'cubic-bezier(0.45, 0, 0.25, 1)' }
        )
        flight.finished.then(
          () => {
            flyer?.remove()
            landArrival(orderId)
          },
          () => undefined
        )
      },
      still ? STILL_MS : FLY_AT_MS
    )
    return () => {
      window.clearTimeout(timer)
      flight?.cancel()
      flyer?.remove()
      if (chip) chip.style.visibility = ''
    }
  }, [orderId])

  if (!arrival) return null
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-6 z-[60] flex justify-center" role="status">
      <Card
        variant="panel"
        radius="lg"
        padding="lg"
        className={cn(
          'credit-arrival pointer-events-auto flex w-full max-w-sm flex-col items-center gap-2 text-center',
          arrival.landed && 'is-leaving'
        )}
      >
        {prefersReducedMotion() ? (
          <span className="grid size-24 place-items-center" aria-hidden="true">
            <span className="grid size-16 place-items-center rounded-full bg-success text-white">
              <Check size={32} />
            </span>
          </span>
        ) : (
          <DotLottieReact src={confirmedUrl} autoplay className="size-24" aria-hidden="true" />
        )}
        <p className="text-lg font-bold text-text-heading">Thanh toán thành công</p>
        <span ref={chipRef} className="credit-chip">
          <CreditIcon size={18} />+{arrival.amount.toLocaleString('vi-VN')} {CREDIT_UNIT}
        </span>
      </Card>
    </div>
  )
}
