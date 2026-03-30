import { Skeleton } from "@/components/ui/skeleton";

export default function TodayLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-40 mt-1" />
      </div>
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-12 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
