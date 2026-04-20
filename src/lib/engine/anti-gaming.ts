/**
 * Anti-Gaming Rules for Investment System
 *
 * 악의적 투자 패턴 방지:
 *   1. 자기 투자 방지 — 제작자는 본인 Q&A에 추가 투자 불가
 *   2. 시간당 투자 건수 제한 — 3건/시간 (유저 + IP 각각)
 *   3. 일일 투자 건수 제한 — 10건/일 (유저 + IP 각각)
 *   4. 동일 Q&A 재투자 쿨다운 — 24시간
 *   5. 신규 계정 워밍업 — 가입 7일 이내 최대 투자액 50
 *   6. 상호 투자 차단 — A→B, B→A 동시 투자 24시간 내 차단
 *   7. IP 기반 다중계정 방지 — 같은 IP에서 다른 유저로 투자 시 제한
 */

import { PrismaClient } from "@prisma/client";

// ─── 상수 ───
export const MAX_INVESTMENTS_PER_HOUR = 3;
export const MAX_INVESTMENTS_PER_DAY  = 10;
export const MAX_INVESTMENTS_PER_HOUR_IP = 5;  // IP당 시간 제한 (다중계정 고려)
export const MAX_INVESTMENTS_PER_DAY_IP  = 15; // IP당 일일 제한
export const REINVESTMENT_COOLDOWN_HOURS = 24;
export const WARMUP_DAYS = 7;
export const WARMUP_MAX_INVESTMENT = 50;

export interface AntiGamingViolation {
  code: string;
  message: string;
  statusCode: number;
}

/**
 * 투자 전 모든 anti-gaming 규칙을 검사.
 * 위반 시 AntiGamingViolation 반환, 정상이면 null.
 */
