"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { X, CheckCheck, AlertTriangle, Users, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "DONE", label: "Done" },
  { value: "CANCELLED", label: "Cancelled" },
];

const PRIORITY_OPTIONS = [
  { value: "URGENT", label: "Urgent" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
  { value: "NONE", label: "None" },
];

interface BulkActionBarProps {
  selectedIds: Set<string>;
  projectId: string;
  onClear: () => void;
}

export function BulkActionBar({ selectedIds, projectId, onClear }: BulkActionBarProps) {
  const queryClient = useQueryClient();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archivePending, setArchivePending] = useState(false);
  const count = selectedIds.size;

  async function applyBulk(data: Record<string, unknown>) {
    const res = await fetch("/api/tasks/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskIds: [...selectedIds], data }),
    });
    if (!res.ok) {
      toast.error("Failed to update tasks");
      return;
    }
    toast.success(`Updated ${count} task${count !== 1 ? "s" : ""}`);
    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    onClear();
  }

  async function archiveTasks() {
    setArchivePending(true);
    try {
      const res = await fetch("/api/tasks/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds: [...selectedIds] }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Archived ${count} task${count !== 1 ? "s" : ""}`);
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      onClear();
    } catch {
      toast.error("Failed to archive tasks");
    } finally {
      setArchivePending(false);
      setArchiveOpen(false);
    }
  }

  return (
    <>
      <div
        className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-card border border-border shadow-xl rounded-2xl px-4 py-2.5 transition-all duration-200",
          count > 0 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        {/* Count */}
        <div className="flex items-center gap-2 pr-3 border-r border-border/50">
          <CheckCheck className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{count} selected</span>
        </div>

        {/* Set Status */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Status:</span>
          <select
            className="text-xs rounded-lg border border-border/60 bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/50"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                applyBulk({ status: e.target.value });
                e.target.value = "";
              }
            }}
          >
            <option value="" disabled>Set…</option>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Set Priority */}
        <div className="flex items-center gap-1">
          <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            className="text-xs rounded-lg border border-border/60 bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/50"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                applyBulk({ priority: e.target.value });
                e.target.value = "";
              }
            }}
          >
            <option value="" disabled>Priority…</option>
            {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Archive */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={() => setArchiveOpen(true)}
        >
          <Archive className="h-3.5 w-3.5" />
          Archive
        </Button>

        {/* Clear */}
        <button
          onClick={onClear}
          className="ml-1 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <AlertDialog
        open={archiveOpen}
        onOpenChange={(open) => { if (!open) setArchiveOpen(false); }}
        title={`Archive ${count} task${count !== 1 ? "s" : ""}?`}
        description="Archived tasks are hidden from all views but not permanently deleted."
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={archiveTasks}
        loading={archivePending}
      />
    </>
  );
}
