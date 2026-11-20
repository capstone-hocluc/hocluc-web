type CreditIconProps = {
  /** Width and height in px. */
  size?: number;
  className?: string;
  /** Read out by screen readers; leave empty when a number next to the icon already says it. */
  title?: string;
};

/**
 * The credit unit: a gold coin with the Hocluc mark struck in pale gold (public/sao-coin.svg). The mobile app
 * ships the same file, so both draw one coin.
 */
export function CreditIcon({ size = 20, className, title }: CreditIconProps) {
  return (
    <img
      src="/sao-coin.svg"
      width={size}
      height={size}
      className={className}
      alt={title ?? ""}
      aria-hidden={title ? undefined : true}
      draggable={false}
    />
  );
}

/** An amount of credits: the coin followed by the number, for balances, prices and history rows. */
export function CreditAmount({
  value,
  size = 16,
  className,
  signed = false,
}: {
  value: number;
  size?: number;
  className?: string;
  /** Show + for positive values (history rows). */
  signed?: boolean;
}) {
  const text = `${signed && value > 0 ? "+" : ""}${value.toLocaleString("vi-VN")}`;
  return (
    <span className={`inline-flex items-center gap-1 font-semibold tabular-nums ${className ?? ""}`}>
      <CreditIcon size={size} />
      <span>{text}</span>
    </span>
  );
}
