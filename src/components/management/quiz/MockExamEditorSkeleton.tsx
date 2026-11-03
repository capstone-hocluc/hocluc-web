import Card from '../../console/card'
import { Skeleton } from '../../tailgrids/core/skeleton'

function CardHeading({ eyebrow = 'w-32', title = 'w-48' }: { eyebrow?: string; title?: string }) {
  return (
    <div className="mb-4 flex flex-col gap-2">
      <Skeleton className={`h-3 ${eyebrow}`} />
      <Skeleton className={`h-5 ${title}`} />
    </div>
  )
}

function Field({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  )
}

function SettingsFields() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Field className="md:col-span-3" />
      <Field className="md:col-span-3" />
      <Field />
      <Field />
      <Field />
      <div className="grid gap-4 sm:grid-cols-2 md:col-span-3">
        <Field />
        <Field />
      </div>
      <div className="flex gap-8 md:col-span-3">
        <Skeleton className="h-5 w-52" />
        <Skeleton className="h-5 w-52" />
      </div>
    </div>
  )
}

/** Placeholder with the workspace's own layout (top bar with steps and actions, settings, step buttons) while a saved exam loads. */
function ExamWorkspaceSkeleton() {
  return (
    <section className="flex h-dvh flex-col bg-card-surface-area" aria-busy="true" aria-label="Đang tải đề thi">
      <header className="flex shrink-0 items-center gap-4 border-b border-card-border px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-2">
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="hidden flex-1 justify-center gap-3 lg:flex">
          {[0, 1].map(step => <Skeleton key={step} className="h-7 w-36 rounded-lg" />)}
        </div>
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-10 w-16 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="mx-auto w-full max-w-4xl p-4 sm:p-6">
          <Card as="section" padding="lg"><SettingsFields /></Card>
        </div>
      </div>
      <footer className="flex shrink-0 justify-end border-t border-card-border px-4 py-3 sm:px-6">
        <Skeleton className="h-10 w-32 rounded-lg" />
      </footer>
    </section>
  )
}

/** Placeholder with the editor's own layout while a saved exam loads: the full-window workspace for an exam, the in-page form with its questions for a quick quiz. */
export default function MockExamEditorSkeleton({ workspace = true }: { workspace?: boolean }) {
  if (workspace) return <ExamWorkspaceSkeleton />
  return (
    <section className="flex flex-col gap-4" aria-busy="true" aria-label="Đang tải đề thi">
      <header className="flex flex-col gap-1">
        <Skeleton className="h-3 w-56" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="h-8 w-72" />
        </div>
      </header>

      <Card as="section" padding="lg"><SettingsFields /></Card>

      <Card as="section" padding="lg">
        <div className="mb-4 flex items-end justify-between gap-3">
          <CardHeading eyebrow="w-24" title="w-52" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map(row => (
            <div key={row} className="flex flex-col gap-2 rounded-xl border border-card-border p-4">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ))}
        </div>
      </Card>
    </section>
  )
}
