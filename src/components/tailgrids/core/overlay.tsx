import { cn } from "../../../lib/cn";
import { useMemo, type ContextType, type ReactNode } from "react";
import {
  ModalOverlay as AriaModalOverlay,
  OverlayTriggerStateContext,
  type ModalOverlayProps as AriaModalOverlayProps
} from "react-aria-components";

export interface OverlayWrapperProps {
  isOpen: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  children: ReactNode;
}

/**
 * Opens and closes the overlay inside it from `isOpen`. These dialogs have no trigger element, so this provides the
 * open state straight to the modal (a react-aria DialogTrigger would wait for a pressable child it never gets).
 */
export function OverlayWrapper({ isOpen, onOpenChange, children }: OverlayWrapperProps) {
  const state = useMemo<NonNullable<ContextType<typeof OverlayTriggerStateContext>>>(
    () => ({
      isOpen,
      setOpen: (next) => onOpenChange?.(next),
      open: () => onOpenChange?.(true),
      close: () => onOpenChange?.(false),
      toggle: () => onOpenChange?.(!isOpen),
      point: null,
      setPoint: () => undefined,
    }),
    [isOpen, onOpenChange]
  );
  return <OverlayTriggerStateContext.Provider value={state}>{children}</OverlayTriggerStateContext.Provider>;
}

export interface BackdropProps extends AriaModalOverlayProps {}

export function Backdrop({
  className,
  isDismissable = true,
  ...props
}: BackdropProps) {
  return (
    <AriaModalOverlay
      isDismissable={isDismissable}
      className={cn(
        "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-200",
        className
      )}
      {...props}
    />
  );
}
