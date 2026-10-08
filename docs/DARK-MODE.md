# Dark mode Admin FE

Dark mode được triển khai cho toàn bộ khu vực vận hành theo vai trò (Admin,
Manager, Staff, Mentor và Teacher). Landing/public, auth người học, onboarding
và Student vẫn dùng giao diện sáng riêng; không cần API từ backend.

## Contract

- Theme hợp lệ: `light` hoặc `dark`.
- Mặc định: `light`.
- Lưu tại `localStorage` với key `hocluc.theme`.
- Trạng thái được đặt trên `<html data-theme="...">` khi Admin được mount để cả Radix Portal và màn hình Admin dùng chung token.
- `ThemeProvider` là nguồn trạng thái; `ThemeToggle` là control dùng chung.
- Tôn trọng `prefers-reduced-motion`.

## Vị trí code

- Provider/context: `src/components/common/ThemeProvider.tsx`, `theme-context.ts`, `useTheme.ts`.
- Toggle: `src/components/ui/ThemeToggle.tsx`.
- Token sáng/tối và variant `dark` của Tailwind (`@custom-variant` trong `src/index.css`): `src/styles/base/tokens.css`.
- Early paint script: `index.html`.

`ThemeProvider` được mount quanh management login, management shell và Teacher
shell; `ThemeToggle` hiện diện trong các shell vận hành. Khi rời khu vực vận hành,
provider trả document về light mode để không làm thay đổi các surface public và
learner chưa triển khai dark mode.

## Quy ước khi thêm UI

Ưu tiên token semantic (`bg-surface`, `text-text-heading`, `border-border-subtle`, `text-primary-text`, `text-white` trên nền accent) thay vì màu hex trực tiếp trong Admin. Khi thêm một surface hoặc trạng thái mới trong Admin, kiểm tra cả light/dark ở desktop và mobile; không dùng `--color-surface` làm màu chữ trên nền accent.
