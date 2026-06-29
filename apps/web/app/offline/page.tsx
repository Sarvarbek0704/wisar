import { WifiOff } from "lucide-react";

export const metadata = { title: "Oflayn" };

export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center font-sans">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-bg text-soft">
        <WifiOff size={30} />
      </div>
      <h1 className="mb-2 text-xl font-bold text-ink">Internetga ulanmagansiz</h1>
      <p className="text-soft">
        Bu sahifa hozircha keshda yo'q. Avval ochilgan maqolalarni oflayn o'qishingiz mumkin —
        ulanish tiklangach yana urinib ko'ring.
      </p>
    </div>
  );
}
