"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, ChevronRight } from "lucide-react";
import type { QASetWithMessages } from "@/types/qa-set";

interface ReviewGuideProps {
  qaSet: QASetWithMessages;
  isOwner: boolean;
  userId?: string;
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

// ─── Progress Stepper ───
function JourneyStepper({ step }: { step: number }) {
  const steps = [
    { label: "질문", icon: "?" },
    { label: "답변", icon: "A" },
    { label: "공유", icon: "📢" },
    { label: "투자", icon: "💰" },
    { label: "지식맵", icon: "🗺" },
  ];

  return (
    <div className="flex items-center gap-0.5 px-1">
      {steps.map((s, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <div key={s.label} className="flex items-center">
            <div
              className={`
                flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all
                ${done
                  ? "bg-primary/15 text-primary"
                  : current
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25 animate-pulse"
                    : "bg-muted/50 text-muted-foreground/50"
                }
              `}
            >
              <span className="text-xs">{done ? "✓" : s.icon}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight className={`h-3 w-3 mx-0.5 ${i < step ? "text-primary/40" : "text-muted-foreground/20"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Stats Display ───
function InvestStats({
  investorCount,
  totalInvested,
  negativeCount,
  negativeInvested,
}: {
  investorCount: number;
  totalInvested: number;
  negativeCount: number;
  negativeInvested: number;
}) {
  if (investorCount === 0 && negativeCount === 0) return null;
  return (
    <div className="flex items-center gap-3 text-xs">
      {investorCount > 0 && (
        <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full font-medium">
          <span className="text-sm">💰</span>
          <span className="text-base font-bold tabular-nums">{totalInvested}</span>
          <span>P · {investorCount}명</span>
        </div>
      )}
      {negativeCount > 0 && (
        <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 px-2.5 py-1 rounded-full font-medium">
          <span className="text-sm">📉</span>
          <span className="text-base font-bold tabular-nums">{negativeInvested}</span>
          <span>P · {negativeCount}명</span>
        </div>
      )}
    </div>
  );
}

export function ReviewGuide({
  qaSet,
  isOwner,
  userId,
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
  const [expandOpinion, setExpandOpinion] = useState(false);

  const investorCount = qaSet.investorCount ?? 0;
  const totalInvested = qaSet.totalInvested ?? 0;
  const negativeCount = qaSet.negativeCount ?? 0;
  const negativeInvested = qaSet.negativeInvested ?? 0;
  const myInvestment = (qaSet.investments ?? []).find(
    (inv) => inv.userId === userId && !inv.isNegative
  );

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
      setExpandOpinion(false);
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

  // ─── Journey step 계산 ───
  const journeyStep = !qaSet.isShared ? 2 : !myInvestment && isOwner ? 3 : investorCount > 0 ? 4 : 3;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 시나리오 A: 본인 QA, 미공유
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (isOwner && !qaSet.isShared) {
    return (
      <div className="mt-6 mb-2">
        <div className="max-w-3xl mx-auto space-y-3">
          {/* Progress */}
          <JourneyStepper step={2} />

          {/* Hero: 공유 유도 */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-blue-500/5 p-5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📢</span>
                <h3 className="text-base font-semibold">이 Q&A를 공유하면 수익이 시작됩니다</h3>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-background/60 rounded-lg py-2 px-1">
                  <div className="text-lg font-bold text-primary">공유</div>
                  <div className="text-[10px] text-muted-foreground">지식 공개</div>
                </div>
                <div className="bg-background/60 rounded-lg py-2 px-1">
                  <div className="text-lg font-bold text-green-600">투자</div>
                  <div className="text-[10px] text-muted-foreground">신뢰 검증</div>
                </div>
                <div className="bg-background/60 rounded-lg py-2 px-1">
                  <div className="text-lg font-bold text-amber-600">보상</div>
                  <div className="text-[10px] text-muted-foreground">포인트 수익</div>
                </div>
              </div>
              <Button onClick={onShareQA} className="w-full gap-2 h-10 text-sm font-medium shadow-sm">
                📢 공유하고 투자 받기
              </Button>
            </div>
          </div>

          {/* 보조 행동: 추가 질문 (공유 전에도 대화 계속 가능) */}
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="추가로 궁금한 게 있다면..."
              value={followUpText}
              onChange={(e) => setFollowUpText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendFollowUp();
                }
              }}
              className="flex-1 h-9 px-3 text-sm rounded-lg border bg-background/80 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button size="sm" variant="ghost" disabled={!followUpText.trim()} onClick={handleSendFollowUp} className="shrink-0 gap-1">
              <Send className="h-3.5 w-3.5" /> 질문
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 시나리오 B: 공유된 QA (본인 또는 타인)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div className="mt-6 mb-2">
      <div className="max-w-3xl mx-auto space-y-3">
        {/* Progress */}
        <JourneyStepper step={journeyStep} />

        {/* 투자 현황 바 (있을 때만) */}
        <InvestStats
          investorCount={investorCount}
          totalInvested={totalInvested}
          negativeCount={negativeCount}
          negativeInvested={negativeInvested}
        />

        {/* ── 주요 행동: 투자 ── */}
        {isOwner ? (
          /* 본인: 자기 투자 (1회) 또는 현황 */
          !myInvestment ? (
            <div className="relative overflow-hidden rounded-2xl border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-5">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-200/20 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💰</span>
                  <div>
                    <h3 className="text-base font-semibold">작성자 투자로 신뢰를 보여주세요</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      직접 포인트를 거는 작성자의 Q&A는 다른 사람의 투자를 더 많이 유도합니다
                    </p>
                  </div>
                </div>
                <Button onClick={onInvest} className="w-full gap-2 h-10 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white shadow-sm">
                  💰 내 Q&A에 투자하기
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20 p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✅</span>
                  <span className="text-sm font-medium">내 투자: {myInvestment.amount}P</span>
                </div>
                {investorCount > 1 && (
                  <span className="text-xs text-muted-foreground">
                    + {investorCount - 1}명이 추가 투자
                  </span>
                )}
              </div>
            </div>
          )
        ) : (
          /* 타인: 투자 / 반대투자 */
          <div className="grid grid-cols-2 gap-3">
            {/* 투자 */}
            <div className="relative overflow-hidden rounded-2xl border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-4 space-y-2 group hover:shadow-md hover:shadow-green-100 dark:hover:shadow-green-950/20 transition-all">
              <div className="absolute -bottom-4 -right-4 text-6xl opacity-10 group-hover:opacity-20 transition-opacity">💰</div>
              <div className="relative">
                <h3 className="text-sm font-semibold">정확하고 유용하다면</h3>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  {investorCount === 0
                    ? "첫 번째 투자자가 되세요 — 초기 투자자일수록 보상이 큽니다"
                    : `${investorCount}명이 신뢰함 · 일찍 투자할수록 더 많은 보상`
                  }
                </p>
                <Button size="sm" className="w-full gap-1.5 mt-2.5 bg-green-600 hover:bg-green-700 text-white shadow-sm" onClick={onInvest}>
                  💰 투자하기
                </Button>
              </div>
            </div>

            {/* 반대 투자 */}
            <div className="relative overflow-hidden rounded-2xl border border-red-200 dark:border-red-900 bg-gradient-to-br from-red-50/50 to-orange-50/50 dark:from-red-950/20 dark:to-orange-950/20 p-4 space-y-2 group hover:shadow-md hover:shadow-red-100 dark:hover:shadow-red-950/20 transition-all">
              <div className="absolute -bottom-4 -right-4 text-6xl opacity-10 group-hover:opacity-20 transition-opacity">📉</div>
              <div className="relative">
                <h3 className="text-sm font-semibold">틀리거나 오래된 정보라면</h3>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  근거와 함께 반대 투자 — 동의자가 늘면 보상을 받습니다
                  {negativeCount > 0 && <span className="font-medium"> · 현재 {negativeCount}명 동의</span>}
                </p>
                <Button size="sm" variant="outline" className="w-full gap-1.5 mt-2.5 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={onCounterInvest}>
                  📉 반대 투자
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── 보조 행동: 의견 + 추가질문 (컴팩트 가로 배치) ── */}
        <div className="grid grid-cols-2 gap-3">
          {/* 의견 추가 */}
          <div
            className={`rounded-xl border p-3 transition-all cursor-pointer hover:border-primary/30 ${
              expandOpinion ? "col-span-2 bg-muted/5" : ""
            }`}
            onClick={() => !expandOpinion && setExpandOpinion(true)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">✍️</span>
                <span className="text-sm font-medium">내 의견 추가</span>
              </div>
              {opinionDone && (
                <Badge variant="outline" className="text-[10px] border-green-300 text-green-600">등록됨 ✓</Badge>
              )}
            </div>
            {!expandOpinion && (
              <p className="text-[11px] text-muted-foreground mt-1">
                경험, 반박, 보충 근거를 지식맵에 연결
              </p>
            )}

            {expandOpinion && (
              <div className="mt-3 space-y-2.5" onClick={(e) => e.stopPropagation()}>
                <div className="flex gap-1.5 flex-wrap">
                  {OPINION_RELATIONS.map((rel) => (
                    <button
                      key={rel.value}
                      onClick={() => setOpinionRelation(rel.value)}
                      className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                        opinionRelation === rel.value
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {rel.icon} {rel.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="의견을 작성하세요..."
                    value={opinionText}
                    onChange={(e) => setOpinionText(e.target.value.slice(0, 1000))}
                    className="min-h-[48px] text-sm resize-none flex-1"
                    rows={2}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    disabled={!opinionText.trim() || submittingOpinion}
                    onClick={handleSubmitOpinion}
                    className="self-end shrink-0 gap-1"
                  >
                    {submittingOpinion ? <Loader2 className="h-3 w-3 animate-spin" /> : "✍️"} 등록
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 추가 질문 */}
          {!expandOpinion && (
            <div className="rounded-xl border p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">🔗</span>
                <span className="text-sm font-medium">연쇄 질문</span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-2">
                이 Q&A를 기반으로 AI에게 더 물어보기
              </p>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="궁금한 점..."
                  value={followUpText}
                  onChange={(e) => setFollowUpText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendFollowUp();
                    }
                  }}
                  className="flex-1 h-8 px-2.5 text-xs rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button size="sm" disabled={!followUpText.trim()} onClick={handleSendFollowUp} className="shrink-0 h-8 px-2.5 gap-1 text-xs">
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 의견 펼쳤을 때 추가 질문은 아래로 */}
        {expandOpinion && (
          <div className="rounded-xl border p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">🔗</span>
              <span className="text-sm font-medium">연쇄 질문</span>
              <span className="text-[11px] text-muted-foreground">— 이 Q&A를 기반으로 AI에게 더 물어보기</span>
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="궁금한 점을 입력하세요..."
                value={followUpText}
                onChange={(e) => setFollowUpText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendFollowUp();
                  }
                }}
                className="flex-1 h-8 px-2.5 text-xs rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <Button size="sm" disabled={!followUpText.trim()} onClick={handleSendFollowUp} className="shrink-0 h-8 px-2.5 gap-1 text-xs">
                <Send className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
