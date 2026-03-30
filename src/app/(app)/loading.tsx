import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
