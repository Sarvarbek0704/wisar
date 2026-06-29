import {
  BookOpen, Briefcase, Target, Dumbbell, Coffee, Circle,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  BookOpen,
  Briefcase,
  Target,
  Dumbbell,
  Coffee,
  Circle,
};

export function CategoryIcon({ name, size = 14 }: { name: string; size?: number }) {
  const Icon = MAP[name] ?? Circle;
  return <Icon size={size} className="flex-shrink-0" />;
}
