export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={"animate-pulse rounded-lg bg-line/60 " + className}
      aria-hidden="true"
    />
  );
}

// Kartalar uchun yuklanish skeleti
export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-line bg-page p-5">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="mt-3 h-2.5 w-full" />
          <Skeleton className="mt-2 h-2.5 w-2/3" />
        </div>
      ))}
    </div>
  );
}
