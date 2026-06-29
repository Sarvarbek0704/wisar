import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-page px-4 py-24 text-center font-sans">
      <h1 className="text-6xl font-extrabold tracking-tight text-ink">404</h1>
      <p className="mt-3 text-lg text-soft">Sahifa topilmadi.</p>
      <Link
        href="/"
        className="mt-7 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 font-semibold text-white transition hover:opacity-90"
      >
        <Home size={18} />
        Bosh sahifa
      </Link>
    </div>
  );
}
