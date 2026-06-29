import Image from "next/image";
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

export function Logo({ size = "md", showName = true, href = "/" }: LogoProps) {
  const s = sizes[size];
  return (
    <Link href={href} className="flex items-center gap-2.5 select-none group">
      <span
        className="inline-flex flex-shrink-0 items-center justify-center rounded-lg bg-white transition-all duration-200 group-hover:scale-105 overflow-hidden"
        style={{ width: s.box, height: s.box }}
      >
        <Image
          src="/logo.png"
          alt="Wisar"
          width={s.box}
          height={s.box}
          className="object-contain"
          priority
        />
      </span>
      {showName && (
        <span className={`${s.name} font-bold tracking-tight text-ink transition-colors duration-200`}>
          Wisar
        </span>
      )}
    </Link>
  );
}
