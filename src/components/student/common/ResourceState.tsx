import type { ReactNode } from 'react'
import MascotState from '../../common/MascotState'
import type { ResourceStatus } from '../../../hooks/usePageResource'

interface StateCopy {
  title: string
  message?: string
  actionLabel?: string
  onAction?: () => void
}

interface ResourceStateProps {
  status: ResourceStatus
  errorMessage?: string
  /** Skeleton shown while loading. */
  loading: ReactNode
  forbidden?: StateCopy
  notFound?: StateCopy
  error: { title: string }
  onRetry: () => void
  imageSrc?: string
}

// Renders the non-ready states of a usePageResource() request; renders
// nothing once the resource is ready so the page can render its own content.
function ResourceState({
  status,
  errorMessage,
  loading,
  forbidden,
  notFound,
  error,
  onRetry,
  imageSrc,
}: ResourceStateProps) {
  if (status === 'loading') return <>{loading}</>
  if (status === 'forbidden' && forbidden) return <MascotState imageSrc={imageSrc} {...forbidden} />
  if (status === 'not-found' && notFound) return <MascotState imageSrc={imageSrc} {...notFound} />
  if (status === 'error' || status === 'forbidden' || status === 'not-found')
    return (
      <MascotState
        imageSrc={imageSrc}
        title={error.title}
        message={errorMessage}
        actionLabel="Thử lại"
        onAction={onRetry}
      />
    )
  return null
}

export default ResourceState
