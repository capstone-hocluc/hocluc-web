"use client";

import { cn } from "../../../lib/cn";
import { cva, type VariantProps } from "class-variance-authority";
import { Input as AriaInput, type InputProps as AriaInputProps } from "react-aria-components";

const inputStyles = cva(
  "peer max-w-full rounded-lg border bg-input-background px-4 py-2.5 text-title-50 duration-300 outline-none placeholder:text-input-placeholder-text disabled:cursor-not-allowed disabled:border-base-100 disabled:text-input-disabled-text disabled:placeholder:text-input-disabled-text data-invalid:border-input-error-focus-border",
  {
    variants: {
      state: {
        default:
          "border-card-border focus:border-input-primary-focus-border data-invalid:border-input-error-focus-border",
        error: "border-input-error-focus-border",
        success: "border-input-success-focus-border",
      },
    },
  },
);

export interface InputProps extends AriaInputProps, VariantProps<typeof inputStyles> {}

export function Input({ state = "default", className, ...inputProps }: InputProps) {
  return <AriaInput className={cn(inputStyles({ state }), className)} {...inputProps} />;
}
