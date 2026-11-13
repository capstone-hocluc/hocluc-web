// assistant-ui Elements' surface recipes (r.assistant-ui.com, `surfaces`), on the console's tokens: its `background`
// is the card, its `foreground` the primary text, its `border` the card border.

export const paper = 'border border-card-border/80 bg-card-background'

export const floating = 'border border-card-border/80 bg-card-background shadow-card-hover'

export const field = 'bg-text-primary/[0.04] forced-colors:border dark:bg-text-primary/[0.06]'

export const fieldInteractive =
  'bg-text-primary/[0.04] transition-colors hover:bg-text-primary/[0.07] forced-colors:border dark:bg-text-primary/[0.06] dark:hover:bg-text-primary/[0.09]'

export const pressable =
  'transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.96] motion-reduce:transition-none'

export const ghostButton =
  'flex items-center justify-center rounded-full text-text-tertiary outline-hidden transition-[background-color,color,scale] duration-150 hover:bg-text-primary/[0.06] hover:text-text-primary/90 active:scale-[0.96] focus-visible:ring-1 focus-visible:ring-text-primary/25 motion-reduce:transition-none dark:hover:bg-text-primary/[0.09]'

export const inkButton =
  'bg-text-primary text-card-background transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:opacity-90 active:scale-[0.96] motion-reduce:transition-none forced-colors:border'

/** Two icons stacked in one cell, one shown: the swap fades, shrinks and blurs the other away. */
export const iconSwap =
  '[grid-area:1/1] transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none'

export const iconSwapIn = 'scale-100 opacity-100 blur-none'

export const iconSwapOut = 'scale-[0.25] opacity-0 blur-[4px]'

/** A chip of the composer's toolbar (a mode, the settings), as Elements' model trigger is. */
export const composerChip =
  'inline-flex h-8 min-w-0 items-center gap-1.5 rounded-full px-2 text-[12.5px] font-medium whitespace-nowrap text-text-tertiary outline-hidden transition-colors hover:bg-text-primary/[0.06] hover:text-text-primary/90 focus-visible:ring-1 focus-visible:ring-text-primary/25 dark:hover:bg-text-primary/[0.09]'

/** A tool of the composer's toolbar that is not there yet. */
export const composerTool = `${ghostButton} size-7 disabled:pointer-events-none disabled:opacity-30`
