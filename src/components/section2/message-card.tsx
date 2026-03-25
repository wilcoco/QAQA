"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageData, MessageOpinion } from "@/types/qa-set";
import { DiffView } from "@/components/shared/diff-view";
import dynamic from "next/dynamic";

// 리치 에디터 lazy load (SSR 비활성화)
const RichEditor = dynamic(
  () => import("@/components/ui/rich-editor").then((mod) => mod.RichEditor),
  { ssr: false, loading: () => <div className="h-32 bg-muted/30 rounded animate-pulse" /> }
);
const RichContent = dynamic(
  () => import("@/components/ui/rich-editor").then((mod) => mod.RichContent),
  { ssr: false }
);

// ── 관계 라벨 설정 ───────────────────────────────────────────
const SIMPLE_BADGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  명확화: { label: "명확화", color: "text-blue-700",   bg: "bg-blue-100 border-blue-300" },
  더깊게: { label: "더깊게", color: "text-purple-700", bg: "bg-purple-100 border-purple-300" },
  근거:   { label: "근거",   color: "text-orange-700", bg: "bg-orange-100 border-orange-300" },
  검증:   { label: "검증",   color: "text-green-700",  bg: "bg-green-100 border-green-300" },
  반박:   { label: "반박",   color: "text-red-700",    bg: "bg-red-100 border-red-300" },
  적용:   { label: "적용",   color: "text-teal-700",   bg: "bg-teal-100 border-teal-300" },
  정리:   { label: "정리",   color: "text-gray-700",   bg: "bg-gray-100 border-gray-300" },
};

const STANCE_CONFIG: Record<string, { label: string; color: string }> = {
  수용: { label: "수용 👍", color: "text-green-700" },
  중립: { label: "중립 😐", color: "text-gray-600" },
  도전: { label: "도전 ⚡", color: "text-red-600" },
};

