import { Skeleton } from "@/components/ui/skeleton";

export default function TimerLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}
