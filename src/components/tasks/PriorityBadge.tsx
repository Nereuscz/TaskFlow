import { TaskPriority } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const priorityConfig: Record<TaskPriority, { label: string; className: string }> = {
  NONE: { label: "None", className: "bg-stone-100 text-stone-500" },
  LOW: { label: "Low", className: "bg-sky-50 text-sky-700" },
  MEDIUM: { label: "Medium", className: "bg-amber-50 text-amber-700" },
  HIGH: { label: "High", className: "bg-orange-50 text-orange-700" },
  URGENT: { label: "Urgent", className: "bg-red-50 text-red-700" },
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const config = priorityConfig[priority];
  return (
    <Badge variant="outline" className={cn("text-xs font-medium border-0", config.className)}>
      {config.label}
    </Badge>
  );
}
