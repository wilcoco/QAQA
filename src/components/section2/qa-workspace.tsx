"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { QASetWithMessages } from "@/types/qa-set";
import { MessageCard } from "./message-card";
import { ShareDialog } from "./share-dialog";
import { InvestDialog } from "./invest-dialog";
import { HuntDialog } from "./hunt-dialog";
import { UNINVEST_WINDOW_HOURS } from "@/lib/engine/uninvestment";
import { ParentComparePanel } from "./parent-compare-panel";
import { InvestorComments } from "./investor-comments";
import { ReviewGuide } from "./review-guide";
import { BlockView } from "./block-view";
import { ArrowLeft, LayoutGrid, List, BarChart3 } from "lucide-react";
import { useGame, XPBar, XP_REWARDS, ConversationStats } from "@/components/gamification";

interface Section2Props {
  qaSet: QASetWithMessages | null;
  initialQuestion: string | null;
  onInitialQuestionSent: () => void;
  onQASetUpdated: (qaSet: QASetWithMessages) => void;
  onBack?: () => void;
  humanAnswerMode?: boolean;
  onHumanAnswerDone?: () => void;
}

export function Section2Workspace({
  qaSet,
  initialQuestion,
  onInitialQuestionSent,
  onQASetUpdated,
  onBack,
  humanAnswerMode,
  onHumanAnswerDone,
}: Section2Props) {
  const { data: session } = useSession();
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showInvestDialog, setShowInvestDialog] = useState(false);
  const [showHuntDialog, setShowHuntDialog] = useState(false);
  const [showInvestors, setShowInvestors] = useState(false);
  const [showParentCompare, setShowParentCompare] = useState(false);
  const [uninvestingId, setUninvestingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [dismissedShareHint, setDismissedShareHint] = useState(false);
  const [dismissedRecommendHint, setDismissedRecommendHint] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "block">("block"); // 기본 블록 뷰
  const [showStats, setShowStats] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentRef = useRef<string | null>(null);

  // 게임화 훅
  const { addXP, incrementStat, checkAchievements } = useGame();

  // QASet 변경 시 맨 위로 스크롤
  useEffect(() => {
    if (scrollRef.current && qaSet?.id) {
      scrollRef.current.scrollTop = 0;
    }
    // Reset hints when qaSet changes
    setShowReviewPanel(false);
    setDismissedShareHint(false);
    setDismissedRecommendHint(false);
  }, [qaSet?.id]);

  // 스트리밍 중에만 맨 아래로 스크롤
  useEffect(() => {
    if (scrollRef.current && (isStreaming || pendingUserMessage)) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [streamingContent, pendingUserMessage, isStreaming]);

  const sendMessage = useCallback(async (messageText: string, currentQASet: QASetWithMessages) => {
    if (!messageText.trim() || isStreaming) return;

    setIsStreaming(true);
    setStreamingContent("");
    setPendingUserMessage(messageText.trim());
    setErrorMessage(null);

    try {
      let targetQASet = currentQASet;
      const isOwner = currentQASet.creatorId === session?.user?.id;

      if (currentQASet.isShared && !isOwner) {
        const extRes = await fetch(`/api/qa-sets/${currentQASet.id}/extend`, { method: "POST" });
        if (!extRes.ok) throw new Error("확장 Q&A 생성에 실패했습니다.");
        targetQASet = await extRes.json();
        onQASetUpdated(targetQASet);
      }

      const messages = [
        ...(targetQASet.messages ?? []).map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: messageText.trim() },
      ];

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qaSetId: targetQASet.id, messages }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Chat request failed (${res.status}): ${errText}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullContent += decoder.decode(value, { stream: true });
        setStreamingContent(fullContent);
      }

      const refreshRes = await fetch(`/api/qa-sets/${targetQASet.id}`);
      if (refreshRes.ok) {
        onQASetUpdated(await refreshRes.json());
        // XP 보상
        addXP(XP_REWARDS.askQuestion, "질문");
        addXP(XP_REWARDS.receiveAnswer, "답변 받음");
        incrementStat("totalQuestions");
        checkAchievements();
      }
    } catch (error) {
      console.error("Chat error:", error);
      setErrorMessage(error instanceof Error ? error.message : "요청 중 오류가 발생했습니다.");
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      setPendingUserMessage(null);
    }
  }, [isStreaming, onQASetUpdated, session?.user?.id]);

  // Auto-send initial question
  useEffect(() => {
    if (!initialQuestion || !qaSet) return;
    const key = `${qaSet.id}::${initialQuestion}`;
    if (sentRef.current === key) return;
    sentRef.current = key;
    onInitialQuestionSent();
    sendMessage(initialQuestion, qaSet);
  }, [initialQuestion, qaSet, sendMessage, onInitialQuestionSent]);

  const handleSendMessage = () => {
    if (!input.trim() || !qaSet || isStreaming) return;
    const text = input.trim();
    setInput("");
    sendMessage(text, qaSet);
  };

  const handleSubmitHumanAnswer = async () => {
    if (!input.trim() || !qaSet || isStreaming) return;
    const text = input.trim();
    setInput("");
    setIsStreaming(true);
    setPendingUserMessage(null);

    try {
      const res = await fetch(`/api/qa-sets/${qaSet.id}/human-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });

      if (!res.ok) throw new Error("답변 저장에 실패했습니다.");

      const updated = await res.json();
      onQASetUpdated(updated);
      onHumanAnswerDone?.();
    } catch (error) {
      console.error("Human answer error:", error);
      setErrorMessage(error instanceof Error ? error.message : "답변 저장 중 오류가 발생했습니다.");
    } finally {
      setIsStreaming(false);
    }
  };

  if (!qaSet) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-3">
          <div className="text-5xl">💬</div>
          <h3 className="text-lg font-medium">질문을 시작해보세요</h3>
          <p className="text-sm max-w-sm">
            위 검색창에서 질문을 입력하거나,<br />
            공유된 Q&A를 선택하면 대화가 시작됩니다.
          </p>
        </div>
      </div>
    );
  }

  const isOwner = qaSet.creatorId === session?.user?.id;
  const isSharedNotOwner = qaSet.isShared && !isOwner;
  const messages = qaSet.messages ?? [];
  const hasMessages = messages.length > 0;
  const recommendCount = qaSet.investorCount ?? 0;
  const totalRecommended = qaSet.totalInvested ?? 0;

  // Show inline share hint after 4+ messages (2 Q&A exchanges), owner, not shared
  const shouldShowShareHint = isOwner && !qaSet.isShared && messages.length >= 4 && !dismissedShareHint && !isStreaming;
  // Show recommend hint for shared Q&A not owned
  const shouldShowRecommendHint = isSharedNotOwner && !dismissedRecommendHint && messages.length >= 2;

  const handleUninvest = async (investmentId: string) => {
    if (!confirm("발자국을 지우시겠습니까? 원금의 20%가 차감됩니다.")) return;
    setUninvestingId(investmentId);
    try {
      const res = await fetch(`/api/investments/${investmentId}/uninvest`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ ${data.message}`);
        const refreshRes = await fetch(`/api/qa-sets/${qaSet.id}`);
        if (refreshRes.ok) onQASetUpdated(await refreshRes.json());
      } else {
        alert(data.error || "철회에 실패했습니다.");
      }
    } catch {
      alert("철회 중 오류가 발생했습니다.");
    } finally {
      setUninvestingId(null);
    }
  };

  // 블록 추가 핸들러
  const handleAddBlock = async (afterMessageId: string | null, blockType: string, content: string) => {
    if (!session?.user?.id) return;

    try {
      // 의견으로 저장 (기존 opinions API 활용)
      const res = await fetch("/api/opinions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          targetMessageId: afterMessageId, // 어떤 메시지에 달리는지
          targetQASetId: afterMessageId ? null : qaSet.id, // 메시지가 없으면 QASet에 직접
          relationType: blockType, // opinion, question, correction, evidence
        }),
      });

      if (res.ok) {
        // QASet 새로고침
        const refreshRes = await fetch(`/api/qa-sets/${qaSet.id}`);
        if (refreshRes.ok) onQASetUpdated(await refreshRes.json());

        // XP 보상 (타입별 차등)
        if (blockType === "correction") {
          addXP(XP_REWARDS.addCorrection, "수정/오류지적");
          incrementStat("totalCorrections");
        } else if (blockType === "evidence") {
          addXP(XP_REWARDS.addEvidence, "근거 추가");
        } else {
          addXP(XP_REWARDS.addOpinion, "의견 추가");
          incrementStat("totalOpinions");
        }
        checkAchievements();
      }
    } catch (err) {
      console.error("Failed to add block:", err);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden pb-14 md:pb-0">
      {/* Header — always clean, action buttons inline */}
      <div className="px-4 py-3 border-b flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {onBack && (
            <Button variant="ghost" size="sm" className="shrink-0 -ml-2 gap-1" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
              <span className="text-xs text-muted-foreground hidden sm:inline">검색</span>
            </Button>
          )}
          <div className="min-w-0">
            <h2 className="font-medium text-sm truncate">{qaSet.title ?? "새 대화"}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              {qaSet.parentQASetId && (
                <Badge variant="outline" className="text-[10px] text-teal-600 border-teal-300">확장</Badge>
              )}
              {qaSet.isShared && (
                <Badge variant="secondary" className="text-[10px]">공개됨</Badge>
              )}
              {qaSet.isShared && (
                <button
                  onClick={() => setShowInvestors(v => !v)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  👣 {totalRecommended} · {recommendCount}명 걸어감
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 shrink-0 items-center">
          {/* XP 바 (컴팩트) */}
          <XPBar compact />

          {/* View mode toggle */}
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("block")}
              className={`p-1.5 transition-colors ${viewMode === "block" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              title="블록 뷰"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              title="리스트 뷰"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* 구조 분석 버튼 */}
          <button
            onClick={() => setShowStats(v => !v)}
            className={`p-1.5 rounded-lg border transition-colors ${showStats ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            title="대화 구조 분석"
          >
            <BarChart3 className="h-3.5 w-3.5" />
          </button>

          {qaSet.parentQASetId && (
            <Button variant="ghost" size="sm" onClick={() => setShowParentCompare(true)} className="text-xs">
              원본과 비교
            </Button>
          )}
          {/* Review panel toggle for shared Q&A — shows knowledge card, comments */}
          {qaSet.isShared && qaSet.knowledgeCard && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReviewPanel(v => !v)}
              className="text-xs"
            >
              {showReviewPanel ? "닫기" : "상세 보기"}
            </Button>
          )}
        </div>
      </div>

      {/* Stat bar for shared Q&A */}
      {qaSet.isShared && (
        <div className="px-4 py-1.5 border-b bg-muted/20 flex items-center gap-4 text-xs text-muted-foreground">
          <span>👣 {totalRecommended} 발자국</span>
          <span>{recommendCount}명 걸어감</span>
          <span>메시지 {messages.length}개</span>
          {(qaSet.negativeCount ?? 0) > 0 && (
            <span className="text-red-500">📉 {qaSet.negativeInvested ?? 0} · {qaSet.negativeCount}명 반대</span>
          )}
        </div>
      )}

      {/* Investor list (toggle) */}
      {showInvestors && qaSet.isShared && (qaSet.investments ?? []).length > 0 && (
        <div className="border-b bg-muted/20 px-4 py-2 space-y-1.5 text-xs">
          <div className="font-medium text-muted-foreground mb-1">걸어간 사람들</div>
          {(qaSet.investments ?? []).filter(inv => !inv.isNegative).map((inv) => {
            const isMine = inv.userId === session?.user?.id;
            const investedAt = new Date(inv.createdAt);
            const ageHours = (Date.now() - investedAt.getTime()) / (1000 * 60 * 60);
            const canUninvest = isMine && ageHours <= UNINVEST_WINDOW_HOURS;
            return (
              <div
                key={inv.id}
                className={`flex items-center justify-between gap-2 py-1 px-2 rounded ${isMine ? "bg-blue-50 dark:bg-blue-950/30" : ""}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {inv.user.image && <img src={inv.user.image} alt="" className="w-4 h-4 rounded-full shrink-0" />}
                  <span className={isMine ? "font-medium" : ""}>{inv.user.name ?? "익명"}{isMine ? " (나)" : ""}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-muted-foreground">{inv.amount}👣</span>
                  {canUninvest && (
                    <button
                      onClick={() => handleUninvest(inv.id)}
                      disabled={uninvestingId === inv.id}
                      className="text-[10px] text-red-500 hover:text-red-700 border border-red-300 rounded px-1.5 py-0.5"
                    >
                      {uninvestingId === inv.id ? "..." : "철회"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review panel — knowledge card, creator note, comments */}
      {showReviewPanel && qaSet.isShared && (
        <div className="border-b bg-muted/10 px-4 py-3 space-y-3 max-h-64 overflow-y-auto">
          {qaSet.summary && (
            <div className="flex items-start gap-2">
              <span>💬</span>
              <div>
                <div className="text-xs font-medium text-amber-700 dark:text-amber-400">{qaSet.creator?.name ?? "창작자"}의 의견</div>
                <div className="text-sm text-foreground/90 mt-0.5">{qaSet.summary}</div>
              </div>
            </div>
          )}
          {qaSet.knowledgeCard && (() => {
            try {
              const card = JSON.parse(qaSet.knowledgeCard);
              return (
                <div className="flex items-start gap-2">
                  <span>📋</span>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-blue-700 dark:text-blue-400">지식 카드</div>
                    <p className="text-sm font-medium">{card.coreClaim}</p>
                    {card.evidence?.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {card.evidence.map((e: string, i: number) => <div key={i}>• {e}</div>)}
                      </div>
                    )}
                    {card.limitations?.length > 0 && (
                      <div className="text-xs text-orange-600 dark:text-orange-400">
                        {card.limitations.map((l: string, i: number) => <div key={i}>⚠ {l}</div>)}
                      </div>
                    )}
                    <Badge variant="outline" className={`text-[10px] ${
                      card.confidence === "high" ? "border-green-300 text-green-700" :
                      card.confidence === "medium" ? "border-amber-300 text-amber-700" :
                      "border-red-300 text-red-700"
                    }`}>
                      신뢰도: {card.confidence === "high" ? "높음" : card.confidence === "medium" ? "보통" : "낮음"}
                    </Badge>
                  </div>
                </div>
              );
            } catch { return null; }
          })()}
          <InvestorComments qaSetId={qaSet.id} />
        </div>
      )}

      {/* 대화 구조 분석 패널 */}
      {showStats && (
        <div className="border-b bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 px-4 py-3">
          <ConversationStats qaSet={qaSet} />
        </div>
      )}

      {/* Auto-extend notice removed — ReviewGuide handles this */}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-3xl mx-auto p-4 space-y-4">
          {/* 블록 뷰 */}
          {viewMode === "block" ? (
            <BlockView
              messages={messages}
              qaSetId={qaSet.id}
              isOwner={isOwner}
              isShared={qaSet.isShared}
              userId={session?.user?.id}
              userBalance={session?.user?.balance}
              onAddBlock={handleAddBlock}
              onInvest={(messageId) => setShowInvestDialog(true)}
              isStreaming={isStreaming}
              pendingUserMessage={pendingUserMessage}
            />
          ) : (
            /* 기존 리스트 뷰 */
            messages.map((message, idx) => (
              <div key={message.id}>
                {qaSet.parentMessageCount > 0 && idx === qaSet.parentMessageCount && (
                  <div className="flex items-center gap-3 py-2 my-2">
                    <div className="flex-1 border-t border-dashed border-teal-300 dark:border-teal-700" />
                    <div className="shrink-0 text-xs text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-3 py-1 rounded-full border border-teal-200 dark:border-teal-800">
                      ↑ 원래 대화 · <span className="font-medium">↓ 여기서부터 내 대화</span>
                    </div>
                    <div className="flex-1 border-t border-dashed border-teal-300 dark:border-teal-700" />
                  </div>
                )}
                <MessageCard
                  message={message}
                  isOwner={isOwner}
                  qaSetId={qaSet.id}
                  creatorName={qaSet.creator?.name}
                  isShared={qaSet.isShared}
                  onMessageImproved={async () => {
                    const res = await fetch(`/api/qa-sets/${qaSet.id}`);
                    if (res.ok) onQASetUpdated(await res.json());
                  }}
                />
              </div>
            ))
          )}

          {/* 인간 답변 입력 (humanAnswerMode에서 답변 전) - 블록 바로 아래 */}
          {humanAnswerMode && messages.length <= 1 && !isStreaming && (
            <Card className="border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-lg">✍️</span>
                  <div>
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">내 경험과 지식으로 답변해주세요</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">답변 후 길을 열면 다른 사람이 걸어갈 수 있습니다</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Textarea
                    placeholder="이 주제에 대한 내 답변을 작성하세요..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitHumanAnswer();
                      }
                    }}
                    className="min-h-[100px] resize-none bg-background"
                    rows={4}
                  />
                  <Button
                    onClick={handleSubmitHumanAnswer}
                    disabled={!input.trim() || isStreaming}
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
                  >
                    ✍️ 답변 등록
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Streaming user message */}
          {isStreaming && pendingUserMessage && (
            <Card className="bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-lg">👤</span>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-muted-foreground mb-1">{session?.user?.name ?? "사용자"}</div>
                    <div className="text-sm whitespace-pre-wrap">{pendingUserMessage}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {errorMessage && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-lg">⚠️</span>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-destructive mb-1">오류</div>
                    <div className="text-sm text-destructive/80">{errorMessage}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Streaming AI response */}
          {isStreaming && (
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-lg">🤖</span>
                  <div className="flex-1 text-sm whitespace-pre-wrap">
                    {streamingContent
                      ? streamingContent.replace(/\[\[REL:\{[\s\S]*?\}\]\]/, "").trim()
                      : <span className="animate-pulse text-muted-foreground">생각하는 중...</span>
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══ 행동 가이드 — 답변(AI 또는 인간)이 있을 때만 표시 ═══ */}
          {hasMessages && !isStreaming && messages.some(m => m.role === "assistant") && (
            <ReviewGuide
              qaSet={qaSet}
              isOwner={isOwner}
              userId={session?.user?.id}
              userBalance={session?.user?.balance ?? 30}
              isHumanAnswer={humanAnswerMode}
              onInvest={() => setShowInvestDialog(true)}
              onCounterInvest={() => setShowHuntDialog(true)}
              onShareQA={() => setShowShareDialog(true)}
              onOpinionSubmitted={async () => {
                const res = await fetch(`/api/qa-sets/${qaSet.id}`);
                if (res.ok) onQASetUpdated(await res.json());
              }}
              onAskFollowUp={(question) => {
                sendMessage(question, qaSet);
              }}
            />
          )}
        </div>
      </div>

      {/* Input area — 추가 질문용 (humanAnswer 답변 전에는 인라인 입력 사용) */}
      {isOwner && !(humanAnswerMode && messages.length <= 1) && (
        <div className="border-t p-4">
          <div className="max-w-3xl mx-auto flex gap-2">
            <Textarea
              placeholder="추가 질문을 입력하세요..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="resize-none min-h-[44px] max-h-32"
              rows={1}
              disabled={isStreaming}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isStreaming}
              size="sm"
              className="self-end"
            >
              전송
            </Button>
          </div>
        </div>
      )}

      {/* Panels & Dialogs */}
      {qaSet.parentQASetId && (
        <ParentComparePanel
          open={showParentCompare}
          onClose={() => setShowParentCompare(false)}
          parentQASetId={qaSet.parentQASetId}
          currentTitle={qaSet.title}
          currentMessages={messages}
        />
      )}
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        qaSet={qaSet}
        onShared={async () => {
          const res = await fetch(`/api/qa-sets/${qaSet.id}`);
          if (res.ok) onQASetUpdated(await res.json());
        }}
      />
      <InvestDialog
        open={showInvestDialog}
        onOpenChange={setShowInvestDialog}
        qaSet={qaSet}
        onInvested={async () => {
          const res = await fetch(`/api/qa-sets/${qaSet.id}`);
          if (res.ok) onQASetUpdated(await res.json());
        }}
      />
      <HuntDialog
        open={showHuntDialog}
        onOpenChange={setShowHuntDialog}
        qaSet={qaSet}
        onHunted={async () => {
          const res = await fetch(`/api/qa-sets/${qaSet.id}`);
          if (res.ok) onQASetUpdated(await res.json());
        }}
      />
    </div>
  );
}
