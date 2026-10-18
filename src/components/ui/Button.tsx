import type { ComponentProps } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

// Landing-page buttons: solid colour with a 4px "ledge" under it that the button
// presses into on :active. Same variant x appearance x size cva structure as
// before; Tailwind utility classes only - no index.css rule.
const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-[13px] border-2 border-transparent font-extrabold whitespace-nowrap transition-[transform,box-shadow,background-color] duration-150 [&>svg]:shrink-0 not-disabled:hover:-translate-y-0.5 not-disabled:active:translate-y-[3px] not-disabled:active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#174fbd]',
  {
    variants: {
      variant: {
        primary: '',
        danger: '',
        success: '',
      },
      appearance: {
        fill: '',
        outline: 'bg-surface',
        ghost: 'bg-transparent hover:shadow-none not-disabled:hover:translate-y-0 not-disabled:active:translate-y-0',
      },
      size: {
        sm: 'h-9 gap-1.5 px-3.5 text-sm [&>svg]:size-4',
        md: 'h-11 px-5 text-[15px] [&>svg]:size-[18px]',
        lg: 'h-[50px] px-6 text-base [&>svg]:size-[18px]',
        icon: 'size-10 p-0 [&>svg]:size-[18px]',
      },
      shape: {
        default: '',
        pill: 'rounded-full',
      },
    },
    compoundVariants: [
      {
        variant: 'primary',
        appearance: 'fill',
        className: 'bg-primary text-white shadow-[0_4px_0_#0797d6] hover:bg-[#48c2fa]',
      },
      {
        variant: 'primary',
        appearance: 'outline',
        className: 'border-line text-text-heading hover:bg-surface-brand',
      },
      {
        variant: 'primary',
        appearance: 'ghost',
        className: 'text-primary-text hover:bg-surface-brand',
      },
      {
        variant: 'danger',
        appearance: 'fill',
        className: 'bg-danger text-white shadow-[0_4px_0_#b8243a] hover:brightness-110',
      },
      {
        variant: 'danger',
        appearance: 'outline',
        className: 'border-danger-line text-danger hover:bg-badge-danger-bg',
      },
      {
        variant: 'danger',
        appearance: 'ghost',
        className: 'text-danger hover:bg-badge-danger-bg',
      },
      {
        variant: 'success',
        appearance: 'fill',
        className: 'bg-success text-white shadow-[0_4px_0_#0f7a43] hover:brightness-110',
      },
      {
        variant: 'success',
        appearance: 'outline',
        className: 'border-line-practice text-practice hover:bg-badge-success-bg',
      },
      {
        variant: 'success',
        appearance: 'ghost',
        className: 'text-success hover:bg-badge-success-bg',
      },
    ],
    defaultVariants: {
      variant: 'primary',
      appearance: 'fill',
      size: 'md',
      shape: 'default',
    },
  }
)

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof button> & {
    /** Render the child element (e.g. an <a>) with the button styles instead of a <button>. */
    asChild?: boolean
  }

function Button({
  variant,
  appearance,
  size,
  shape,
  className,
  type = 'button',
  asChild = false,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      {...(asChild ? {} : { type })}
      data-ui-button=""
      data-variant={variant ?? 'primary'}
      data-appearance={appearance ?? 'fill'}
      className={cn(button({ variant, appearance, size, shape }), className)}
      {...props}
    >
      {children}
    </Comp>
  )
}

export default Button
