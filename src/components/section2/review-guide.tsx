"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, ChevronDown } from "lucide-react";
import type { QASetWithMessages } from "@/types/qa-set";

interface ReviewSummary {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  investReason: string;
  counterReason: string;
  opinionPrompt: string;
  questionPrompt: string;
}

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
  { value: "clarification", label: "명확화", icon: "🔍" },
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
  // AI review (async bonus — NOT blocking)
  const [review, setReview] = useState<ReviewSummary | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Opinion state
  const [opinionText, setOpinionText] = useState("");
  const [opinionRelation, setOpinionRelation] = useState("evidence");
  const [submittingOpinion, setSubmittingOpinion] = useState(false);
  const [opinionDone, setOpinionDone] = useState(false);

  // Follow-up question state
  const [followUpText, setFollowUpText] = useState("");

  // Info toggles
  const [showInvestInfo, setShowInvestInfo] = useState(false);
  const [showCounterInfo, setShowCounterInfo] = useState(false);

  const investorCount = qaSet.investorCount ?? 0;
  const totalInvested = qaSet.totalInvested ?? 0;
  const negativeCount = qaSet.negativeCount ?? 0;

  // Async fetch AI review (non-blocking)
  useEffect(() => {
    if (!qaSet.id) return;
    let cancelled = false;
    setReview(null);
    setReviewLoading(true);
    setOpinionDone(false);

    fetch("/api/review-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qaSetId: qaSet.id }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d && !d.error) setReview(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setReviewLoading(false); });

    return () => { cancelled = true; };
  }, [qaSet.id]);

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

  return (
    <div className="border-t bg-gradient-to-b from-muted/30 to-transparent">
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">

        {/* ── AI 요약 (비동기 로딩, 없어도 아래 카드는 다 보임) ── */}
        {reviewLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>AI가 이 Q&A를 분석하고 있습니다...</span>
          </div>
        )}
        {review && (
          <div className="rounded-lg border bg-card/50 p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">🤖</span>
              <span className="text-[11px] font-medium text-muted-foreground">AI 분석</span>
            </div>
            <p className="text-sm leading-relaxed">{review.summary}</p>
            <div className="flex flex-wrap gap-1.5">
              {review.strengths.map((s, i) => (
                <Badge key={`s-${i}`} variant="outline" className="text-[10px] border-green-300 text-green-700 dark:text-green-400 bg-green-50/50 dark:bg-green-950/20">
                  ✓ {s}
                </Badge>
              ))}
              {review.weaknesses.map((w, i) => (
                <Badge key={`w-${i}`} variant="outline" className="text-[10px] border-amber-300 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20">
                  ⚠ {w}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* ━━━ 행동 카드: 즉시 렌더링 (AI 응답과 무관) ━━━ */}

        {/* ── 1. 투자 / 반대 투자 (타인 QA) ── */}
        {!isOwner && qaSet.isShared && (
          <div className="grid grid-cols-2 gap-2">
            {/* 투자 */}
            <div className="rounded-lg border bg-card p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-base">💰</span>
                <span className="text-sm font-medium">도움이 됐다면</span>
              </div>
              <Button size="sm" className="w-full" onClick={onInvest}>
                투자하기
              </Button>
              <button
                onClick={() => setShowInvestInfo((v) => !v)}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
              >
                투자하면 어떻게 되나요?
                <ChevronDown className={`h-3 w-3 transition-transform ${showInvestInfo ? "rotate-180" : ""}`} />
              </button>
              {showInvestInfo && (
                <div className="text-[11px] text-muted-foreground space-y-1 pt-1 border-t">
                  {review?.investReason && <p>{review.investReason}</p>}
                  <p>현재 {investorCount}명이 총 {totalInvested}P 투자 중</p>
                  <p>일찍 투자할수록 후속 투자자 보상 중 더 많은 몫을 받습니다</p>
                </div>
              )}
            </div>

            {/* 반대 투자 */}
            <div className="rounded-lg border bg-card p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-base">📉</span>
                <span className="text-sm font-medium">문제가 있다면</span>
              </div>
              <Button size="sm" variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50" onClick={onCounterInvest}>
                반대 투자
              </Button>
              <button
                onClick={() => setShowCounterInfo((v) => !v)}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
              >
                반대 투자란?
                <ChevronDown className={`h-3 w-3 transition-transform ${showCounterInfo ? "rotate-180" : ""}`} />
              </button>
              {showCounterInfo && (
                <div className="text-[11px] text-muted-foreground space-y-1 pt-1 border-t">
                  {review?.counterReason && <p>{review.counterReason}</p>}
                  <p>현재 {negativeCount}명이 반대 투자 중</p>
                  <p>구체적 근거와 함께 반대 투자하면, 동의하는 사람이 늘 때 보상을 받습니다</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 2. 공유 유도 (본인 QA, 미공유) ── */}
        {isOwner && !qaSet.isShared && (
          <div className="rounded-lg border bg-card p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">이 Q&A를 공유하면 다른 사람이 투자하고 의견을 남길 수 있습니다</p>
              <p className="text-xs text-muted-foreground mt-0.5">투자를 받으면 포인트 수익이 돌아옵니다</p>
            </div>
            <Button size="sm" className="shrink-0" onClick={onShareQA}>공유하기</Button>
          </div>
        )}

        {/* ── 3. 의견 추가 (항상 보임, 입력 바로 노출) ── */}
        <div className="rounded-lg border bg-card p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-base">✍️</span>
            <span className="text-sm font-medium">보충 의견이 있다면</span>
            {opinionDone && (
              <Badge variant="outline" className="text-[10px] border-green-300 text-green-600">등록됨 ✓</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {review?.opinionPrompt
              ? review.opinionPrompt
              : "경험, 반론, 추가 근거 등을 남기면 지식 지도에 별도 노드로 연결됩니다."}
          </p>

          {/* Relation type chips */}
          <div className="flex flex-wrap gap-1">
            {OPINION_RELATIONS.map((rel) => (
              <button
                key={rel.value}
                onClick={() => setOpinionRelation(rel.value)}
                className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                  opinionRelation === rel.value
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {rel.icon} {rel.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <Textarea
              placeholder="이 Q&A에 대한 의견을 작성하세요..."
              value={opinionText}
              onChange={(e) => setOpinionText(e.target.value.slice(0, 1000))}
              className="min-h-[56px] text-sm resize-none flex-1"
              rows={2}
            />
            <Button
              size="sm"
              disabled={!opinionText.trim() || submittingOpinion}
              onClick={handleSubmitOpinion}
              className="self-end shrink-0"
            >
              {submittingOpinion ? <Loader2 className="h-4 w-4 animate-spin" /> : "등록"}
            </Button>
          </div>
        </div>

        {/* ── 4. 추가 질문 (항상 보임, 입력 바로 노출) ── */}
        <div className="rounded-lg border bg-card p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-base">💬</span>
            <span className="text-sm font-medium">추가 질문이 있다면</span>
          </div>

          {/* AI suggested question (async bonus) */}
          {review?.questionPrompt && (
            <button
              onClick={() => setFollowUpText(review.questionPrompt)}
              className="w-full text-left text-xs px-3 py-2 rounded-md border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
            >
              <span className="text-muted-foreground">AI 추천:</span>{" "}
              <span className="text-primary font-medium">{review.questionPrompt}</span>
            </button>
          )}

          {/* Input */}
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
              className="flex-1 h-10 px-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button
              size="sm"
              disabled={!followUpText.trim()}
              onClick={handleSendFollowUp}
              className="shrink-0 gap-1"
            >
              <Send className="h-3.5 w-3.5" /> 질문
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            이 Q&A를 기반으로 AI에게 연쇄 질문합니다. 내 대화로 자동 생성됩니다.
          </p>
        </div>

      </div>
    </div>
  );
}
