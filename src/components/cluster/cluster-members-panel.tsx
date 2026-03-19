"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface Member {
  id: string;
  role: string;
  joinedAt: string;
  user: { id: string; name: string | null; image: string | null };
}

interface ClusterMembersPanelProps {
  clusterId: string;
  isAdmin: boolean;
  onClose?: () => void;
}

export function ClusterMembersPanel({ clusterId, isAdmin, onClose }: ClusterMembersPanelProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteInput, setInviteInput] = useState("");
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState("");

  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/clusters/${clusterId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [clusterId]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const handleInvite = async () => {
    if (!inviteInput.trim() || inviting) return;
    setInviting(true);
    setMessage("");

    try {
      // Search user by name
      const searchRes = await fetch(`/api/profile/${encodeURIComponent(inviteInput.trim())}`);
      if (!searchRes.ok) {
        setMessage("사용자를 찾을 수 없습니다");
        return;
      }
      const userData = await searchRes.json();
      const userId = userData.user?.id;
      if (!userId) {
        setMessage("사용자를 찾을 수 없습니다");
        return;
      }

      const res = await fetch(`/api/clusters/${clusterId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        setMessage("초대 완료!");
        setInviteInput("");
        loadMembers();
      } else {
        const data = await res.json();
        setMessage(data.error ?? "초대 실패");
      }
    } catch {
      setMessage("네트워크 오류");
    } finally {
      setInviting(false);
    }
  };

  const handleLeave = async () => {
    const res = await fetch(`/api/clusters/${clusterId}/leave`, { method: "POST" });
    if (res.ok) {
      loadMembers();
      onClose?.();
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">멤버 ({members.length}명)</h3>
        {!isAdmin && (
          <Button size="sm" variant="outline" onClick={handleLeave} className="text-xs text-red-600 border-red-300 hover:bg-red-50">
            탈퇴
          </Button>
        )}
      </div>

      {/* Invite (admin only) */}
      {isAdmin && (
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <Input
              placeholder="사용자 이름으로 초대..."
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
              className="h-8 text-xs"
            />
            <Button size="sm" onClick={handleInvite} disabled={!inviteInput.trim() || inviting} className="shrink-0 h-8 text-xs">
              {inviting ? <Loader2 className="h-3 w-3 animate-spin" /> : "초대"}
            </Button>
          </div>
          {message && (
            <p className={`text-[11px] ${message.includes("완료") ? "text-green-600" : "text-destructive"}`}>
              {message}
            </p>
          )}
        </div>
      )}

      {/* Member list */}
      <div className="space-y-1">
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                {(m.user.name ?? "?")[0]}
              </div>
              <span className="text-sm">{m.user.name ?? "익명"}</span>
            </div>
            <Badge
              variant={m.role === "admin" ? "default" : "secondary"}
              className="text-[10px] h-5"
            >
              {m.role === "admin" ? "관리자" : "멤버"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
