// Inline SVG sprite used by <Icon /> and the subject artwork on the catalog cards.
// Icon paths are Lucide (ISC License, https://lucide.dev); see public/landing-v2/assets/icons/LICENSE.
// Pages outside the landing only need the icons, so they skip the character artwork.
function LandingSprite({ characters = true }: { characters?: boolean }) {
  return (
    <svg className="symbol-library" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <symbol id="lp-ui-calendar" viewBox="0 0 24 24">
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18" />
        </symbol>
        <symbol id="lp-ui-chevron-down" viewBox="0 0 24 24">
          <path d="m6 9 6 6 6-6" />
        </symbol>
        <symbol id="lp-ui-clock" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </symbol>
        <symbol id="lp-ui-log-out" viewBox="0 0 24 24">
          <path d="m16 17 5-5-5-5" />
          <path d="M21 12H9" />
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        </symbol>
        <symbol id="lp-ui-message-circle" viewBox="0 0 24 24">
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        </symbol>
        <symbol id="lp-ui-package" viewBox="0 0 24 24">
          <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" />
          <path d="M12 22V12" />
          <path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7" />
          <path d="m7.5 4.27 9 5.15" />
        </symbol>
        <symbol id="lp-ui-shopping-cart" viewBox="0 0 24 24">
          <circle cx="8" cy="21" r="1" />
          <circle cx="19" cy="21" r="1" />
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </symbol>
        <symbol id="lp-ui-sparkles" viewBox="0 0 24 24">
          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
          <path d="M20 3v4" />
          <path d="M22 5h-4" />
          <path d="M4 17v2" />
          <path d="M5 18H3" />
        </symbol>
        <symbol id="lp-ui-user-round" viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="5" />
          <path d="M20 21a8 8 0 0 0-16 0" />
        </symbol>
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
        {characters && (
          <>
            <symbol id="lp-mai-english" viewBox="0 0 240 240">
              <image
                href="/landing-v2/assets/mai-english-v1.webp"
                width="240"
                height="240"
                preserveAspectRatio="xMidYMid meet"
              />
            </symbol>
            <symbol id="lp-nam-analysis" viewBox="0 0 240 240">
              <image
                href="/landing-v2/assets/nam-analysis-v1.webp"
                width="240"
                height="240"
                preserveAspectRatio="xMidYMid meet"
              />
            </symbol>
            <symbol id="lp-bot" viewBox="0 0 240 240">
              <image
                href="/landing-v2/assets/robot-science-v2.webp"
                width="240"
                height="240"
                preserveAspectRatio="xMidYMid meet"
              />
            </symbol>
            <symbol id="lp-star" viewBox="0 0 240 240">
              <image
                href="/landing-v2/assets/star-reading-v2.webp"
                width="240"
                height="240"
                preserveAspectRatio="xMidYMid meet"
              />
            </symbol>
          </>
        )}
      </defs>
    </svg>
  )
}

export default LandingSprite