export async function checkInvestmentRules(
  prisma: PrismaClient,
  userId: string,
  qaSetId: string,
  qaSetCreatorId: string,
  amount: number,
  userCreatedAt: Date,
  isNegative: boolean = false,
  ipAddress?: string | null,
  isAIGenerated: boolean = false,
  isShared: boolean = false
): Promise<AntiGamingViolation | null> {
  // 1. 자기 투자 방지 (마이너스 투자는 별도 처리됨 — API 라우트에서)
  // 예외:
  // - AI 생성 질문은 누구나 투자 가능
  // - 이미 공유된 Q&A는 창작자도 추가 투자 가능 (처음 공유할 때만 share API 사용)
  // - 미공유 Q&A에서 창작자가 투자하면 자동 공유됨 (processInvestment에서 처리)
  // 따라서 공유된 Q&A나 AI 생성 질문에서는 자기투자 차단 안함
  if (!isNegative && userId === qaSetCreatorId && !isAIGenerated && !isShared) {
    return {
      code: "SELF_INVESTMENT",
      message: "본인이 만든 Q&A에는 추가 투자할 수 없습니다. (공유 시 첫 투자만 허용)",
      statusCode: 403,
    };
  }

  const now = new Date();

  // 2. 신규 계정 워밍업: 가입 7일 이내 최대 50
  const accountAgeDays = (now.getTime() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (accountAgeDays < WARMUP_DAYS && amount > WARMUP_MAX_INVESTMENT) {
    return {
      code: "WARMUP_LIMIT",
      message: `가입 ${WARMUP_DAYS}일 이내에는 1회 최대 ${WARMUP_MAX_INVESTMENT} 💰만 투자할 수 있습니다. (현재 계정 나이: ${Math.floor(accountAgeDays)}일)`,
      statusCode: 400,
    };
  }

  // 3. 동일 Q&A 재투자 쿨다운 (같은 방향의 투자만 체크)
  const cooldownFrom = new Date(now.getTime() - REINVESTMENT_COOLDOWN_HOURS * 60 * 60 * 1000);
  const recentSameQA = await prisma.investment.count({
    where: {
      userId,
      qaSetId,
      isNegative,
      createdAt: { gte: cooldownFrom },
    },
  });
  if (recentSameQA > 0) {
    return {
      code: "REINVESTMENT_COOLDOWN",
      message: `동일 Q&A에 ${isNegative ? "재반대 투자" : "재투자"}하려면 ${REINVESTMENT_COOLDOWN_HOURS}시간을 기다려야 합니다.`,
      statusCode: 429,
    };
  }

  // 4. 시간당 투자 건수 제한 (플러스+마이너스 합산)
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const investmentsLastHour = await prisma.investment.count({
    where: {
      userId,
      createdAt: { gte: oneHourAgo },
    },
  });
  if (investmentsLastHour >= MAX_INVESTMENTS_PER_HOUR) {
    return {
      code: "RATE_LIMIT_HOUR",
      message: `시간당 최대 ${MAX_INVESTMENTS_PER_HOUR}건만 활동할 수 있습니다. 잠시 후 다시 시도해주세요.`,
      statusCode: 429,
    };
  }

  // 5. 일일 투자 건수 제한 (합산)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const investmentsLastDay = await prisma.investment.count({
    where: {
      userId,
      createdAt: { gte: oneDayAgo },
    },
  });
  if (investmentsLastDay >= MAX_INVESTMENTS_PER_DAY) {
    return {
      code: "RATE_LIMIT_DAY",
      message: `하루 최대 ${MAX_INVESTMENTS_PER_DAY}건만 활동할 수 있습니다. 내일 다시 시도해주세요.`,
      statusCode: 429,
    };
  }

  // 6. IP 기반 다중계정 방지 (IP가 있는 경우에만)
  if (ipAddress) {
    // 6a. 같은 IP에서 시간당 투자 제한
    const ipInvestmentsLastHour = await prisma.investment.count({
      where: {
        ipAddress,
        createdAt: { gte: oneHourAgo },
      },
    });
    if (ipInvestmentsLastHour >= MAX_INVESTMENTS_PER_HOUR_IP) {
      return {
        code: "IP_RATE_LIMIT_HOUR",
        message: `동일 네트워크에서 시간당 ${MAX_INVESTMENTS_PER_HOUR_IP}건 이상 활동할 수 없습니다.`,
        statusCode: 429,
      };
    }

    // 6b. 같은 IP에서 일일 투자 제한
    const ipInvestmentsLastDay = await prisma.investment.count({
      where: {
        ipAddress,
        createdAt: { gte: oneDayAgo },
      },
    });
    if (ipInvestmentsLastDay >= MAX_INVESTMENTS_PER_DAY_IP) {
      return {
        code: "IP_RATE_LIMIT_DAY",
        message: `동일 네트워크에서 하루 ${MAX_INVESTMENTS_PER_DAY_IP}건 이상 활동할 수 없습니다.`,
        statusCode: 429,
      };
    }

    // 6c. 같은 IP에서 동일 QA에 다른 유저로 투자 시도 (의심스러운 패턴)
    const sameIPSameQA = await prisma.investment.findFirst({
      where: {
        ipAddress,
        qaSetId,
        userId: { not: userId }, // 다른 유저
        createdAt: { gte: oneDayAgo },
      },
    });
    if (sameIPSameQA) {
      return {
        code: "IP_DUPLICATE_QA",
        message: "동일 네트워크에서 이미 다른 계정으로 이 Q&A에 투자했습니다.",
        statusCode: 403,
      };
    }
  }

  return null; // 모든 검사 통과
}

/**
 * 상호 투자 차단 (A→B & B→A in 24h).
 * 위반 시 AntiGamingViolation 반환, 정상이면 null.
 */
export async function detectMutualInvestment(
  prisma: PrismaClient,
  investorId: string,
  qaSetId: string
): Promise<AntiGamingViolation | null> {
  const qaSet = await prisma.qASet.findUnique({
    where: { id: qaSetId },
    select: { creatorId: true },
  });
  if (!qaSet) return null;

  const creatorId = qaSet.creatorId;
  if (investorId === creatorId) return null; // self-invest is handled elsewhere

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Check if creator has invested in any of investor's QASets in last 24h
  const mutualInvestment = await prisma.investment.findFirst({
    where: {
      userId: creatorId,
      qaSet: { creatorId: investorId },
      createdAt: { gte: oneDayAgo },
    },
  });

  if (mutualInvestment) {
    console.warn(`[AntiGaming] 상호 투자 차단: ${investorId} ↔ ${creatorId} (Q&A: ${qaSetId})`);
    return {
      code: "MUTUAL_INVESTMENT",
      message: "상호 투자가 감지되었습니다. 24시간 내 서로의 Q&A에 투자할 수 없습니다.",
      statusCode: 403,
    };
  }
  return null;
}
