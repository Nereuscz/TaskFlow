import { Skeleton } from "@/components/ui/skeleton";

export default function TasksLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-20 mt-1" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-8 flex-1 rounded-lg" />
        <Skeleton className="h-7 w-20 rounded-lg" />
        <Skeleton className="h-7 w-16 rounded-lg" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
