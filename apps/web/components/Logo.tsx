import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  href?: string;
}

const sizes = {
  sm: { box: 28, name: "text-[14px]" },
  md: { box: 32, name: "text-[15px]" },
  lg: { box: 40, name: "text-[17px]" },
};

/**
 * Wisar belgisi — "W" ko'tarilayotgan zig-zag sifatida: har cho'qqi
 * avvalgisidan baland, oxirgi zarba zumradda tepaga otiladi. Ya'ni harf
 * ham, o'sish chizig'i ham — noldan yuqoriga qadam-baqadam.
 *
 * Asosiy chiziqlar `currentColor` — tungi rejimda o'zi moslashadi.
 */
export function WisarMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Wisar"
    >
      <path
        d="M8 24.5 L15 35.5 L24 23 L31 31.5"
        stroke="currentColor"
        strokeWidth="5.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M31 31.5 L41 12.5"
        stroke="var(--accent)"
        strokeWidth="5.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ size = "md", showName = true, href = "/" }: LogoProps) {
  const s = sizes[size];
  return (
    <Link href={href} className="flex items-center gap-2.5 select-none group">
      <WisarMark
        size={s.box}
        className="flex-shrink-0 text-ink transition-transform duration-200 group-hover:scale-105"
      />
      {showName && (
        <span className={`${s.name} font-bold tracking-tight text-ink transition-colors duration-200`}>
          Wisar
        </span>
      )}
    </Link>
  );
}
