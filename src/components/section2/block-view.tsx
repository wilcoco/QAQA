"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ThumbsUp, X, Send, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MessageData, QASetWithMessages } from "@/types/qa-set";

interface BlockViewProps {
  messages: MessageData[];
  qaSet?: QASetWithMessages;
  qaSetId: string;
  isOwner: boolean;
  isShared: boolean;
  userId?: string;
  userBalance?: number;
  onAddBlock: (afterMessageDataId: string | null, blockType: string, content: string) => Promise<void>;
  onInvest: (messageId: string) => void;
  isStreaming?: boolean;
  pendingUserMessage?: string | null;
}

type BlockType = "answer" | "opinion" | "question" | "correction" | "evidence";

const BLOCK_TYPES: { type: BlockType; icon: string; label: string; placeholder: string; forQuestion?: boolean; forAnswer?: boolean }[] = [
  { type: "answer", icon: "💡", label: "답변", placeholder: "이 질문에 대한 내 답변...", forQuestion: true },
  { type: "opinion", icon: "💬", label: "의견", placeholder: "이 부분에 대한 내 의견...", forQuestion: true, forAnswer: true },
  { type: "question", icon: "❓", label: "추가 질문", placeholder: "이 부분이 궁금해요...", forAnswer: true },
  { type: "correction", icon: "✏️", label: "수정 제안", placeholder: "이 부분은 이렇게 고쳐야 해요...", forAnswer: true },
  { type: "evidence", icon: "📎", label: "근거 추가", placeholder: "관련 근거나 출처...", forQuestion: true, forAnswer: true },
];

// 블록 간 관계 타입 설정
const RELATION_CONFIG: Record<string, { label: string; icon: string; color: string; lineColor: string }> = {
  // 기본 Q→A 관계
  answer: { label: "AI 답변", icon: "🤖", color: "text-emerald-600", lineColor: "border-emerald-400" },
  humanAnswer: { label: "인간 답변", icon: "💡", color: "text-amber-600", lineColor: "border-amber-400" },
  인간답변: { label: "인간 답변", icon: "💡", color: "text-amber-600", lineColor: "border-amber-400" },
  // 후속 질문 관계 (relationSimple)
  명확화: { label: "명확화", icon: "🔍", color: "text-blue-600", lineColor: "border-blue-400" },
  더깊게: { label: "더 깊게", icon: "⬇️", color: "text-purple-600", lineColor: "border-purple-400" },
  근거: { label: "근거 요청", icon: "📚", color: "text-orange-600", lineColor: "border-orange-400" },
  검증: { label: "검증", icon: "✅", color: "text-green-600", lineColor: "border-green-400" },
  반박: { label: "반박", icon: "⚡", color: "text-red-600", lineColor: "border-red-400" },
  적용: { label: "적용", icon: "🔧", color: "text-teal-600", lineColor: "border-teal-400" },
  정리: { label: "정리", icon: "📋", color: "text-gray-600", lineColor: "border-gray-400" },
  AI오류: { label: "AI 오류 지적", icon: "🚫", color: "text-pink-600", lineColor: "border-pink-400" },
  // 의견 관계
  evidence: { label: "근거 보충", icon: "📎", color: "text-amber-600", lineColor: "border-amber-400" },
  counterargument: { label: "반박", icon: "⚔️", color: "text-red-600", lineColor: "border-red-400" },
  application: { label: "경험 공유", icon: "💡", color: "text-teal-600", lineColor: "border-teal-400" },
  extension: { label: "추가 정보", icon: "➕", color: "text-purple-600", lineColor: "border-purple-400" },
  question: { label: "추가 질문", icon: "❓", color: "text-blue-600", lineColor: "border-blue-400" },
  // 기본값
  followup: { label: "후속 질문", icon: "➡️", color: "text-indigo-600", lineColor: "border-indigo-400" },
};

// 블록 간 연결선 컴포넌트
function BlockConnector({
  relationType,
  fromRole,
  toRole
}: {
  relationType?: string | null;
  fromRole: "user" | "assistant";
  toRole: "user" | "assistant";
}) {
  // 관계 타입 결정
  let relationKey = "answer";
  if (relationType) {
    relationKey = relationType;
  } else if (fromRole === "user" && toRole === "assistant") {
    relationKey = "answer";
  } else if (fromRole === "assistant" && toRole === "user") {
    relationKey = "followup";
  }

  const config = RELATION_CONFIG[relationKey] || RELATION_CONFIG.followup;

  return (
    <div className="flex items-center justify-center py-1">
      <div className="flex flex-col items-center">
        {/* 위쪽 연결선 */}
        <div className={`w-0.5 h-3 border-l-2 border-dashed ${config.lineColor}`} />

        {/* 관계 배지 */}
        <div className={`
          flex items-center gap-1.5 px-3 py-1 rounded-full
          bg-background border-2 ${config.lineColor}
          text-xs font-medium ${config.color}
          shadow-sm
        `}>
          <span>{config.icon}</span>
          <span>{config.label}</span>
        </div>

        {/* 아래쪽 연결선 */}
        <div className={`w-0.5 h-3 border-l-2 border-dashed ${config.lineColor}`} />
      </div>
    </div>
  );
}

