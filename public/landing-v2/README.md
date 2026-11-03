# Landing page assets

The landing page is a React page, not a static HTML file:

- Page: `src/pages/LandingPage.tsx`
- Section components, dialogs and hooks: `src/components/landing-page/`
- Copy, courses, FAQ, hero slides and the calculator app intro: `src/data/landing-content.ts`
- Styles: `src/styles/landing/landing-page.css`, scoped under `.landing-page` so nothing leaks into other routes

This folder only holds the images and fonts the page (and a few student pages) load by URL, so the same
paths can later be replaced by uploaded images. `landingHero.slides` in `landing-content.ts` is the list of
hero images; each entry is `{ id, src, alt, label, caption }`.

## Artwork and licences

The hero photos (`hero-classroom-v4`, `hero-home-study-v4`, `hero-mock-exam-v4`) were generated with
Canva's image generator in November 2026: Vietnamese grade-12 students in school uniform and áo dài,
studying together in class, at home and in a mock exam. They are illustrations, not real students. The v4
hero photos are bright daylight versions (white walls, large windows, light-blue accents) with no text or
logos in the frame. Each comes as a 1536 px and an 800 px WebP for `srcSet`. `hero-mock-exam-v4` is also
the exam-hall photo in the exam section. `hero-students-cutout` (1400 px and 720 px) is a group photo
generated the same way on a green screen and keyed out locally; it stands in front of the logo shape in the
first hero slide.

`assets/cutouts/` holds the people standing on the exam panel and in the support section, on a transparent
background. `assets/cutouts/notes.md` records how they were generated and cut out.

`assets/universities/` holds the logos of the ĐHQG-HCM member schools shown in the exam section. They come
from Wikimedia Commons, and `assets/universities/SOURCES.md` lists each file's source and licence.

`student-laptop-study-v1-480.webp` (484 × 600) is the photo beside "Khoá dành cho ai" on the public course
page: a grade-12 student in school uniform studying on a laptop at a desk at home. It was generated with
Canva's image generator in November 2026 and is an illustration, not a real student; there is no text or
logo in the frame. Only this preview size could be downloaded; the 1136 × 1408 original stays in Canva.

UI icons are Lucide paths drawn inline by `LandingSprite.tsx` (ISC, `assets/icons/LICENSE`).

## Fonts

Nunito 400, 700, 800 and 900 in `assets/fonts`, from Google Fonts. All Vietnamese glyphs (U+1EA0–U+1EF9)
are present. SIL Open Font License in `assets/fonts/OFL.txt`. Be Vietnam Pro 400, 600 and 700 are in the
same folder for the student pages, with their licence in `assets/fonts/be-vietnam-pro-LICENSE.txt`.

## Student app

`assets/app/app-home.webp` and `assets/app/app-calculator.webp` are 2x renders (780 × 1688) of two screens
of the released student app (v0.3.3): the home screen and the CW-880 calculator. They were drawn from the
app's own widgets with example data, not a real student's. The home page shows them on phones drawn with
Tailwind (`StudentAppSection.tsx`), next to a link to the newest Android APK on the app's GitHub releases.
Keep other calculator makers' names and branding out of these screens.
