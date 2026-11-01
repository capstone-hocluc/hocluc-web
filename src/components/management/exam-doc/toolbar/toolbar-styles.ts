// Shared class lists for the toolbar row and its menus (console kit tokens). The pill is
// bg-background-gray-secondary; menus match the menubar's NextAdmin dropdown look.

/** Any control sitting on the pill: icon buttons, select triggers, colour buttons. */
export const controlClass =
  'inline-flex h-8 shrink-0 items-center rounded-md text-icon-secondary outline-none transition-colors hover:bg-background-gray-tertiary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border disabled:pointer-events-none disabled:opacity-40 data-[state=open]:bg-background-gray-tertiary data-[state=open]:text-text-primary aria-pressed:bg-badge-primary-background aria-pressed:text-primary-text aria-pressed:ring-1 aria-pressed:ring-inset aria-pressed:ring-primary-text/25'

/** Trigger that shows a value as text ("100%", "Văn bản thường"). */
export const textTriggerClass = 'gap-1 px-2 text-[13px] font-medium text-text-primary'

/** Floating surface for menus and popovers. */
export const surfaceClass =
  'z-70 rounded-xl border border-card-border bg-background-white-secondary p-1.5 text-text-primary shadow-md outline-none'

/** A menu row; the right slot (pr-8) holds the check mark or submenu chevron. */
export const menuItemClass =
  'relative flex h-8 w-full cursor-default select-none items-center gap-2.5 rounded-md pl-2 pr-8 text-left text-[13px] text-text-primary outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-45 data-[highlighted]:bg-background-gray-secondary_alt data-[state=open]:bg-background-gray-secondary_alt'

export const menuSlotClass =
  'pointer-events-none absolute right-2 inline-flex size-4 items-center justify-center text-primary-text'
