# Landing page desktop redesign

Date: 2026-10-16. Branch: `codex-refactor-landingpage`.

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

Section order: header → hero → exam facts → knowledge groups → courses → sample lesson → journey → support → exam reference → FAQ → closing CTA → footer.

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
