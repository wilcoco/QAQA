"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { QASetWithMessages, MessageData } from "@/types/qa-set";

// ═══════════════════════════════════════════════════════════
// 대화 구조 분석 및 시각화
// ═══════════════════════════════════════════════════════════

interface ConversationStatsProps {
  qaSet: QASetWithMessages;
  compact?: boolean;
}

interface ConversationAnalysis {
  depth: number;           // 대화 깊이 (Q&A 왕복 횟수)
  totalBlocks: number;     // 총 블록 수
  questionCount: number;   // 질문 수
  answerCount: number;     // 답변 수
  opinionCount: number;    // 의견 수
  stanceBreakdown: {       // 입장 분포
    support: number;       // 찬성/동의
    neutral: number;       // 중립
    oppose: number;        // 반박/반대
  };
  relationTypes: Record<string, number>;  // 관계 타입별 카운트
  completeness: number;    // 완성도 (0-100)
  hasEvidence: boolean;    // 근거 포함 여부
  hasCorrection: boolean;  // 수정/오류지적 포함 여부
}

// 대화 분석
function analyzeConversation(qaSet: QASetWithMessages): ConversationAnalysis {
  const messages = qaSet.messages || [];

  // 기본 카운트
  const questionCount = messages.filter(m => m.role === "user").length;
  const answerCount = messages.filter(m => m.role === "assistant").length;

  // 의견 카운트
  const allOpinions = messages.flatMap(m => m.opinions || []);
  const opinionCount = allOpinions.length;

  // 입장 분석
  const stanceBreakdown = { support: 0, neutral: 0, oppose: 0 };
  messages.forEach(m => {
    if (m.relationStance === "수용") stanceBreakdown.support++;
    else if (m.relationStance === "도전") stanceBreakdown.oppose++;
    else if (m.relationStance === "중립") stanceBreakdown.neutral++;
  });

  // 의견 타입으로도 분석
  allOpinions.forEach(op => {
    if (op.relationType === "evidence" || op.relationType === "application") {
      stanceBreakdown.support++;
    } else if (op.relationType === "counterargument") {
      stanceBreakdown.oppose++;
    } else {
      stanceBreakdown.neutral++;
    }
  });

  // 관계 타입 카운트
  const relationTypes: Record<string, number> = {};
  messages.forEach(m => {
    if (m.relationSimple) {
      relationTypes[m.relationSimple] = (relationTypes[m.relationSimple] || 0) + 1;
    }
  });
  allOpinions.forEach(op => {
    relationTypes[op.relationType] = (relationTypes[op.relationType] || 0) + 1;
  });

  // 깊이 (Q&A 왕복)
  const depth = Math.floor(messages.length / 2);

  // 완성도 계산
  let completeness = 0;
  if (questionCount > 0) completeness += 20;
  if (answerCount > 0) completeness += 20;
  if (opinionCount > 0) completeness += 15;
  if (depth >= 2) completeness += 15;
  if (stanceBreakdown.support > 0 || stanceBreakdown.oppose > 0) completeness += 10;
  if (Object.keys(relationTypes).length > 0) completeness += 10;
  if (qaSet.isShared) completeness += 10;

  // 근거/수정 포함 여부
  const hasEvidence = allOpinions.some(op => op.relationType === "evidence");
  const hasCorrection = allOpinions.some(op => op.relationType === "counterargument") ||
    Object.keys(relationTypes).some(r => r === "반박" || r === "AI오류");

  return {
    depth,
    totalBlocks: messages.length + opinionCount,
    questionCount,
    answerCount,
    opinionCount,
    stanceBreakdown,
    relationTypes,
    completeness: Math.min(100, completeness),
    hasEvidence,
    hasCorrection,
  };
}

// 메인 컴포넌트
export function ConversationStats({ qaSet, compact = false }: ConversationStatsProps) {
  const analysis = useMemo(() => analyzeConversation(qaSet), [qaSet]);

  if (compact) {
    return <CompactStats analysis={analysis} />;
  }

  return <FullStats analysis={analysis} qaSet={qaSet} />;
}

