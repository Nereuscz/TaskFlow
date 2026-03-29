import { TaskPriority } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const priorityConfig: Record<TaskPriority, { label: string; className: string }> = {
  NONE: { label: "None", className: "bg-muted text-muted-foreground" },
  LOW: { label: "Low", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  MEDIUM: { label: "Medium", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  HIGH: { label: "High", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  URGENT: { label: "Urgent", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const config = priorityConfig[priority];
  return (
    <Badge variant="outline" className={cn("text-xs font-medium border-0", config.className)}>
      {config.label}
    </Badge>
  );
}
