import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="max-w-xl mx-auto space-y-8">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
    </div>
  );
}
