import type { ReactNode } from 'react'
import { ArrowLeft } from '../../console/icons'
import Button from '../../ui/Button'

interface BackLinkProps {
  onClick: () => void
  children: ReactNode
}

// "← Quay lại ..." text button at the top of a Student page.
function BackLink({ onClick, children }: BackLinkProps) {
  return (
    <Button
      appearance="ghost"
      size="sm"
      className="h-auto gap-1.5 self-start p-0 text-[13px] font-bold text-text-secondary hover:bg-transparent hover:text-primary"
      onClick={onClick}
    >
      <ArrowLeft size={15} />
      {children}
    </Button>
  )
}

export default BackLink
