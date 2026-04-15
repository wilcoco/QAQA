"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";

interface ReviewItem {
  id: string;
  title: string | null;
  question?: string;
  description?: string;
  type: "ai_question" | "knowledge_gap" | "needs_review";
  rewardMultiplier?: number;
  answerCount?: number;
  gapType?: string;
  severity?: string;
  creator?: {
    id: string;
    name: string | null;
    image: string | null;
  };
  totalInvested?: number;
  investorCount?: number;
  aiAnswer?: string | null;
  humanImprovement?: string | null;
}

interface ReviewFeedProps {
  onSelectQASet: (qaSetId: string) => void;
  onAnswerGap: (gapId: string, description: string) => void;
  onNewQuestion: (question: string) => void;
}

const GAP_TYPE_INFO: Record<string, { icon: string; label: string }> = {
  uncertain_answer: { icon: "❓", label: "불확실한 답변" },
  inconsistency: { icon: "⚡", label: "불일치" },
  missing_evidence: { icon: "📎", label: "근거 부족" },
  conflicting_claims: { icon: "⚔️", label: "의견 충돌" },
  ai_doesnt_know: { icon: "🤷", label: "검토 필요" },
  local_info: { icon: "📍", label: "지역 정보" },
  experience: { icon: "💡", label: "경험 필요" },
};

export function ReviewFeed({ onSelectQASet, onAnswerGap, onNewQuestion }: ReviewFeedProps) {
  const { data: session } = useSession();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [questionInput, setQuestionInput] = useState("");

  const handleSubmitQuestion = () => {
    if (!questionInput.trim()) return;
    onNewQuestion(questionInput.trim());
    setQuestionInput("");
  };

  const fetchReviewItems = useCallback(async () => {
    setLoading(true);
    try {
      // AI 질문 + 지식 갭 + 리뷰 필요한 답변 병렬 로드
      const [aiQuestionsRes, gapsRes, needsReviewRes] = await Promise.all([
        fetch("/api/qa-sets/ai-questions?limit=10"),
        fetch("/api/knowledge-gaps?limit=10"),
        fetch("/api/qa-sets?shared=true&sort=recent&limit=10&hunt=true"),
      ]);

      const combined: ReviewItem[] = [];

      // AI 질문 (답변 필요)
      if (aiQuestionsRes.ok) {
        const data = await aiQuestionsRes.json();
        (data.questions ?? []).forEach((q: any) => {
          combined.push({
            id: q.id,
            title: q.title,
            question: q.question,
            type: "ai_question",
            rewardMultiplier: q.rewardMultiplier,
            answerCount: q.answerCount,
          });
        });
      }

      // 지식 갭 (기여 기회)
      if (gapsRes.ok) {
        const data = await gapsRes.json();
        (data.gaps ?? []).forEach((g: any) => {
          combined.push({
            id: g.id,
            title: g.description,
            description: g.description,
            type: "knowledge_gap",
            gapType: g.gapType,
            severity: g.severity,
          });
        });
      }

      // 리뷰/개선된 답변
      if (needsReviewRes.ok) {
        const data = await needsReviewRes.json();
        (data.qaSets ?? []).filter((qa: any) => qa.summary).forEach((qa: any) => {
          combined.push({
            id: qa.id,
            title: qa.title,
            type: "needs_review",
            creator: qa.creator,
            totalInvested: qa.totalInvested,
            investorCount: qa.investorCount,
            aiAnswer: qa.messages?.[0]?.content,
            humanImprovement: qa.summary,
          });
        });
      }

      // 섞어서 표시
      combined.sort(() => Math.random() - 0.5);
      setItems(combined);
    } catch (err) {
      console.error("Failed to load review items:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviewItems();
  }, [fetchReviewItems]);

  const handleSelect = async (item: ReviewItem) => {
    if (!session?.user?.id) return;
    setSelecting(item.id);

    try {
      if (item.type === "ai_question") {
        onSelectQASet(item.id);
      } else if (item.type === "knowledge_gap") {
        onAnswerGap(item.id, item.description ?? item.title ?? "");
      } else {
        onSelectQASet(item.id);
      }
    } finally {
      setSelecting(null);
    }
  };

  if (!session?.user?.id) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground p-6">
        <div className="text-center space-y-3">
          <div className="text-4xl">✏️</div>
          <p>로그인하고 AI 답변 개선에 참여하세요</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 space-y-3 max-w-2xl mx-auto">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 space-y-4 pb-20">
        {/* 헤더 + 질문 입력 */}
        <div className="text-center py-2">
          <h1 className="text-xl font-bold">✏️ 리뷰 & 기여</h1>
          <p className="text-xs text-muted-foreground mt-1">
            AI 답변을 검토하고 함께 개선하세요
          </p>
        </div>

        {/* 상단 질문 입력 */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="새로운 질문으로 길 만들기..."
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitQuestion();
                }
              }}
              className="pl-9 h-10"
            />
          </div>
          <Button
            onClick={handleSubmitQuestion}
            disabled={!questionInput.trim()}
            size="sm"
            className="h-10 px-3"
          >
            👣 시작
          </Button>
        </div>

        {/* 기여 기회 목록 */}
        {items.length > 0 && (
          <p className="text-xs text-muted-foreground pt-2">기여가 필요한 답변들</p>
        )}

        {/* 리뷰 아이템 목록 */}
        {items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => (
              <ReviewCard
                key={`${item.type}-${item.id}`}
                item={item}
                onSelect={() => handleSelect(item)}
                isSelecting={selecting === item.id}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <div className="text-3xl mb-2">✨</div>
            <p className="text-sm">지금은 리뷰할 답변이 없습니다</p>
          </div>
        )}

      </div>
    </div>
  );
}

