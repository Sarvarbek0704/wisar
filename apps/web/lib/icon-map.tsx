import {
  BookOpen,
  Wrench,
  FolderTree,
  Rocket,
  GraduationCap,
  Library,
  Languages,
  type LucideIcon,
} from "lucide-react";

// Mavzu/bo'lim uchun Lucide ikonka (DB'dagi "icon" nomi -> komponent)
const MAP: Record<string, LucideIcon> = {
  "book-open": BookOpen,
  wrench: Wrench,
  "folder-tree": FolderTree,
  rocket: Rocket,
  "graduation-cap": GraduationCap,
  library: Library,
  languages: Languages,
};

export function topicIcon(name: string | null | undefined): LucideIcon {
  return (name && MAP[name]) || BookOpen;
}
