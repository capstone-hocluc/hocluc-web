# Landing page desktop redesign

Date: 2026-10-16. Branch: `codex-refactor-landingpage`.

Follow-up: [Desktop verification and subject-card proposal](landing-page-verification-20261016.md) records the brand-color review and the illustrated-card implementation. The contrast measurements in the original validation section below describe the first redesign.

## Illustrated subject cards and button refinement (16 October)

- Five existing character illustrations now appear on the subject cards, with a shared neutral/blue surface. The original PNGs are preserved; five 384 × 384 WebP derivatives total 100,748 bytes, converted with FFmpeg/libwebp at quality 82.
- Hover after 120 ms or keyboard focus reveals a shared inline preview with a description and three learning topics. Grid overlays reserve the tallest preview's space to avoid layout shifts; inactive previews are hidden and inert.
- The selected preview persists when the pointer moves into it. Clicking a card or its preview action opens the existing subject dialog. Images scale slightly and cards lift on interaction; reduced motion disables transitions.
- Logo remains `#1CB0F6`. Primary buttons now use `#007EB5` with white text (4.51:1); hover uses `#006D9F` (5.69:1). Focus outlines use the darker text blue.
- Validated: application and E2E TypeScript checks, targeted ESLint, production build, and 9/9 landing E2E tests. Added interaction coverage for all five images, hover/focus previews, stable following-section position, keyboard activation, dialog focus return, and reduced motion.
- Desktop widths 1280, 1440, and 1920 remain free of horizontal overflow. Images do not overlap their labels. Mobile refinement remains deferred.
- The build retains the pre-existing application bundle-size warning. Preview course data currently cannot load; UI error/retry remains visible rather than substituted content.

## Learner login and signup (16 October)

- `/login` and `/signup` use `LearnerAuthShell`: on desktop a two-column dialog with the logo, tagline and Mai/Nam illustration beside the form; below 900 px only the logo and form remain. Staff login (`/console/login`) keeps `AuthShell`.
- Landing and learner auth share fonts and color tokens from `src/styles/base/learner-brand.css`.
- Email/password come first and submit on Enter; Google sign-in follows the divider. Field errors are linked with `aria-describedby`. Dev quick-login buttons sit in a collapsed "Công cụ phát triển" panel that only renders in development.
- When Google Identity Services is unavailable, the disabled fallback button shows the four-color Google mark.

## Accepted direction

A clear, friendly V-ACT learning site: a light canvas, navy text, blue actions, self-hosted Be Vietnam Pro typography and the existing Mai/Nam illustrations. The three hero images remain, with explicit slide selection and pause controls. Cards use restrained borders instead of repeated heavy bottom edges.

## Implemented

- Compact header with a course anchor and separate signup/login destinations.
- A split hero, short exam facts strip and compact knowledge-group selectors.
- Course discovery with loading, recoverable error, empty and populated states. Up to three real courses; missing prices are not converted to zero. Invalid/missing covers have a neutral fallback.
- Interactive sample lesson before the consolidated learning journey; completion links to courses or assessment sign-in.
- Compact support information, a secondary external calculator link, condensed exam reference, FAQ and closing actions.
- Landing-scoped CSS; shared student and console components are unchanged.
- Native link behavior for ordinary navigation, modifier keys and new tabs. Signup links have the actual signup destination.
- Local font assets and their OFL license; social preview metadata uses an existing study illustration.

Section order: header → hero → knowledge groups → courses → sample lesson → journey → support → exam reference → FAQ → closing CTA → footer. The duplicate exam-facts strip was removed at the user's request; the lower exam reference remains.

### Local single-course preview

Open http://127.0.0.1:5190/?preview-course=1#khoa-hoc to see one illustrative course. This opt-in mode is guarded by `import.meta.env.DEV`, labels the title/price/date as sample data, skips the real catalog request and links to the working sample lesson rather than a nonexistent course detail. The regular URL still uses the real catalog. A production build contains no sample course payload (confirmed by searching built JavaScript).

After removing the facts strip and adding this preview: application TypeScript, targeted ESLint, production build and 10/10 landing tests passed. The bundle-size warning remains.

## Desktop validation

- `npm run build`: passed; Vite still reports the application's large main bundle warning.
- TypeScript application and E2E checks: passed.
- Targeted ESLint: passed. Main text contrast 13.67:1, muted text on the blue section 6.15:1, primary button label 6.54:1.
- `npx playwright test --config playwright.landing.config.ts`: 8 passed.
- Desktop widths 1280, 1440 and 1920: no horizontal overflow.
- Covered empty/loading/populated/error-and-retry course states, native new-tab navigation, signup/login dialogs, sample completion/restart, subject dialog focus return, FAQ and carousel controls.
- E2E data is intercepted in the browser only; no example courses are inserted into application data.
- At 1440 px, the current empty-catalog page is approximately 5,177 px tall. This varies with real course content and expanded sections.

## Preview

Run from this worktree:

```powershell
npm run dev -- --host 127.0.0.1 --port 5190 --strictPort
```

Open http://127.0.0.1:5190/ . The original checkout remains separate.

## Deliberately deferred

- Mobile refinement and acceptance are paused at the user's request. Initial responsive rules exist, but the completed acceptance run is desktop-only.
- Live catalog currently displays the honest empty state. Populated card layouts are covered by isolated E2E fixtures.
- Social preview scraping must be checked after publishing the assets to the public hostname.
- No push, merge or deployment was performed.