// ── 의견 타입 설정 ───────────────────────────────────────────
const OPINION_TYPES = [
  { value: "evidence", label: "근거 보충", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  { value: "counterargument", label: "반박", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  { value: "application", label: "경험 공유", color: "text-teal-700", bg: "bg-teal-50 border-teal-200" },
  { value: "extension", label: "추가 정보", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  { value: "question", label: "질문", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
] as const;

function RelationBadge({ message }: { message: MessageData }) {
  const [expanded, setExpanded] = useState(false);

  if (!message.relationSimple) return null;

  const cfg = SIMPLE_BADGE_CONFIG[message.relationSimple];
  const hasExpert = message.relationQ1Q2 || message.relationA1Q2 || message.relationStance;

  return (
    <div className="mb-2">
      {/* Simple badge — always visible */}
      <button
        onClick={() => hasExpert && setExpanded((v) => !v)}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium transition-opacity
          ${cfg ? `${cfg.bg} ${cfg.color}` : "bg-gray-100 text-gray-600 border-gray-300"}
          ${hasExpert ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
        title={hasExpert ? "클릭하여 상세 보기" : undefined}
      >
        {cfg?.label ?? message.relationSimple}
        {hasExpert && <span className="opacity-60">{expanded ? "▲" : "▼"}</span>}
      </button>

      {/* Expert detail panel */}
      {expanded && hasExpert && (
        <div className="mt-1.5 p-2 rounded-lg border bg-white/70 dark:bg-white/5 text-xs space-y-1 shadow-sm">
          {message.relationQ1Q2 && (
            <div className="flex gap-1.5 text-muted-foreground">
              <span className="font-medium text-foreground whitespace-nowrap">질문 전개</span>
              <span>{message.relationQ1Q2}</span>
            </div>
          )}
          {message.relationA1Q2 && (
            <div className="flex gap-1.5 text-muted-foreground">
              <span className="font-medium text-foreground whitespace-nowrap">대답 트리거</span>
              <span>{message.relationA1Q2}</span>
            </div>
          )}
          {message.relationStance && (
            <div className="flex gap-1.5">
              <span className="font-medium text-foreground whitespace-nowrap">입장</span>
              <span className={STANCE_CONFIG[message.relationStance]?.color ?? "text-muted-foreground"}>
                {STANCE_CONFIG[message.relationStance]?.label ?? message.relationStance}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface MessageCardProps {
  message: MessageData;
  isOwner: boolean;
  qaSetId: string;
  creatorName?: string | null;
  onMessageImproved: () => void;
  isShared?: boolean; // 공유된 QASet인지 (의견 달기 활성화 조건)
}

export function MessageCard({ message, isOwner, qaSetId, creatorName, onMessageImproved, isShared = false }: MessageCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [improvementNote, setImprovementNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 의견 관련 상태
  const [showOpinionForm, setShowOpinionForm] = useState(false);
  const [opinionType, setOpinionType] = useState<string>("evidence");
  const [opinionContent, setOpinionContent] = useState({ html: "", json: {}, text: "" });
  const [isSubmittingOpinion, setIsSubmittingOpinion] = useState(false);
  const [opinions, setOpinions] = useState<MessageOpinion[]>([]);
  const [showOpinions, setShowOpinions] = useState(false);
  const [loadingOpinions, setLoadingOpinions] = useState(false);

  // 의견 목록 로드
  const loadOpinions = useCallback(async () => {
    if (loadingOpinions) return;
    setLoadingOpinions(true);
    try {
      const res = await fetch(`/api/opinions?messageId=${message.id}`);
      if (res.ok) {
        const data = await res.json();
        setOpinions(data);
      }
    } catch (error) {
      console.error("Failed to load opinions:", error);
    } finally {
      setLoadingOpinions(false);
    }
  }, [message.id, loadingOpinions]);

  // 의견 제출
  const handleSubmitOpinion = useCallback(async () => {
    if (!opinionContent.text.trim() || isSubmittingOpinion) return;
    setIsSubmittingOpinion(true);
    try {
      const res = await fetch("/api/opinions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: opinionContent.text,
          contentHtml: opinionContent.html,
          contentJson: opinionContent.json,
          targetMessageId: message.id,
          relationType: opinionType,
        }),
      });
      if (res.ok) {
        setOpinionContent({ html: "", json: {}, text: "" });
        setShowOpinionForm(false);
        loadOpinions(); // 목록 새로고침
      }
    } catch (error) {
      console.error("Failed to submit opinion:", error);
    } finally {
      setIsSubmittingOpinion(false);
    }
  }, [opinionContent, opinionType, message.id, isSubmittingOpinion, loadOpinions]);

  // 의견 보기 토글 시 로드
  useEffect(() => {
    if (showOpinions && opinions.length === 0) {
      loadOpinions();
    }
  }, [showOpinions, opinions.length, loadOpinions]);

  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isHumanAnswer = isAssistant && (message.isHumanAuthored || (message.isGapResponse && message.isInsight));

  const handleSaveImprovement = async () => {
    if (!editContent.trim() || editContent === message.content) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/qa-sets/${qaSetId}/messages/${message.id}/improve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: editContent.trim(),
          improvementNote: improvementNote.trim() || undefined,
        }),
      });

      if (res.ok) {
        setIsEditing(false);
        setImprovementNote("");
        setSaveError(null);
        onMessageImproved();
      } else {
        const data = await res.json().catch(() => null);
        setSaveError(data?.error ?? "개선 저장에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to save improvement:", error);
      setSaveError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className={`${isUser ? "bg-primary/5" : isHumanAnswer ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" : "bg-muted/30"}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-lg shrink-0">{isUser ? "👤" : isHumanAnswer ? "✍️" : "🤖"}</span>
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-muted-foreground">
                {isUser ? (creatorName ?? "사용자") : isHumanAnswer ? `${creatorName ?? "사용자"}의 답변` : "AI 응답"}
              </span>
              {isHumanAnswer && (
                <Badge variant="outline" className="text-xs py-0 text-amber-700 border-amber-400 bg-amber-50">
                  ✍️ 직접 작성
                </Badge>
              )}
              {message.isInsight && (
                <Badge
                  variant="outline"
                  className="text-xs py-0 text-yellow-700 border-yellow-400 bg-yellow-50 cursor-help relative group"
                  title={message.insightReason ?? "Human-unique insight"}
                >
                  💡 인사이트
                  {message.insightReason && (
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-gray-900 text-white text-xs whitespace-pre-wrap max-w-[250px] hidden group-hover:block z-50 shadow-lg">
                      {message.insightReason}
                    </span>
                  )}
                </Badge>
              )}
              {message.isImproved && (
                <Badge variant="outline" className="text-xs py-0 text-amber-600 border-amber-300">
                  ✏️ 개선됨
                </Badge>
              )}
            </div>

            {/* Relation badge (follow-up questions only) */}
            {isUser && <RelationBadge message={message} />}

            {/* Content */}
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[100px] text-sm"
                />
                <Textarea
                  placeholder="개선 사유 (선택사항)"
                  value={improvementNote}
                  onChange={(e) => setImprovementNote(e.target.value)}
                  className="min-h-[40px] text-xs"
                  rows={1}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveImprovement} disabled={isSaving}>
                    {isSaving ? "저장 중..." : "저장"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    setIsEditing(false);
                    setEditContent(message.content);
                    setSaveError(null);
                  }}>
                    취소
                  </Button>
                </div>
                {saveError && (
                  <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2 rounded">
                    {saveError}
                  </div>
                )}

                {/* Show diff if there's a change */}
                {message.originalContent && message.originalContent !== message.content && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      변경사항 보기
                    </summary>
                    <div className="mt-1 p-2 bg-background rounded border">
                      <DiffView
                        original={message.originalContent}
                        current={editContent}
                        className="text-xs"
                      />
                    </div>
                  </details>
                )}
              </div>
            ) : (
              <div>
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </div>

                {/* Improvement note */}
                {message.improvementNote && (
                  <div className="mt-2 p-2 rounded bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-700 dark:text-amber-400">
                    💡 개선 사유: {message.improvementNote}
                  </div>
                )}

                {/* Show diff between original and current */}
                {message.originalContent && message.originalContent !== message.content && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      변경사항 보기
                    </summary>
                    <div className="mt-1 p-2 bg-background rounded border">
                      <DiffView
                        original={message.originalContent}
                        current={message.content}
                        className="text-xs"
                      />
                    </div>
                  </details>
                )}

                {/* Actions */}
                {isAssistant && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        setEditContent(message.content);
                        setIsEditing(true);
                      }}
                    >
                      ✏️ 개선
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => navigator.clipboard.writeText(message.content)}
                    >
                      📋 복사
                    </Button>
                    {isShared && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => setShowOpinionForm(!showOpinionForm)}
                        >
                          ✍️ 의견
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => setShowOpinions(!showOpinions)}
                        >
                          💬 {opinions.length > 0 ? `의견 (${opinions.length})` : "의견 보기"}
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {/* 의견 입력 폼 */}
                {showOpinionForm && isShared && (
                  <div className="mt-4 p-3 rounded-lg border bg-muted/20 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-muted-foreground">의견 유형:</span>
                      {OPINION_TYPES.map((type) => (
                        <button
                          key={type.value}
                          onClick={() => setOpinionType(type.value)}
                          className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                            opinionType === type.value
                              ? `${type.bg} ${type.color} font-medium`
                              : "border-border text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                    <RichEditor
                      placeholder="의견을 작성하세요... (이미지, 링크 등 지원)"
                      onChange={setOpinionContent}
                      minHeight="100px"
                      maxLength={2000}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowOpinionForm(false)}
                      >
                        취소
                      </Button>
                      <Button
                        size="sm"
                        disabled={!opinionContent.text.trim() || isSubmittingOpinion}
                        onClick={handleSubmitOpinion}
                      >
                        {isSubmittingOpinion ? "등록 중..." : "의견 등록"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* 의견 목록 */}
                {showOpinions && (
                  <div className="mt-4 space-y-2">
                    {loadingOpinions ? (
                      <div className="text-xs text-muted-foreground">의견 로딩 중...</div>
                    ) : opinions.length === 0 ? (
                      <div className="text-xs text-muted-foreground p-3 border rounded-lg bg-muted/10">
                        아직 의견이 없습니다. 첫 의견을 남겨보세요!
                      </div>
                    ) : (
                      opinions.map((opinion) => {
                        const typeConfig = OPINION_TYPES.find((t) => t.value === opinion.relationType);
                        return (
                          <div
                            key={opinion.id}
                            className={`p-3 rounded-lg border ${typeConfig?.bg || "bg-gray-50"}`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-medium">
                                {opinion.user?.name || "익명"}
                              </span>
                              <Badge variant="outline" className={`text-[10px] py-0 ${typeConfig?.color || ""}`}>
                                {typeConfig?.label || opinion.relationType}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground ml-auto">
                                {new Date(opinion.createdAt).toLocaleDateString("ko-KR")}
                              </span>
                            </div>
                            {opinion.contentHtml ? (
                              <RichContent html={opinion.contentHtml} className="text-sm" />
                            ) : (
                              <div className="text-sm whitespace-pre-wrap">{opinion.content}</div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
