# HocLuc landing page research and full-page layout

> Desktop implementation updated on 2026-10-16. See [Landing page desktop redesign](landing-page-redesign.md) for the current layout and validation. This document preserves the earlier research.

Research date: 2026-10-13 15:21 Asia/Saigon

## Decisions changed on 2026-10-16

The landing page was restructured after a product review. Where the sections below disagree, these decisions win:

- Page order: hero → V-ACT facts strip → five knowledge groups → courses (`#cac-khoa-hoc`) → learning path (`#lo-trinh`) → sample lesson → support while learning (`#ho-tro`) → V-ACT explanation (`#ky-thi`) → FAQ → final CTA → footer.
- The main navigation includes **Khóa học**. On the landing page it points at `#cac-khoa-hoc`; on other public pages it opens `/courses`. The duplicate **Học thử** header link was removed (**Bài học mẫu** remains).
- The courses section shows real catalog data from `GET /api/v1/courses/main`, **with prices**, the three courses starting soonest, and loading, error and empty states.
- The four start steps and the six-step learning cycle are one section (`#lo-trinh`); the separate cycle section and the standalone calculator section were removed. ClassPad.net, mentor chat and the AI tutor live in the support section, each with its access condition.
- **Bắt đầu miễn phí** opens sign-up; **Làm đánh giá miễn phí** still opens sign-in, with the sign-in requirement stated under the hero buttons.
- The V-ACT explanation sits near the end, condensed; the exam season is a disclosure.
- Primary buttons use navy text on the bright brand blue (readable contrast). The landing page and the public course pages share one header and footer and the learner look (`html[data-learner]`, light only).

## Summary

HocLuc should present the landing page as a clear route into V-ACT preparation, not as a course-sale campaign. The strongest reference is the product-first structure used by VN Exams: explain what a learner can do, show the available exam paths, and give a direct next action. Combine that with the learner-centered diagnostic flow in HocLuc's own product documents. Do not invent score claims, learner counts, testimonials, or a mock-exam interface that does not exist yet.

## Scope and sources

Reviewed the current landing source, `PRODUCT.md`, `docs/FE-DanhSach-ManHinh.md`, and relevant sections of `W:/CapstoneProject/docs/01-TongQuan-NghiepVu.md`, `02-Luong-Actor-API.md`, `03-NoiDung-MasterData-NganHang.md`, and `05-HienTrang-LoTrinh-VanHanh.md`. External review used current public pages from HOCMAI, VN Exams, Aurora, Sangsang, V-ACT, and Tuyensinh247.

## Research findings

