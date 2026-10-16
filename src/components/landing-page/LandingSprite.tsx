// Inline SVG sprite used by <Icon /> and the subject artwork on the catalog cards.
// Icon paths are Lucide (ISC License, https://lucide.dev); see public/landing-v2/assets/icons/LICENSE.
function LandingSprite() {
  return (
    <svg className="symbol-library" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <symbol id="lp-ui-arrow-right" viewBox="0 0 24 24">
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </symbol>
        <symbol id="lp-ui-arrow-up-right" viewBox="0 0 24 24">
          <path d="M7 7h10v10" />
          <path d="M7 17 17 7" />
        </symbol>
        <symbol id="lp-ui-book-open" viewBox="0 0 24 24">
          <path d="M12 5v16" />
          <path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z" />
        </symbol>
        <symbol id="lp-ui-check" viewBox="0 0 24 24">
          <path d="M20 6 9 17l-5-5" />
        </symbol>
        <symbol id="lp-ui-menu" viewBox="0 0 24 24">
          <path d="M4 5h16" />
          <path d="M4 12h16" />
          <path d="M4 19h16" />
        </symbol>
        <symbol id="lp-ui-rotate-ccw" viewBox="0 0 24 24">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </symbol>
        <symbol id="lp-ui-x" viewBox="0 0 24 24">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </symbol>
        <symbol id="lp-ui-languages" viewBox="0 0 24 24">
          <path d="m5 8 6 6" />
          <path d="m4 14 6-6 2-3" />
          <path d="M2 5h12" />
          <path d="M7 2h1" />
          <path d="m22 22-5-10-5 10" />
          <path d="M14 18h6" />
        </symbol>
        <symbol id="lp-ui-calculator" viewBox="0 0 24 24">
          <rect width="16" height="20" x="4" y="2" rx="2" />
          <line x1="8" x2="16" y1="6" y2="6" />
          <line x1="16" x2="16" y1="14" y2="18" />
          <path d="M16 10h.01" />
          <path d="M12 10h.01" />
          <path d="M8 10h.01" />
          <path d="M12 14h.01" />
          <path d="M8 14h.01" />
          <path d="M12 18h.01" />
          <path d="M8 18h.01" />
        </symbol>
        <symbol id="lp-ui-chart-column-increasing" viewBox="0 0 24 24">
          <path d="M13 17V9" />
          <path d="M18 17V5" />
          <path d="M3 3v16a2 2 0 0 0 2 2h16" />
          <path d="M8 17v-3" />
        </symbol>
        <symbol id="lp-ui-flask-conical" viewBox="0 0 24 24">
          <path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2" />
          <path d="M6.453 15h11.094" />
          <path d="M8.5 2h7" />
        </symbol>
        <symbol id="lp-ui-scroll-text" viewBox="0 0 24 24">
          <path d="M15 12h-5" />
          <path d="M15 8h-5" />
          <path d="M19 17V5a2 2 0 0 0-2-2H4" />
          <path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" />
        </symbol>
        <symbol id="lp-ui-pen-line" viewBox="0 0 24 24">
          <path d="M13 21h8" />
          <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
        </symbol>
        <symbol id="lp-ui-message-square-quote" viewBox="0 0 24 24">
          <path d="M14 14a2 2 0 0 0 2-2V8h-2" />
          <path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" />
          <path d="M8 14a2 2 0 0 0 2-2V8H8" />
        </symbol>
        <symbol id="lp-ui-split" viewBox="0 0 24 24">
          <path d="M16 3h5v5" />
          <path d="M8 3H3v5" />
          <path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" />
          <path d="m15 9 6-6" />
        </symbol>
        <symbol id="lp-ui-puzzle" viewBox="0 0 24 24">
          <path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z" />
        </symbol>
        <symbol id="lp-ui-lightbulb" viewBox="0 0 24 24">
          <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
          <path d="M9 18h6" />
          <path d="M10 22h4" />
        </symbol>
        <symbol id="lp-ui-trending-up" viewBox="0 0 24 24">
          <path d="M16 7h6v6" />
          <path d="m22 7-8.5 8.5-5-5L2 17" />
        </symbol>
        <symbol id="lp-mai-english" viewBox="0 0 240 240">
          <image
            href="/landing-v2/assets/mai-english-v1.png"
            width="240"
            height="240"
            preserveAspectRatio="xMidYMid meet"
          />
        </symbol>
        <symbol id="lp-nam-analysis" viewBox="0 0 240 240">
          <image
            href="/landing-v2/assets/nam-analysis-v1.png"
            width="240"
            height="240"
            preserveAspectRatio="xMidYMid meet"
          />
        </symbol>
        <symbol id="lp-bot" viewBox="0 0 240 240">
          <image
            href="/landing-v2/assets/robot-science-v2.png"
            width="240"
            height="240"
            preserveAspectRatio="xMidYMid meet"
          />
        </symbol>
        <symbol id="lp-star" viewBox="0 0 240 240">
          <image
            href="/landing-v2/assets/star-reading-v2.png"
            width="240"
            height="240"
            preserveAspectRatio="xMidYMid meet"
          />
        </symbol>
      </defs>
    </svg>
  )
}

export default LandingSprite
