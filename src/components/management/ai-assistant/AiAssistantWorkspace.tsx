// The AI exam workspace, loaded on its own: the editor, formulas and markdown it needs are not part of the console's
// first load. Until its code is in, a skeleton laid out like the workspace shows.
import { lazy, Suspense, type ComponentProps } from 'react'
import ThemeProvider from '../../common/ThemeProvider'
import { Skeleton } from '../../tailgrids/core/skeleton'
import { PANEL_LIMITS } from './use-panel-widths'

const loadScreen = () => import('./AiAssistantScreen')
const AiAssistantScreen = lazy(loadScreen)

// Opened straight on the workspace (a link, a reload): its code loads alongside the sign-in check, not after it.
if (typeof window !== 'undefined' && /\/ai-assistant\/?$/.test(window.location.pathname)) void loadScreen()

export default function AiAssistantWorkspace(props: ComponentProps<typeof AiAssistantScreen>) {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <AiAssistantScreen {...props} />
    </Suspense>
  )
}

/** The header and toolbar, the exam list, the A4 sheet and the assistant beside it, as the workspace lays them out. */
function WorkspaceSkeleton() {
  return (
    <ThemeProvider>
      <div
        role="status"
        aria-label="Đang mở trình soạn đề"
        className="flex h-dvh w-full flex-col overflow-hidden bg-background-gray-secondary_alt_2"
      >
        <div className="flex h-12 shrink-0 items-center gap-3 px-3">
          <Skeleton className="size-7 rounded-lg" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="ml-auto h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
        <div className="flex h-10 shrink-0 items-center gap-2 px-3">
          {Array.from({ length: 9 }, (_, index) => (
            <Skeleton key={index} className="h-7 w-14 rounded-md" />
          ))}
        </div>
        <div className="flex min-h-0 flex-1">
          <div
            className="hidden shrink-0 flex-col gap-3 border-r border-card-border bg-card-background p-3 xl:flex"
            style={{ width: PANEL_LIMITS.outline.default }}
          >
            <Skeleton className="h-7 w-full rounded-lg" />
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-4" style={{ width: `${85 - index * 7}%` }} />
            ))}
          </div>
          <div className="min-w-0 flex-1 overflow-hidden bg-background-gray-secondary px-3 py-6">
            <div className="mx-auto aspect-[210/297] w-full max-w-[794px] space-y-4 bg-white px-[8%] py-[9%] shadow-card">
              <Skeleton className="mx-auto h-5 w-1/2" />
              <Skeleton className="mx-auto h-3 w-1/3" />
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="space-y-2 pt-4">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))}
            </div>
          </div>
          <div
            className="hidden shrink-0 flex-col gap-3 border-l border-card-border bg-card-background p-4 lg:flex"
            style={{ width: PANEL_LIMITS.chat.default }}
          >
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-auto h-24 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}
