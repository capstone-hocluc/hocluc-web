import type { ComponentProps } from 'react'
import { Search } from 'lucide-react'
import { cn } from '../../lib/cn'

// Rounded search field with a leading icon; focus ring on the wrapper.
function SearchInput({ className, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  return (
    <label
      className={cn(
        'flex min-h-10 min-w-70 items-center gap-2 rounded-xl border border-line-blue bg-surface px-3.5 text-text-faint focus-within:border-primary/55 focus-within:shadow-[0_0_0_4px_rgba(28, 176, 246,0.09)] max-[560px]:min-w-0 max-[560px]:flex-1',
        className
      )}
    >
      <Search size={17} className="shrink-0 text-primary" />
      <input
        type="search"
        className="w-full min-w-0 border-0 bg-transparent text-sm text-text-heading outline-none placeholder:text-text-faint"
        {...props}
      />
    </label>
  )
}

export default SearchInput