| Reference | Pattern observed | Useful for HocLuc | Avoid copying |
| --- | --- | --- | --- |
| [HOCMAI V-ACT](https://pathcm.hocmai.vn/) | Anchored navigation for achievements, roadmap, teachers and tuition; first screen is organized around the exam offer and consultation CTA. | Clear page navigation and a concrete V-ACT promise. | Countdown, discount-first messaging and long sales copy; HocLuc's product brief rejects generic and repetitive promo sections. |
| [VN Exams](https://vn-exams.com/) | Product-first introduction, two clear actions, then exam choices and a visible explanation of practice features. | Closest structure to HocLuc as a learning platform. | Do not claim a question bank or full mock-exam experience before those experiences are real and available. |
| [Aurora Education](https://auroraedu.edu.vn/) | Opens with understanding the student's strengths and gaps, then presents a four-step diagnostic and learning path. | Connects naturally to HocLuc's free placement assessment and personalized roadmap. | Do not imply personalized advice is available before sign-in or before the assessment. |
| [Sangsang V-ACT](https://vact.sangsang.edu.vn/) and [V-ACT.vn](https://v-act.vn/) | Teacher identity, score goals, pricing and course stages dominate the promotional landing page. | Roadmap stages help explain what preparation looks like. | Avoid unverified score, pass-rate, student-count or “top teacher” claims. |
| [Tuyensinh247 V-ACT](https://mthi.tuyensinh247.com/thi-danh-gia-nang-luc-2026-e773.html) | Exam links and current exam information are surfaced directly in navigation and content. | Keep V-ACT information easy to find. | Its dense news/catalog layout is not a good visual model for HocLuc's product landing page. |

HOCMAI describes its broader TopUni offer as a sequence from foundation building to review and practical testing, while its V-ACT test-room page separately explains practice and full-test modes ([TopUni overview](https://huongnghiep.hocmai.vn/hocmai-chinh-thuc-ra-mat-giai-phap-topuni-lo-trinh-s-danh-rieng-cho-2k9-on-thi-vact-2027), [V-ACT practice room](https://hocmai.vn/khoa-hoc-truc-tuyen/2611/phong-luyen-v-act.html)). This supports explaining a study journey as steps, but not duplicating the same promise across multiple sections.

## Product constraints from HocLuc documents

- The public visitor can browse the catalog, course details and lesson previews. The placement assessment is free and covers all subjects, but requires sign-in.
- The first assessment produces a common roadmap with existing courses, lessons and practice recommendations, including items the learner has not purchased. Paid access still controls which lessons the learner can open.
- The curriculum is organized around five V-ACT question groups, not difficulty levels: Vietnamese, English, Mathematics and Quantitative Reasoning, Logic and Data Analysis, and Scientific Reasoning.
- V-ACT uses 120 questions, 150 minutes and a 1,200-point scale in the current product documents. Any public score conversion must be labeled as HocLuc's simulation unless official calibration data exists.
- Active course access is required for the AI tutor. A public landing page may explain the tutor, but must not suggest that an anonymous visitor can use it immediately.
- The product brief explicitly rejects repeated promotions, generic layouts, and unsupported performance or learner-count claims.

## Proposed full-page layout

### 1. Header

`Logo | Chương trình | Cách học | Bài học mẫu | V-ACT | Học thử | Đăng nhập | [Bắt đầu miễn phí]`

Keep the header compact and sticky only if it does not crowd mobile. “Bắt đầu miễn phí” leads to sign-in before the placement assessment; “Bài học mẫu” remains publicly accessible. Do not put the course catalog, AI tutor, calculator and every feature into the main nav.

### 2. Hero

Two-column desktop layout. Left: a plain V-ACT label, one outcome-led headline, one short explanatory sentence, a primary button to the free placement assessment, and a secondary link to browse courses. State that the assessment requires sign-in near the primary CTA. Right: one single visual scene with Mai and Nam studying or a designed study-plan / question-sheet composition. It is an editorial brand visual, not a fake product screenshot. Do not use three switching stock-style photos.

Suggested message direction: “Biết mình cần học gì để chuẩn bị V-ACT.” Supporting copy should explain that HocLuc helps learners identify gaps and choose the next suitable lesson or practice step.

### 3. What the V-ACT exam is (`#ky-thi`)

The hero is followed by a white rest band, then the `#ky-thi` section; there is no separate facts strip, so the numbers appear once. The header's V-ACT link (desktop and mobile) and the footer's "Tìm hiểu V-ACT" link open this section. It explains what ĐGNL / V-ACT is, shows the official structure as one table (Sử dụng ngôn ngữ 60 câu, Toán học 30, Tư duy khoa học 30; 120 câu and 1,200 points in total, split evenly across the four components), the IRT scoring note, and a four-step exam season. It uses the official exam wording only; Học Lực's own five learning groups stay in the catalog section below. Figures follow the Trung tâm Khảo thí ĐHQG-HCM page (cetqa.vnuhcm.edu.vn); no exam dates are stated. The illustration is an inline SVG multiple-choice answer sheet labelled "Minh họa", so it does not repeat the Mai/Nam artwork used elsewhere and does not claim to be the exact V-ACT sheet layout.

### 4. Five V-ACT knowledge groups

Retain the existing five-group visual cards and the owl only on Mathematics & Quantitative Reasoning. Use the official curriculum labels consistently. Each card should state what the learner practices and link to relevant public course or preview content. Keep this as the primary content-discovery section.

### 5. How HocLuc helps a learner start

Replace the generic four-step journey with the real product flow:

1. Sign in and set a target.
2. Take the free assessment across the subject groups.
3. Review strengths and gaps.
4. Follow a roadmap of courses, lessons and practice, with access clearly marked for items not yet purchased.

Use Mai and Nam as supporting guides here if needed. Avoid duplicating the same four benefits in another section.

### 6. A real lesson preview

Show one public lesson or a short sample question with an explanation, sourced from approved course preview content. Clearly label it “Bài học xem trước” or “Câu luyện mẫu”; do not present it as the diagnostic assessment or as a full V-ACT exam. The CTA leads to the related course or to sign-in to start the assessment.

### 7. Learning tools and practice method

Explain only capabilities currently demonstrated by the site: guided lesson content, practice by knowledge group, and feedback that explains an answer. Keep calculator access as an optional link to CASIO's official ClassPad.net emulator; do not embed an unlicensed emulator. Keep AI tutoring as a concise feature explanation with an explicit note that access requires an active course.

Do not present a realistic mock-test screen until the actual test interface is ready. A neutral study-plan graphic or example question can fill the visual space temporarily.

### 8. One clear preparation path

Show the learning cycle from the curriculum documents as a concise diagram: `Learn → Drill → Practice → Diagnose → Remediate → Reassess`. Explain that practice results help identify what to revisit, without promising official IRT-equivalent scores. This replaces repeated “lộ trình”, “tiến bộ”, and feature-benefit copy.

### 9. FAQ about getting started

Answer only practical questions supported by current policy: Is the placement assessment free? Is sign-in required? Can visitors preview lessons? What can be seen before buying? When is the AI tutor available? Link exam-structure questions to the V-ACT information section.

### 10. Final CTA

Repeat one action: `Làm bài đánh giá đầu vào miễn phí` with the sign-in requirement visible. Offer `Khám phá khóa học` as a secondary link. Avoid a second discount panel or fabricated urgency.

### 11. Footer

Include links to the course catalog, V-ACT information, preview lessons, account sign-in, support, privacy and terms. Keep the same language as the header.

## Existing sections to change

| Current section | Recommendation |
| --- | --- |
| 120-school proof strip | Keep only after rechecking the source and update date; make it a small, dated proof point rather than the main value proposition. |
| Five-group catalog | Keep and make it the main discovery section. |
| Four generic roadmap steps | Rewrite to match the documented sign-in → assessment → result → roadmap flow. |
| Custom interactive Casio calculator | Replace with a link to the official ClassPad.net emulator until embedding permission is in place. |
| Three-question sample | Use one approved preview lesson or clearly label it as a sample, then connect it to a next step. |
| Repeated benefit list | Remove or merge into “Learning tools and practice method.” |
| Three-photo tab hero | Keep three full-bleed Mai and Nam scenes—V-ACT exam, studying together, and AI guidance—with a soft text-safe gradient and accessible scene controls. Treat every scene as brand artwork, not a live product UI. |

## Responsive order

On mobile: compact header → hero copy and CTAs over the full-bleed carousel → V-ACT facts → five groups → four-step start flow → lesson preview → tools → learning cycle → FAQ → final CTA → footer. Stack all sections in reading order and keep the assessment access rule beside the CTA.

## Remaining content decision

- Which additional real course lessons are approved for public preview?
- The landing page retains a small link to the official ClassPad.net emulator; no custom emulator is embedded.
- The landing page is a React page (`src/pages/LandingPage.tsx`, components in `src/components/landing-page/`, copy and hero slides in `src/data/landing-content.ts`), not an iframe. Hero slides are `{ id, src, alt, label }` entries with plain URLs, so uploaded images can replace the bundled ones later.
- The three Mai and Nam hero scenes are `hero-vact-exam.webp`, `hero-mai-nam-learning.webp`, and `hero-mai-nam-ai.webp` in `public/landing-v2/assets`. The AI scene includes cloud, star, and robot avatars. The scenes cross-fade with a slight vertical drift, rotate automatically, pause on hover/focus, and respect reduced-motion preferences; the artwork is brand illustration, not product screenshots or real student photos.
- The application has no public support, privacy-policy or terms routes yet. The footer links support questions to the FAQ and should add policy links when those pages are available.