function ReviewCard({
  item,
  onSelect,
  isSelecting,
}: {
  item: ReviewItem;
  onSelect: () => void;
  isSelecting: boolean;
}) {
  const gapInfo = item.gapType ? GAP_TYPE_INFO[item.gapType] : null;

  return (
    <div className="p-4 rounded-xl border bg-card hover:border-primary/30 transition-colors">
      {/* 타입 배지 */}
      <div className="flex items-center gap-2 mb-2">
        {item.type === "ai_question" && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 font-medium">
            🤖 답변 필요
          </span>
        )}
        {item.type === "knowledge_gap" && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 font-medium">
            {gapInfo?.icon ?? "❓"} {gapInfo?.label ?? "기여 기회"}
          </span>
        )}
        {item.type === "needs_review" && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 font-medium">
            ✏️ 개선됨
          </span>
        )}
        {item.rewardMultiplier && item.rewardMultiplier > 1 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 font-medium">
            🔥 x{item.rewardMultiplier} 보상
          </span>
        )}
      </div>

      {/* 질문 */}
      <div className="flex items-start gap-2 mb-2">
        <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-[10px]">
          {item.type === "ai_question" ? "🤖" : "👤"}
        </span>
        <p className="text-[13px] font-medium leading-snug line-clamp-2">
          {item.title ?? item.description ?? "제목 없음"}
        </p>
      </div>

      {/* AI 답변 (있으면) */}
      {item.aiAnswer && (
        <div className="flex items-start gap-2 mb-2">
          <span className="shrink-0 w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px]">🤖</span>
          <p className="text-[11px] text-muted-foreground line-clamp-1">{item.aiAnswer}</p>
        </div>
      )}

      {/* 사람 개선 (있으면) */}
      {item.humanImprovement && (
        <div className="flex items-start gap-2 mb-2">
          <span className="shrink-0 w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-[10px]">✏️</span>
          <p className="text-[11px] text-amber-700 dark:text-amber-400 line-clamp-1">{item.humanImprovement}</p>
        </div>
      )}

      {/* 하단: 메타 + 버튼 */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50 mt-2">
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          {item.answerCount !== undefined && (
            <span>{item.answerCount}명 참여</span>
          )}
          {item.investorCount !== undefined && item.investorCount > 0 && (
            <span>👣 {item.totalInvested}</span>
          )}
          {item.creator && (
            <span>by {item.creator.name ?? "익명"}</span>
          )}
        </div>
        <Button
          size="sm"
          variant={item.type === "needs_review" ? "outline" : "default"}
          className="text-xs h-7 px-3"
          onClick={onSelect}
          disabled={isSelecting}
        >
          {isSelecting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : item.type === "needs_review" ? (
            "보기"
          ) : (
            "👣 참여"
          )}
        </Button>
      </div>
    </div>
  );
}
