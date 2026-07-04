import { CalendarDays, Sparkles } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { SearchDialog } from "./SearchDialog";
import { UserMenu } from "./UserMenu";
import { StreakWidget } from "./StreakWidget";
import { NotificationBell } from "./NotificationBell";
import { Logo } from "./Logo";

interface TopBarProps {
  inApp?: boolean;
}

export function TopBar({ inApp }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-page">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:px-6">
        <div className={inApp ? "lg:hidden" : ""}>
          <Logo />
        </div>

        {!inApp && (
          <nav className="ml-4 hidden items-center gap-1 sm:flex">
            <Link
              href="/planner"
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-ink/70 transition-all duration-150 hover:bg-ink/5 hover:text-ink"
            >
              <CalendarDays size={14} /> Kunim
            </Link>
            <Link
              href="/ielts"
              className="inline-flex items-center gap-1.5 rounded-md bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent transition-all duration-150 hover:bg-accent/20"
            >
              <Sparkles size={14} /> IELTS Coach
            </Link>
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2">
          <StreakWidget />
          <SearchDialog />
          <NotificationBell />
          <UserMenu />
          {!inApp && <ThemeToggle />}
        </div>
      </div>
    </header>
  );
}
