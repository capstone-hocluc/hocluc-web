import type { ReactNode } from 'react'

export default function ChatFeatureGate({ children, console: consoleMode = false }: { children: ReactNode; console?: boolean }) {
  if (import.meta.env.VITE_MENTOR_CHAT_ENABLED === 'true') return children
  return (
    <section className={consoleMode ? 'rounded-xl border border-card-border bg-card-background p-8 text-text-primary' : 'rounded-2xl border border-border bg-surface p-8 text-heading'}>
      <h1 className="text-xl font-semibold">Hỏi Mentor</h1>
      <p className="mt-3 text-sm">Tính năng đang được chuẩn bị. Dịch vụ hỗ trợ Mentor chưa được bật.</p>
    </section>
  )
}
