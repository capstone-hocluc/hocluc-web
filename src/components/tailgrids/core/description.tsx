"use client";

import { cn } from "../../../lib/cn";
import { Text, type TextProps } from "react-aria-components";

export interface DescriptionProps extends Omit<TextProps, "slot"> {}

export function Description({ className, ...props }: DescriptionProps) {
  return (
    <Text
      slot="description"
      data-slot="description"
      className={cn("text-sm text-text-50", className)}
      {...props}
    />
  );
}