export function BlockView({
  messages,
  qaSet,
  qaSetId,
  isOwner,
  isShared,
  userId,
  userBalance,
  onAddBlock,
  onInvest,
  isStreaming,
  pendingUserMessage,
}: BlockViewProps) {
  const [activeInsertPoint, setActiveInsertPoint] = useState<string | null>(null);
  const [selectedBlockType, setSelectedBlockType] = useState<BlockType | null>(null);
  const [blockContent, setBlockContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInsertClick = (afterMessageDataId: string | null) => {
    if (activeInsertPoint === afterMessageDataId) {
      setActiveInsertPoint(null);
      setSelectedBlockType(null);
      setBlockContent("");
    } else {
      setActiveInsertPoint(afterMessageDataId);
      setSelectedBlockType(null);
      setBlockContent("");
    }
  };

  const handleSubmitBlock = async () => {
    if (!selectedBlockType || !blockContent.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddBlock(activeInsertPoint, selectedBlockType, blockContent.trim());
      setActiveInsertPoint(null);
      setSelectedBlockType(null);
      setBlockContent("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderInsertPoint = (afterMessageDataId: string | null, position: "top" | "middle" | "bottom", prevMessageRole?: "user" | "assistant") => {
    const isActive = activeInsertPoint === afterMessageDataId;

    // 이전 메시지가 질문(user)이면 forQuestion, 답변(assistant)이면 forAnswer인 블록 타입만 표시
    const availableBlockTypes = BLOCK_TYPES.filter(bt => {
      if (!prevMessageRole) return true; // 첫 블록이면 모두 표시
      if (prevMessageRole === "user") return bt.forQuestion;
      return bt.forAnswer;
    });

    // 질문 뒤에는 "답변"을 강조, 답변 뒤에는 다른 것들
    const isAfterQuestion = prevMessageRole === "user";

    return (
      <div className={`relative ${position === "middle" ? "my-1" : ""}`}>
        {/* Insert button line */}
        <div
          className={`group flex items-center gap-2 py-1 cursor-pointer transition-all ${
            isActive ? "opacity-100" : "opacity-0 hover:opacity-100"
          }`}
          onClick={() => handleInsertClick(afterMessageDataId)}
        >
          <div className="flex-1 border-t border-dashed border-primary/30 group-hover:border-primary/60 transition-colors" />
          <button className={`shrink-0 flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-all ${
            isActive
              ? "bg-primary text-primary-foreground"
              : isAfterQuestion
                ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 hover:bg-amber-200"
                : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
          }`}>
            {isActive ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            {isActive ? "취소" : isAfterQuestion ? "💡 답변 추가" : "블록 추가"}
          </button>
          <div className="flex-1 border-t border-dashed border-primary/30 group-hover:border-primary/60 transition-colors" />
        </div>

        {/* Block type selector & editor */}
        {isActive && (
          <div className="mt-2 mb-3 p-3 rounded-xl border-2 border-primary/20 bg-primary/5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Block type buttons */}
            <div className="flex flex-wrap gap-2">
              {availableBlockTypes.map((bt) => (
                <button
                  key={bt.type}
                  onClick={() => setSelectedBlockType(bt.type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedBlockType === bt.type
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : bt.type === "answer" && isAfterQuestion
                        ? "bg-amber-100 dark:bg-amber-900 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-200"
                        : "bg-background border hover:border-primary/50"
                  }`}
                >
                  <span>{bt.icon}</span>
                  <span>{bt.label}</span>
                </button>
              ))}
            </div>

            {/* Content input */}
            {selectedBlockType && (
              <div className="space-y-2 animate-in fade-in duration-150">
                <Textarea
                  placeholder={BLOCK_TYPES.find(b => b.type === selectedBlockType)?.placeholder}
                  value={blockContent}
                  onChange={(e) => setBlockContent(e.target.value)}
                  className="min-h-[80px] text-sm bg-background"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedBlockType(null);
                      setBlockContent("");
                    }}
                  >
                    취소
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmitBlock}
                    disabled={!blockContent.trim() || isSubmitting}
                    className="gap-1.5"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                    블록 추가
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderMessageDataBlock = (message: MessageData, index: number) => {
    const isUser = message.role === "user";
    const isAI = message.role === "assistant";

    return (
      <div key={message.id} className="group relative">
        {/* Block card */}
        <Card className={`relative overflow-hidden transition-all ${
          isUser
            ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/50"
            : "bg-card border-border"
        }`}>
          {/* Block type indicator */}
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${
            isUser ? "bg-blue-400" : "bg-emerald-400"
          }`} />

          <CardContent className="p-4 pl-5">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">{isUser ? "👤" : "🤖"}</span>
              <span className="text-xs font-medium text-muted-foreground">
                {isUser ? "질문" : "AI 답변"}
              </span>

              {/* AI 답변: 검토 현황 표시 */}
              {isAI && qaSet && (qaSet.investorCount > 0 || (message.opinions?.length || 0) > 0) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-[10px] font-medium cursor-help">
                      👥 {qaSet.investorCount + (message.opinions?.length || 0)}명 검토
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <div className="space-y-0.5">
                      {qaSet.investorCount > 0 && <div>👣 {qaSet.investorCount}명 발자국</div>}
                      {(message.opinions?.length || 0) > 0 && <div>✏️ {message.opinions?.length}개 의견</div>}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Quick actions */}
              <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => onInvest(message.id)}
                  title="이 블록에 발자국 남기기"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="text-sm whitespace-pre-wrap leading-relaxed">
              {message.content}
            </div>

            {/* 이 메시지에 달린 의견들 (인라인 연결 표시) */}
            {message.opinions && message.opinions.length > 0 && (
              <div className="mt-3 pt-2 border-t border-border/50 space-y-2">
                {message.opinions.map((opinion) => {
                  const relConfig = RELATION_CONFIG[opinion.relationType] || RELATION_CONFIG.extension;
                  return (
                    <div key={opinion.id} className="relative pl-6">
                      {/* 연결선 */}
                      <div className={`absolute left-2 top-0 bottom-0 w-0.5 border-l-2 border-dashed ${relConfig.lineColor}`} />

                      {/* 의견 카드 */}
                      <div className={`
                        p-2 rounded-lg border-l-4 ${relConfig.lineColor.replace('border-', 'border-l-')}
                        bg-muted/30
                      `}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium ${relConfig.color}`}>
                            {relConfig.icon} {relConfig.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            by {opinion.user.name ?? "익명"}
                          </span>
                        </div>
                        <p className="text-xs text-foreground/80">{opinion.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Insert point after this message */}
        {renderInsertPoint(message.id, "middle", message.role as "user" | "assistant")}
      </div>
    );
  };

  return (
    <div className="space-y-0">
      {/* MessageData blocks with connectors */}
      {messages.map((message, index) => {
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const showConnector = prevMessage !== null;

        return (
          <div key={message.id}>
            {/* 블록 간 연결선 */}
            {showConnector && (
              <BlockConnector
                relationType={message.relationSimple}
                fromRole={prevMessage.role as "user" | "assistant"}
                toRole={message.role as "user" | "assistant"}
              />
            )}

            {/* 블록 렌더링 */}
            {renderMessageDataBlock(message, index)}
          </div>
        );
      })}

      {/* Empty state - 스트리밍 중이거나 대기 메시지가 있으면 표시 안함 */}
      {messages.length === 0 && !isStreaming && !pendingUserMessage && (
        <div className="text-center py-10 text-muted-foreground">
          <div className="text-4xl mb-3">📝</div>
          <p>아직 블록이 없습니다</p>
        </div>
      )}
    </div>
  );
}

// Separate component for user-added blocks (opinions, corrections, etc.)
export function UserBlock({
  type,
  content,
  user,
  createdAt,
  investments,
  onInvest,
}: {
  type: BlockType;
  content: string;
  user: { name: string | null; image: string | null };
  createdAt: string;
  investments?: { amount: number }[];
  onInvest: () => void;
}) {
  const blockInfo = BLOCK_TYPES.find(b => b.type === type);

  const bgColors: Record<BlockType, string> = {
    answer: "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/50",
    opinion: "bg-purple-50/50 dark:bg-purple-950/20 border-purple-200/50 dark:border-purple-800/50",
    question: "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/50",
    correction: "bg-red-50/50 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/50",
    evidence: "bg-green-50/50 dark:bg-green-950/20 border-green-200/50 dark:border-green-800/50",
  };

  const barColors: Record<BlockType, string> = {
    answer: "bg-amber-400",
    opinion: "bg-purple-400",
    question: "bg-blue-400",
    correction: "bg-red-400",
    evidence: "bg-green-400",
  };

  return (
    <Card className={`relative overflow-hidden group ${bgColors[type]}`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${barColors[type]}`} />

      <CardContent className="p-4 pl-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">{blockInfo?.icon}</span>
          <span className="text-xs font-medium text-muted-foreground">
            {blockInfo?.label}
          </span>
          <span className="text-[10px] text-muted-foreground">
            by {user.name ?? "익명"}
          </span>
          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              onClick={onInvest}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="text-sm whitespace-pre-wrap leading-relaxed">
          {content}
        </div>

        {investments && investments.length > 0 && (
          <div className="mt-3 pt-2 border-t border-border/50 flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              👣 {investments.reduce((sum, inv) => sum + inv.amount, 0)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
