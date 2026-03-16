"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send } from "lucide-react";
import type { QASetWithMessages } from "@/types/qa-set";

interface ReviewGuideProps {
  qaSet: QASetWithMessages;
  isOwner: boolean;
  onInvest: () => void;
  onCounterInvest: () => void;
  onShareQA: () => void;
  onOpinionSubmitted: () => void;
  onAskFollowUp: (question: string) => void;
}

const OPINION_RELATIONS = [
  { value: "evidence", label: "근거 보충", icon: "📎" },
  { value: "counterargument", label: "반박", icon: "⚡" },
  { value: "application", label: "경험 공유", icon: "💡" },
  { value: "extension", label: "확장", icon: "➕" },
];

export function ReviewGuide({
  qaSet,
  isOwner,
  onInvest,
  onCounterInvest,
  onShareQA,
  onOpinionSubmitted,
  onAskFollowUp,
}: ReviewGuideProps) {
  const [opinionText, setOpinionText] = useState("");
  const [opinionRelation, setOpinionRelation] = useState("evidence");
  const [submittingOpinion, setSubmittingOpinion] = useState(false);
  const [opinionDone, setOpinionDone] = useState(false);
  const [followUpText, setFollowUpText] = useState("");

  const investorCount = qaSet.investorCount ?? 0;
  const totalInvested = qaSet.totalInvested ?? 0;
  const negativeCount = qaSet.negativeCount ?? 0;

  const handleSubmitOpinion = useCallback(async () => {
    if (!opinionText.trim() || submittingOpinion) return;
    setSubmittingOpinion(true);
    try {
      const opRes = await fetch("/api/opinions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: opinionText.trim() }),
      });
      if (!opRes.ok) throw new Error("fail");
      const opinion = await opRes.json();
      await fetch("/api/relations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceOpinionId: opinion.id,
          targetQASetId: qaSet.id,
          relationType: opinionRelation,
        }),
      });
      setOpinionDone(true);
      setOpinionText("");
      onOpinionSubmitted();
    } catch (err) {
      console.error("Opinion submit error:", err);
    } finally {
      setSubmittingOpinion(false);
    }
  }, [opinionText, opinionRelation, qaSet.id, submittingOpinion, onOpinionSubmitted]);

  const handleSendFollowUp = () => {
    if (!followUpText.trim()) return;
    onAskFollowUp(followUpText.trim());
    setFollowUpText("");
  };

  // ━━━ 시나리오 A: 본인 QA, 미공유 ━━━
  if (isOwner && !qaSet.isShared) {
    return (
      <div className="border-t bg-muted/10">
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
          <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 space-y-2">
            <p className="text-sm font-medium">이 Q&A가 도움이 됐다면 공유해보세요</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              공유하면 다른 사람이 이 답변을 참고할 수 있고,
              투자를 받으면 포인트 수익이 돌아옵니다.
            </p>
            <Button size="sm" onClick={onShareQA} className="gap-1.5">
              공유하기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ━━━ 시나리오 B: 타인 공유 QA (또는 본인 공유 후) ━━━
  return (
    <div className="border-t bg-muted/10">
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">

        {/* ── 1. 투자 / 반대 투자 ── */}
        {!isOwner && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border p-3.5 space-y-2 hover:border-green-300 transition-colors">
              <p className="text-sm font-medium">이 답변이 정확하고 유용하다면</p>
              <p className="text-xs text-muted-foreground">
                일찍 투자할수록 후속 투자자 보상의 더 많은 몫을 받습니다
                {investorCount > 0 && (
                  <span className="ml-1">· 현재 {investorCount}명 {totalInvested}P</span>
                )}
              </p>
              <Button size="sm" className="w-full gap-1.5" onClick={onInvest}>
                💰 투자하기
              </Button>
            </div>

            <div className="rounded-xl border p-3.5 space-y-2 hover:border-red-300 transition-colors">
              <p className="text-sm font-medium">틀리거나 오래된 정보가 있다면</p>
              <p className="text-xs text-muted-foreground">
                근거와 함께 반대 투자하면 동의자가 늘 때 보상을 받습니다
                {negativeCount > 0 && (
                  <span className="ml-1">· 현재 {negativeCount}명</span>
                )}
              </p>
              <Button size="sm" variant="outline" className="w-full gap-1.5 text-red-600 border-red-200 hover:bg-red-50" onClick={onCounterInvest}>
                📉 반대 투자
              </Button>
            </div>
          </div>
        )}

        {/* ── 2. 의견 추가 ── */}
        <div className="rounded-xl border p-3.5 space-y-2.5">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">보충할 경험이나 다른 관점이 있다면</p>
            {opinionDone && (
              <Badge variant="outline" className="text-[10px] border-green-300 text-green-600">등록됨 ✓</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            의견은 지식 지도에 별도 노드로 이 Q&A와 연결됩니다
          </p>

          {/* 관계 유형 */}
          <div className="flex gap-1.5">
            {OPINION_RELATIONS.map((rel) => (
              <button
                key={rel.value}
                onClick={() => setOpinionRelation(rel.value)}
                className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                  opinionRelation === rel.value
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {rel.icon} {rel.label}
              </button>
            ))}
          </div>

          {/* 입력 + 등록 */}
          <div className="flex gap-2">
            <Textarea
              placeholder="의견을 작성하세요..."
              value={opinionText}
              onChange={(e) => setOpinionText(e.target.value.slice(0, 1000))}
              className="min-h-[48px] text-sm resize-none flex-1"
              rows={2}
            />
            <Button
              size="sm"
              disabled={!opinionText.trim() || submittingOpinion}
              onClick={handleSubmitOpinion}
              className="self-end shrink-0 gap-1"
            >
              {submittingOpinion ? <Loader2 className="h-3 w-3 animate-spin" /> : "✍️"} 의견 등록
            </Button>
          </div>
        </div>

        {/* ── 3. 추가 질문 ── */}
        <div className="rounded-xl border p-3.5 space-y-2">
          <p className="text-sm font-medium">이 주제에서 더 알고 싶다면</p>
          <p className="text-xs text-muted-foreground">
            이 Q&A를 기반으로 AI에게 연쇄 질문합니다. 내 대화로 자동 생성됩니다.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="추가 질문을 입력하세요..."
              value={followUpText}
              onChange={(e) => setFollowUpText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendFollowUp();
                }
              }}
              className="flex-1 h-9 px-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button
              size="sm"
              disabled={!followUpText.trim()}
              onClick={handleSendFollowUp}
              className="shrink-0 gap-1"
            >
              <Send className="h-3.5 w-3.5" /> 질문하기
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
