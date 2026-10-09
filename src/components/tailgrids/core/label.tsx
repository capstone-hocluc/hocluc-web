"use client";

import { cn } from "../../../lib/cn";
import { Label as AriaLabel, type LabelProps as AriaLabelProps } from "react-aria-components";

export interface LabelProps extends AriaLabelProps {}

export function Label({ className, ...props }: LabelProps) {
  return (
    <AriaLabel
      className={cn("block text-sm font-medium text-input-label-text-color", className)}
      {...props}
    />
  );
}
