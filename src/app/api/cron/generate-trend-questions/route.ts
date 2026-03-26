import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { getFilteredTrends } from "@/lib/trends/google-trends";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const anthropic = new Anthropic();

/**
 * GET /api/cron/generate-trend-questions
 *
 * Cron job: Google Trends에서 트렌딩 주제를 가져와 AI 질문 생성
 * 매일 오전 9시 (KST) 실행 권장
 *
 * Query params:
 * - secret: CRON_SECRET과 일치해야 함
 * - count: 생성할 질문 수 (기본 5, 최대 10)
 * - geo: 국가 코드 (기본 KR)
 */
export async function GET(req: NextRequest) {
  // Secret 검증
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const count = Math.min(parseInt(req.nextUrl.searchParams.get("count") ?? "5"), 10);
  const geo = req.nextUrl.searchParams.get("geo") ?? "KR";

  try {
    // 1. Google Trends에서 주제 수집
    const topics = await getFilteredTrends(geo, 20);

    if (topics.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No trending topics found",
        timestamp: new Date().toISOString(),
      });
    }

    // 2. 오늘 이미 생성된 질문 수 확인 (중복 방지)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = await prisma.qASet.count({
      where: {
        isAIGenerated: true,
        aiQuestionType: "trend",
        createdAt: { gte: today },
      },
    });

    if (todayCount >= 10) {
      return NextResponse.json({
        success: true,
        message: "Daily limit reached (10 questions)",
        todayCount,
        timestamp: new Date().toISOString(),
      });
    }

    const remainingCount = Math.min(count, 10 - todayCount);

    // 3. AI로 경험 기반 질문 생성
    const questions = await generateExperienceQuestions(topics, remainingCount);

    if (questions.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Failed to generate questions",
        topics,
        timestamp: new Date().toISOString(),
      });
    }

    // 4. 시스템 AI 사용자 확인/생성
    let systemAI = await prisma.user.findFirst({
      where: { isSystemAI: true },
    });

    if (!systemAI) {
      systemAI = await prisma.user.create({
        data: {
          name: "AI 질문봇",
          email: "ai-question-bot@system.local",
          isSystemAI: true,
          balance: 0,
        },
      });
    }

    // 5. QASet 생성
    const created = [];

    for (const q of questions) {
      const qaSet = await prisma.qASet.create({
        data: {
          title: q.question.slice(0, 100),
          creatorId: systemAI.id,
          isAIGenerated: true,
          aiQuestionType: "trend",
          firstAnswerRewardMultiplier: 3.0,
          isShared: true,
          sharedAt: new Date(),
          summary: q.reason,
          messages: {
            create: {
              role: "user",
              content: q.question,
              orderIndex: 0,
            },
          },
        },
      });

      created.push({
        id: qaSet.id,
        topic: q.topic,
        question: q.question,
      });
    }

    return NextResponse.json({
      success: true,
      geo,
      topics: topics.slice(0, 10),
      generated: created.length,
      questions: created,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Cron generate-trend-questions failed:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

interface GeneratedQuestion {
  topic: string;
  question: string;
  reason: string;
}

async function generateExperienceQuestions(
  topics: string[],
  count: number
): Promise<GeneratedQuestion[]> {
  const prompt = `당신은 Q&A 플랫폼의 질문 창작자입니다.

## 목표
주어진 트렌드 주제들을 보고, "실제 경험자만 답할 수 있는" 질문을 ${count}개 창작하세요.

## 주제 목록
${topics.map((t, i) => `${i + 1}. ${t}`).join("\n")}

## 질문 생성 원칙
1. **구체적 상황**: 막연한 질문 ❌, 구체적 상황 ✅
2. **감정/판단 포함**: 경험에서 우러난 판단 요청
3. **타겟팅**: "~하신 분?" 형태로 경험자 특정
4. **한국어**: 자연스러운 한국어

## 출력 형식 (JSON 배열)
[
  {
    "topic": "원본 트렌드 주제",
    "question": "생성된 질문",
    "reason": "왜 이 질문을 하는지"
  }
]

JSON만 출력하세요.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") return [];

    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    return JSON.parse(jsonMatch[0]).slice(0, count);
  } catch (error) {
    console.error("Failed to generate questions:", error);
    return [];
  }
}