// 컴팩트 버전 (헤더에 표시)
function CompactStats({ analysis }: { analysis: ConversationAnalysis }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      {/* 깊이 */}
      <div className="flex items-center gap-1" title="대화 깊이">
        <span>⬇️</span>
        <span className="font-medium">{analysis.depth}</span>
      </div>

      {/* 블록 수 */}
      <div className="flex items-center gap-1" title="총 블록">
        <span>📦</span>
        <span className="font-medium">{analysis.totalBlocks}</span>
      </div>

      {/* 완성도 */}
      <div className="flex items-center gap-1.5" title="완성도">
        <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${
              analysis.completeness >= 70 ? "bg-green-500" :
              analysis.completeness >= 40 ? "bg-amber-500" : "bg-red-500"
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${analysis.completeness}%` }}
          />
        </div>
        <span className="text-muted-foreground">{analysis.completeness}%</span>
      </div>
    </div>
  );
}

// 전체 버전 (사이드바/패널에 표시)
function FullStats({ analysis, qaSet }: { analysis: ConversationAnalysis; qaSet: QASetWithMessages }) {
  return (
    <div className="p-4 rounded-xl border bg-card space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <span>📊</span> 대화 구조
      </h3>

      {/* 완성도 바 */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">완성도</span>
          <span className="font-medium">{analysis.completeness}%</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={`h-full transition-colors ${
              analysis.completeness >= 70 ? "bg-gradient-to-r from-green-400 to-emerald-500" :
              analysis.completeness >= 40 ? "bg-gradient-to-r from-amber-400 to-orange-500" :
              "bg-gradient-to-r from-red-400 to-rose-500"
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${analysis.completeness}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {analysis.completeness >= 70 ? "잘 정리된 대화입니다!" :
           analysis.completeness >= 40 ? "의견이나 근거를 추가해보세요" :
           "대화를 더 진행해보세요"}
        </p>
      </div>

      {/* 기본 통계 그리드 */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon="⬇️"
          label="대화 깊이"
          value={`${analysis.depth}단계`}
          color="text-purple-600"
        />
        <StatCard
          icon="📦"
          label="총 블록"
          value={`${analysis.totalBlocks}개`}
          color="text-blue-600"
        />
        <StatCard
          icon="❓"
          label="질문"
          value={`${analysis.questionCount}개`}
          color="text-indigo-600"
        />
        <StatCard
          icon="💬"
          label="의견"
          value={`${analysis.opinionCount}개`}
          color="text-teal-600"
        />
      </div>

      {/* 입장 분포 */}
      <div>
        <div className="text-sm text-muted-foreground mb-2">관점 분포</div>
        <div className="flex gap-1 h-4 rounded-full overflow-hidden bg-muted">
          {analysis.stanceBreakdown.support > 0 && (
            <motion.div
              className="bg-green-500"
              initial={{ width: 0 }}
              animate={{
                width: `${(analysis.stanceBreakdown.support / (analysis.stanceBreakdown.support + analysis.stanceBreakdown.neutral + analysis.stanceBreakdown.oppose || 1)) * 100}%`
              }}
              title={`찬성: ${analysis.stanceBreakdown.support}`}
            />
          )}
          {analysis.stanceBreakdown.neutral > 0 && (
            <motion.div
              className="bg-gray-400"
              initial={{ width: 0 }}
              animate={{
                width: `${(analysis.stanceBreakdown.neutral / (analysis.stanceBreakdown.support + analysis.stanceBreakdown.neutral + analysis.stanceBreakdown.oppose || 1)) * 100}%`
              }}
              title={`중립: ${analysis.stanceBreakdown.neutral}`}
            />
          )}
          {analysis.stanceBreakdown.oppose > 0 && (
            <motion.div
              className="bg-red-500"
              initial={{ width: 0 }}
              animate={{
                width: `${(analysis.stanceBreakdown.oppose / (analysis.stanceBreakdown.support + analysis.stanceBreakdown.neutral + analysis.stanceBreakdown.oppose || 1)) * 100}%`
              }}
              title={`반박: ${analysis.stanceBreakdown.oppose}`}
            />
          )}
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-green-600">👍 {analysis.stanceBreakdown.support}</span>
          <span className="text-gray-500">😐 {analysis.stanceBreakdown.neutral}</span>
          <span className="text-red-600">⚡ {analysis.stanceBreakdown.oppose}</span>
        </div>
      </div>

      {/* 체크리스트 */}
      <div className="space-y-1.5">
        <CheckItem checked={analysis.questionCount > 0} label="질문 있음" />
        <CheckItem checked={analysis.answerCount > 0} label="답변 있음" />
        <CheckItem checked={analysis.opinionCount > 0} label="의견 추가됨" />
        <CheckItem checked={analysis.hasEvidence} label="근거 포함" />
        <CheckItem checked={analysis.hasCorrection} label="검증/수정됨" />
        <CheckItem checked={qaSet.isShared} label="공개됨" />
      </div>

      {/* 관계 타입 태그 */}
      {Object.keys(analysis.relationTypes).length > 0 && (
        <div>
          <div className="text-sm text-muted-foreground mb-2">사용된 관계</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(analysis.relationTypes).map(([type, count]) => (
              <span
                key={type}
                className="px-2 py-0.5 rounded-full bg-muted text-xs"
              >
                {type} ({count})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 통계 카드
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="p-2.5 rounded-lg bg-muted/50">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span>{icon}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

// 체크 아이템
function CheckItem({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={checked ? "text-green-500" : "text-muted-foreground/50"}>
        {checked ? "✓" : "○"}
      </span>
      <span className={checked ? "" : "text-muted-foreground/70"}>{label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 대화 아웃라인 뷰
// ═══════════════════════════════════════════════════════════

export function ConversationOutline({ qaSet }: { qaSet: QASetWithMessages }) {
  const messages = qaSet.messages || [];

  return (
    <div className="p-4 rounded-xl border bg-card">
      <h3 className="font-semibold flex items-center gap-2 mb-3">
        <span>📋</span> 대화 목차
      </h3>

      <div className="space-y-1">
        {messages.map((msg, idx) => {
          const isUser = msg.role === "user";
          const preview = msg.content.slice(0, 40) + (msg.content.length > 40 ? "..." : "");
          const opinionCount = (msg.opinions || []).length;

          return (
            <div
              key={msg.id}
              className={`
                flex items-start gap-2 p-2 rounded-lg cursor-pointer
                hover:bg-muted/50 transition-colors
                ${isUser ? "pl-2" : "pl-6"}
              `}
            >
              <span className="text-sm shrink-0">{isUser ? "👤" : "🤖"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{preview}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {msg.relationSimple && (
                    <span className="px-1.5 py-0.5 rounded bg-muted">{msg.relationSimple}</span>
                  )}
                  {opinionCount > 0 && (
                    <span>💬 {opinionCount}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {messages.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          아직 대화가 없습니다
        </p>
      )}
    </div>
  );
}
