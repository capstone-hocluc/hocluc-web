interface StudentToastProps {
  message: string
}

// Bottom-right notice for a useTransientMessage() value; renders nothing when empty.
function StudentToast({ message }: StudentToastProps) {
  if (!message) return null
  return (
    <div
      role="status"
      className="fixed right-6 bottom-6 z-80 max-w-[min(360px,calc(100vw-32px))] rounded-2xl border-[1.5px] border-line-brand bg-surface px-4 py-3 text-sm leading-[1.45] font-extrabold text-text-heading shadow-[0_4px_0_#b9e3f7,0_18px_40px_rgba(17,24,58,0.14)]"
    >
      {message}
    </div>
  )
}

export default StudentToast
