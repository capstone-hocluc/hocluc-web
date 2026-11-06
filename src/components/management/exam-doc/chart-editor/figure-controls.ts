/*
 * The small controls of the figure editor, in the look of the chart editor's data grid: compact inputs that show red
 * when wrong, icon buttons, and the error line under a field that the field names as its description.
 */

// `size={1}` on an input lets it take its cell's width instead of the browser's 20 characters.
export const FIGURE_INPUT =
  'h-9 w-full min-w-0 rounded-md border border-card-border bg-input-background px-2.5 text-sm font-normal text-text-primary outline-none placeholder:text-input-placeholder-text focus:border-input-primary-focus-border aria-[invalid=true]:border-input-error-focus-border disabled:cursor-not-allowed disabled:bg-input-disabled-background disabled:text-input-disabled-text'

export const FIGURE_ICON_BUTTON =
  'inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-icon-tertiary outline-none transition-colors hover:bg-background-gray-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-input-primary-focus-border disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent'

export const FIGURE_SECTION_LABEL = 'text-sm font-medium text-text-primary'

/** The id of the error line of the field `key`. */
export const errorId = (key: string) => `figure-error-${key.replace(/[^A-Za-z0-9_-]/g, '-')}`

/**
 * The accessibility props of a field whose problem (if shown) is `message`: marked invalid and described by its
 * error line, and findable by `data-field` when focus goes to the first field that keeps the figure from saving.
 */
export function fieldProps(fieldKey: string, message: string | null | undefined) {
  return {
    'data-field': fieldKey,
    'aria-invalid': message ? true : undefined,
    'aria-describedby': message ? errorId(fieldKey) : undefined,
  }
}
