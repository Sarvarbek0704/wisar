"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** Internet uzilganda yumshoq banner (23-vazifa). */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[200] flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-white">
      <WifiOff size={13} />
      Oflayn rejim — faqat saqlangan sahifalar mavjud.
    </div>
  );
}
