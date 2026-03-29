"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

type Member = {
  id: string;
  role: string;
  joinedAt: string;
  user: { id: string; name: string | null; email: string; image: string | null };
};

export default function MembersPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");

  const { data: members, isLoading } = useQuery<Member[]>({
    queryKey: ["members"],
    queryFn: async () => {
      const res = await fetch("/api/workspace/members");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isOwner = session?.user.role === "OWNER";

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <h1 className="text-2xl font-semibold">Team members</h1>

      {/* Invite */}
      {isOwner && (
        <div className="border rounded-xl p-6 bg-card space-y-4">
          <h2 className="text-sm font-medium">Invite a member</h2>
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && inviteMutation.mutate(inviteEmail)}
              />
            </div>
          </div>
          <Button
            onClick={() => inviteMutation.mutate(inviteEmail)}
            disabled={!inviteEmail || inviteMutation.isPending}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {inviteMutation.isPending ? "Sending…" : "Send invite"}
          </Button>
        </div>
      )}

      {/* Members list */}
      <div className="border rounded-xl divide-y bg-card">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))
        ) : (
          members?.map((member) => (
            <div key={member.id} className="flex items-center gap-3 p-4">
              <Avatar className="h-9 w-9">
                <AvatarImage src={member.user.image ?? undefined} />
                <AvatarFallback>
                  {member.user.name?.[0] ?? member.user.email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {member.user.name ?? member.user.email}
                </p>
                <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
              </div>
              <Badge variant="outline" className="text-xs capitalize shrink-0">
                {member.role.toLowerCase()}
              </Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
