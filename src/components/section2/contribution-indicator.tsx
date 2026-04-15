"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { QASetWithMessages, MessageData } from "@/types/qa-set";

interface ContributionIndicatorProps {
  qaSet: QASetWithMessages;
  message?: MessageData;
  compact?: boolean;
}

interface ContributionStats {
  totalContributors: number;
  reviewers: number;      // 발자국 남긴 사람
  improvers: number;      // 의견/수정 제안한 사람
  uniqueUsers: Set<string>;
}

function calculateContributionStats(
  qaSet: QASetWithMessages,
  message?: MessageData
): ContributionStats {
  const uniqueUsers = new Set<string>();

  // 발자국 남긴 사람들 (투자자)
  const investments = qaSet.investments || [];
  investments.forEach(inv => uniqueUsers.add(inv.userId));

  // 의견/수정 제안한 사람들
  let allOpinions: { userId: string }[] = [];

  if (message) {
    // 특정 메시지의 의견만
    allOpinions = (message.opinions || []).map(op => ({ userId: op.user.id }));
  } else {
    // 전체 QASet의 의견
    qaSet.messages.forEach(msg => {
      (msg.opinions || []).forEach(op => {
        allOpinions.push({ userId: op.user.id });
      });
    });
  }

  allOpinions.forEach(op => uniqueUsers.add(op.userId));

  // 창작자 제외
  uniqueUsers.delete(qaSet.creatorId);

  return {
    totalContributors: uniqueUsers.size,
    reviewers: qaSet.investorCount || 0,
    improvers: allOpinions.length,
    uniqueUsers,
  };
}

export function ContributionIndicator({ qaSet, message, compact = false }: ContributionIndicatorProps) {
  const stats = useMemo(() => calculateContributionStats(qaSet, message), [qaSet, message]);

  if (stats.totalContributors === 0) {
    return null;
  }

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-[10px] font-medium cursor-help">
            <span>👥</span>
            <span>{stats.totalContributors}명 검토</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="space-y-1">
            <div>👣 {stats.reviewers}명이 발자국 남김</div>
            {stats.improvers > 0 && <div>✏️ {stats.improvers}개 개선 의견</div>}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/30"
    >
      <div className="flex -space-x-1">
        {Array.from({ length: Math.min(3, stats.totalContributors) }).map((_, i) => (
          <div
            key={i}
            className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 border-2 border-white dark:border-gray-800 flex items-center justify-center text-[10px] text-white font-bold"
          >
            {i === 0 ? "👤" : ""}
          </div>
        ))}
        {stats.totalContributors > 3 && (
          <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-[9px] font-medium">
            +{stats.totalContributors - 3}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-blue-900 dark:text-blue-300">
          {stats.totalContributors}명이 이 답변을 검토했습니다
        </div>
        <div className="text-[10px] text-blue-600 dark:text-blue-400">
          👣 {stats.reviewers} 발자국 · ✏️ {stats.improvers} 개선
        </div>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <div className="text-lg cursor-help">
            {stats.totalContributors >= 10 ? "🏆" : stats.totalContributors >= 5 ? "⭐" : "✨"}
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs max-w-[200px]">
          많은 사람이 검토한 답변은 더 신뢰할 수 있습니다
        </TooltipContent>
      </Tooltip>
    </motion.div>
  );
}

// AI 답변 헤더에 표시할 간단한 버전
export function AIAnswerHeader({ qaSet, message }: { qaSet: QASetWithMessages; message: MessageData }) {
  const stats = useMemo(() => calculateContributionStats(qaSet, message), [qaSet, message]);
  const hasContributions = stats.totalContributors > 0 || (message.opinions?.length || 0) > 0;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">🤖 AI 답변</span>

      {message.isImproved && (
        <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-[10px]">
          ✏️ 수정됨
        </span>
      )}

      {hasContributions && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-[10px] cursor-help">
              👥 {stats.totalContributors}명 검토
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <div className="space-y-1">
              {stats.reviewers > 0 && <div>👣 {stats.reviewers}명 발자국</div>}
              {stats.improvers > 0 && <div>✏️ {stats.improvers}개 의견</div>}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

// 집단지성 품질 점수 표시
export function CollectiveQualityBadge({ qaSet }: { qaSet: QASetWithMessages }) {
  const stats = useMemo(() => calculateContributionStats(qaSet), [qaSet]);

  // 점수 계산: 기본 50 + 검토자당 5 (최대 100)
  const baseScore = 50;
  const contributorBonus = Math.min(50, stats.totalContributors * 5);
  const score = baseScore + contributorBonus;

  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-green-600 dark:text-green-400";
    if (s >= 60) return "text-blue-600 dark:text-blue-400";
    return "text-gray-600 dark:text-gray-400";
  };

  const getScoreLabel = (s: number) => {
    if (s >= 80) return "검증됨";
    if (s >= 60) return "검토중";
    return "신규";
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`inline-flex items-center gap-1 text-xs font-medium ${getScoreColor(score)} cursor-help`}>
          <span className="text-base">
            {score >= 80 ? "🏅" : score >= 60 ? "📊" : "🆕"}
          </span>
          <span>{getScoreLabel(score)}</span>
          <span className="text-[10px] opacity-70">({score}점)</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs max-w-[220px]">
        <div className="space-y-1">
          <div className="font-medium">집단지성 품질 점수</div>
          <div>기본: {baseScore}점</div>
          <div>검토 보너스: +{contributorBonus}점 ({stats.totalContributors}명)</div>
          <div className="text-muted-foreground pt-1">
            더 많은 사람이 검토할수록 점수가 올라갑니다
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
