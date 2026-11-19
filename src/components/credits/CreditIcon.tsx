import { useId } from "react";

type CreditIconProps = {
  /** Width and height in px. */
  size?: number;
  className?: string;
  /** Read out by screen readers; leave empty when a number next to the icon already says it. */
  title?: string;
};

/** The Hocluc mark (head and two swooshes), drawn in its own 16 19 317 419 box, as in public/hocluc-mark.svg. */
const MARK_PATHS = [
  "M225.7537,118.9119A40.5325,40.5325 0 0 1 185.2212,159.4444A40.5325,40.5325 0 0 1 144.6886,118.9119A40.5325,40.5325 0 0 1 185.2212,78.3793A40.5325,40.5325 0 0 1 225.7537,118.9119Z",
  "M17.220,167.000C66.923,198.487 80.405,221.623 73.000,280.989C89.316,249.107 115.290,226.007 142.000,202.897C122.546,173.063 50.415,154.821 17.220,167.000Z",
  "M328.518,19.272C299.417,96.693 287.323,118.643 214.002,165.783C178.848,188.385 143.570,205.310 114.192,239.619C78.509,281.292 54.562,318.822 54.562,375.510C54.563,397.462 59.607,417.339 66.642,436.728C75.988,433.579 146.934,373.922 156.855,362.534C198.693,314.507 195.594,255.769 229.255,219.888C283.951,161.585 350.052,109.432 328.518,19.272Z",
];

function Mark({ fill, dy = 0 }: { fill: string; dy?: number }) {
  return (
    <svg x="7.75" y={6.05 + dy} width="8.5" height="11.2" viewBox="16 19 317 419" fill={fill}>
      {MARK_PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/**
 * The credit unit: a gold coin with the Hocluc mark struck in pale gold. A darker rim below gives it thickness,
 * and a short glint on the upper left catches the light.
 */
export function CreditIcon({ size = 20, className, title }: CreditIconProps) {
  const id = useId().replace(/:/g, "");
  const face = `${id}-face`;
  const field = `${id}-field`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={face} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE07A" />
          <stop offset="1" stopColor="#F2A81D" />
        </linearGradient>
        <linearGradient id={field} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F7B92E" />
          <stop offset="1" stopColor="#FFD963" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12.6" r="10.4" fill="#B8760A" />
      <circle cx="12" cy="11.6" r="10.4" fill={`url(#${face})`} />
      <circle cx="12" cy="11.6" r="7.6" fill={`url(#${field})`} stroke="#E39A12" strokeWidth="0.8" />
      {/* The mark, embossed: a darker copy just below, the pale one on top. */}
      <Mark fill="#C98309" dy={0.45} />
      <Mark fill="#FFF6D2" />
      <path d="M6 7.4a7.6 7.6 0 0 1 4-3" stroke="#FFF6D2" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity="0.8" />
    </svg>
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
