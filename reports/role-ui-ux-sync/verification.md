# Role UI/UX sync verification

Date: 2026-10-09

## Automated checks

- `npm run lint` — passed, 0 errors; 3 existing warnings (AuthPage hook dependencies, TanStack DataTable compiler skip, PracticeTab hook dependency).
- `npm run build` — passed.
- `git diff --check` — passed.
- `grep -rE '#[0-9a-fA-F]{6}' src/components/student src/pages/AdminLoginPage.tsx` — 0 matches.

## Browser checks

- `/login` rendered at 390px and 1440px.
- `/management/login` rendered at 390px with the shared shell and theme toggle.
- Landing rendered at 390px; mobile menu exposes `Đăng nhập` linking to `/login`.
- Landing standalone was rebuilt after removing the Amy hero.

Screenshots: `login-390.png`, `login-1440.png`, `management-login-390.png`, `landing-390.png`.

## Limitation

Authenticated dashboard screenshot coverage and cross-role guard checks require seeded role credentials/session state; anonymous browser checks stop at the login guards.
