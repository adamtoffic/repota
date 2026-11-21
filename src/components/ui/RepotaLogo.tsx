import { useId } from "react";

interface RepotaLogoProps {
  className?: string;
}

/**
 * Pure-vector Repota brand mark rendered inline to prevent SVG filter bitmap
 * rasterization blur on high-DPI mobile screens and browser zoom.
 */
export function RepotaLogo({ className = "h-full w-full" }: RepotaLogoProps) {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, "");

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="none"
      role="img"
      aria-label="Repota"
      className={className}
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2549B0" />
          <stop offset="52%" stopColor="#1E3A8A" />
          <stop offset="100%" stopColor="#112257" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.20" />
          <stop offset="100%" stopColor="#93C5FD" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="50%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id={`${uid}-paper`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F8FAFC" />
        </linearGradient>
        <linearGradient id={`${uid}-fold`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#93C5FD" />
          <stop offset="100%" stopColor="#DBEAFE" />
        </linearGradient>
      </defs>

      <rect width="512" height="512" fill={`url(#${uid}-bg)`} />
      <circle cx="140" cy="110" r="320" fill={`url(#${uid}-glow)`} />

      <g transform="translate(2 10) rotate(10.5 267 253)">
        <rect x="172" y="132" width="190" height="242" rx="28" fill="#050C22" opacity="0.22" />
      </g>
      <g transform="rotate(10.5 267 253)">
        <rect x="172" y="132" width="190" height="242" rx="28" fill={`url(#${uid}-gold)`} />
      </g>
      <path
        fill="#091229"
        opacity="0.20"
        d="M 168 142 H 290 L 336 188 V 358 A 28 28 0 0 1 308 386 H 168 A 28 28 0 0 1 140 358 V 170 A 28 28 0 0 1 168 142 Z"
      />
      <path
        fill={`url(#${uid}-paper)`}
        d="M 160 134 H 282 L 328 180 V 350 A 28 28 0 0 1 300 378 H 160 A 28 28 0 0 1 132 350 V 162 A 28 28 0 0 1 160 134 Z"
      />
      <path fill="#1E3A8A" opacity="0.10" d="M 280 137 V 171 A 12 12 0 0 0 292 183 H 326 Z" />
      <path fill={`url(#${uid}-fold)`} d="M 282 134 V 168 A 12 12 0 0 0 294 180 H 328 Z" />
      <rect x="162" y="166" width="96" height="22" rx="11" fill="#1E3A8A" />
      <rect x="162" y="200" width="66" height="14" rx="7" fill="#94A3B8" />
      <rect x="162" y="300" width="34" height="46" rx="11" fill="#BFDBFE" />
      <rect x="213" y="274" width="34" height="72" rx="11" fill="#3B82F6" />
      <rect x="264" y="240" width="34" height="106" rx="11" fill="#1E3A8A" />
    </svg>
  );
}
