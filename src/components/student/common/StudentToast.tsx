interface StudentToastProps {
  message: string
}

// Bottom-right notice for a useTransientMessage() value; renders nothing when empty.
function StudentToast({ message }: StudentToastProps) {
  if (!message) return null
  return (
    <div
      role="status"
      className="fixed right-6 bottom-6 z-80 max-w-[min(360px,calc(100vw-32px))] rounded-xl border border-line-brand bg-surface px-4 py-3 text-sm leading-[1.45] font-semibold text-text-heading shadow-card-hover"
    >
      {message}
    </div>
  )
}

export default StudentToast
