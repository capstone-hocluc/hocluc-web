# Landing page assets

The landing page is a React page, not a static HTML file:

- Page: `src/pages/LandingPage.tsx`
- Section components, dialogs and hooks: `src/components/landing-page/`
- Copy, courses, FAQ, hero slides and sample questions: `src/data/landing-content.ts`
- Styles: `src/styles/landing/landing-page.css`, scoped under `.landing-page` so nothing leaks into other routes

This folder only holds the images and fonts the page (and a few student pages) load by URL, so the same
paths can later be replaced by uploaded images. `landingHero.slides` in `landing-content.ts` is the list of
hero images; each entry is `{ id, src, alt, label }`.

## Artwork and licences

Hero scenes show Mai and Nam in three situations: taking a V-ACT practice test, writing and solving maths
together, and receiving hints from the cloud, star and robot AI avatars. They are brand illustrations, not
product screenshots or real students. The four subject illustrations (Vietnamese, English, Logic, Science)
and the owl on the Mathematics card remain in use.

Avatar silhouettes are adapted from the MathTutor `bot-avatars` package under the MIT licence
(`assets/bot-avatars-LICENSE.txt`). UI icons are Lucide (ISC, `assets/icons/LICENSE`).

## Fonts

Nunito 400, 700, 800 and 900 in `assets/fonts`, from Google Fonts. All Vietnamese glyphs (U+1EA0–U+1EF9)
are present. SIL Open Font License in `assets/fonts/OFL.txt`.

## Calculator

The calculator section links to the official CASIO ClassPad.net emulator; nothing is embedded.
