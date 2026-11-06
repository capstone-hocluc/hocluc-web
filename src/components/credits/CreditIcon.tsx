import { useId } from "react";

type CreditIconProps = {
  /** Width and height in px. */
  size?: number;
  className?: string;
  /** Read out by screen readers; leave empty when a number next to the icon already says it. */
  title?: string;
};

/**
 * The credit unit: a gold four-pointed star. Each arm is split into a lit and a shaded facet with light
 * from the top left, so the star reads as a bevelled, slightly raised piece.
 */
export function CreditIcon({ size = 20, className, title }: CreditIconProps) {
  const id = useId().replace(/:/g, "");
  const light = `${id}-light`;
  const mid = `${id}-mid`;
  const dark = `${id}-dark`;
  const shadow = `${id}-shadow`;

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
        <linearGradient id={light} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF4B8" />
          <stop offset="1" stopColor="#FFD54A" />
        </linearGradient>
        <linearGradient id={mid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFD54A" />
          <stop offset="1" stopColor="#F5B325" />
        </linearGradient>
        <linearGradient id={dark} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E9A117" />
          <stop offset="1" stopColor="#B87308" />
        </linearGradient>
        <filter id={shadow} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="0.8" stdDeviation="0.6" floodColor="#8A5200" floodOpacity="0.35" />
        </filter>
      </defs>

      <g filter={`url(#${shadow})`} strokeLinejoin="round">
        {/* top arm */}
        <path d="M12 12 L8.5 8.5 L12 1.5 Z" fill={`url(#${light})`} />
        <path d="M12 12 L12 1.5 L15.5 8.5 Z" fill={`url(#${mid})`} />
        {/* right arm */}
        <path d="M12 12 L15.5 8.5 L22.5 12 Z" fill={`url(#${mid})`} />
        <path d="M12 12 L22.5 12 L15.5 15.5 Z" fill={`url(#${dark})`} />
        {/* bottom arm */}
        <path d="M12 12 L15.5 15.5 L12 22.5 Z" fill={`url(#${dark})`} />
        <path d="M12 12 L12 22.5 L8.5 15.5 Z" fill={`url(#${mid})`} />
        {/* left arm */}
        <path d="M12 12 L8.5 15.5 L1.5 12 Z" fill={`url(#${mid})`} />
        <path d="M12 12 L1.5 12 L8.5 8.5 Z" fill={`url(#${light})`} />
        {/* rim */}
        <path
          d="M12 1.5 L15.5 8.5 L22.5 12 L15.5 15.5 L12 22.5 L8.5 15.5 L1.5 12 L8.5 8.5 Z"
          fill="none"
          stroke="#B07006"
          strokeWidth="0.7"
        />
      </g>
      {/* glint on the lit side */}
      <path d="M9.4 5.6 L9.9 6.9 L11.2 7.4 L9.9 7.9 L9.4 9.2 L8.9 7.9 L7.6 7.4 L8.9 6.9 Z" fill="#FFFFFF" opacity="0.85" />
    </svg>
  );
}

/** An amount of credits: the star followed by the number, for balances, prices and history rows. */
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
