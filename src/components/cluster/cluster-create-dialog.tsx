"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface ClusterCreateDialogProps {
  trigger: React.ReactNode;
  onCreated?: (cluster: { id: string; name: string }) => void;
}

const ACCESS_OPTIONS = [
  { value: "public", label: "공개", icon: "🌐", desc: "누구나 볼 수 있고 가입 가능" },
  { value: "invite_only", label: "초대제", icon: "🔑", desc: "초대받은 사람만 가입 가능" },
  { value: "private", label: "비공개", icon: "🔒", desc: "멤버만 볼 수 있음" },
];

const AI_TYPE_OPTIONS = [
  { value: "professional", label: "전문 지식", icon: "🔬", desc: "AI가 질문+답변, 인간이 검증" },
  { value: "community", label: "커뮤니티", icon: "💬", desc: "AI가 질문, 인간만 답변" },
];

export function ClusterCreateDialog({ trigger, onCreated }: ClusterCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [accessType, setAccessType] = useState("public");
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiType, setAiType] = useState("community");
  const [aiHint, setAiHint] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/clusters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          accessType,
          aiQuestionEnabled: aiEnabled,
          aiQuestionType: aiType,
          aiPromptHint: aiHint.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "생성 실패");
        return;
      }

      const cluster = await res.json();
      setOpen(false);
      resetForm();
      onCreated?.(cluster);
    } catch {
      setError("네트워크 오류");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setAccessType("public");
    setAiEnabled(false);
    setAiType("community");
    setAiHint("");
    setError("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>새 클러스터 만들기</DialogTitle>
          <DialogDescription>
            주제별 커뮤니티를 만들어 Q&A를 모으세요
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">이름 *</label>
            <Input
              placeholder="예: 사출 성형 노하우"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">설명</label>
            <Textarea
              placeholder="이 클러스터에서 다루는 주제를 설명하세요"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={200}
            />
          </div>

          {/* Access Type */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">공개 범위</label>
            <div className="grid grid-cols-3 gap-2">
              {ACCESS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAccessType(opt.value)}
                  className={`p-2.5 rounded-lg border text-center transition-all ${
                    accessType === opt.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="text-lg">{opt.icon}</div>
                  <div className="text-xs font-medium mt-1">{opt.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Question Toggle */}
          <div className="rounded-lg border p-3 space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="text-sm font-medium">AI 자동 질문 생성</div>
                <div className="text-[11px] text-muted-foreground">AI가 주기적으로 질문을 올립니다</div>
              </div>
              <button
                onClick={() => setAiEnabled(!aiEnabled)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  aiEnabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  aiEnabled ? "translate-x-5" : "translate-x-0.5"
                }`} />
              </button>
            </label>

            {aiEnabled && (
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  {AI_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setAiType(opt.value)}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        aiType === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{opt.icon}</span>
                        <span className="text-xs font-medium">{opt.label}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
                <Input
                  placeholder="AI 질문 힌트 (선택) — 예: 유머러스하게"
                  value={aiHint}
                  onChange={(e) => setAiHint(e.target.value)}
                  maxLength={100}
                  className="text-xs h-8"
                />
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            만들기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
