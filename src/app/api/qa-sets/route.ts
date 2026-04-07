import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { grantPioneerReward } from "@/lib/engine/footprint-rewards";
import { NextRequest, NextResponse } from "next/server";

// GET /api/qa-sets - List Q&A sets (개인화 피드 지원)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const shared = searchParams.get("shared") === "true";
  const sort = searchParams.get("sort") || "recent";
  const limit = parseInt(searchParams.get("limit") || "20");
  const page = parseInt(searchParams.get("page") || "1");
  const personalized = searchParams.get("personalized") !== "false"; // 기본 true

  const session = await auth();

  const where: { isShared?: boolean; creatorId?: string } = {};

  if (shared) {
    where.isShared = true;
  } else if (session?.user?.id) {
    where.creatorId = session.user.id;
  } else {
    return NextResponse.json({ qaSets: [] });
  }

  const orderBy =
    sort === "trending"
      ? { totalInvested: "desc" as const }
      : sort === "top"
      ? { investorCount: "desc" as const }
      : { createdAt: "desc" as const };

  // 사용자 관심 클러스터 가져오기 (개인화용)
  let userClusterIds: string[] = [];
  if (session?.user?.id && personalized) {
    const contributions = await prisma.userTopicContribution.findMany({
      where: { userId: session.user.id },
      orderBy: { topicAuthority: "desc" },
      take: 5, // 상위 5개 관심 클러스터
      select: { topicClusterId: true },
    });
    userClusterIds = contributions.map(c => c.topicClusterId);
  }

  const qaSets = await prisma.qASet.findMany({
    where,
    orderBy,
    take: limit * 2, // 개인화 정렬 위해 더 가져옴
    skip: (page - 1) * limit,
    include: {
      creator: {
        select: { id: true, name: true, image: true },
      },
      tags: {
        include: { tag: { select: { name: true, slug: true } } },
      },
      // AI 답변 (첫 번째 assistant 메시지)
      messages: {
        where: { role: "assistant" },
        take: 1,
        orderBy: { createdAt: "asc" },
        select: { content: true, role: true },
      },
      _count: { select: { messages: true } },
    },
  });

  // 각 QASet에 의견 수 추가
  const qaSetIds = qaSets.map(q => q.id);
  const opinionCounts = await prisma.nodeRelation.groupBy({
    by: ["targetQASetId"],
    where: { targetQASetId: { in: qaSetIds } },
    _count: true,
  });
  const opinionCountMap = new Map(opinionCounts.map(c => [c.targetQASetId, c._count]));

  let enrichedQASets = qaSets.map(qa => ({
    ...qa,
    opinionCount: opinionCountMap.get(qa.id) ?? 0,
    isPersonalized: userClusterIds.includes(qa.topicClusterId ?? ""),
  }));

  // 개인화 정렬: 관심 클러스터 Q&A 우선
  if (userClusterIds.length > 0 && personalized) {
    enrichedQASets.sort((a, b) => {
      const aMatch = a.isPersonalized ? 1 : 0;
      const bMatch = b.isPersonalized ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch; // 관심 클러스터 우선
      return 0; // 나머지는 기존 정렬 유지
    });
  }

  // limit 적용
  enrichedQASets = enrichedQASets.slice(0, limit);

  return NextResponse.json({ qaSets: enrichedQASets });
}

// POST /api/qa-sets - Create new Q&A set
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title } = await req.json();

  const qaSet = await prisma.qASet.create({
    data: {
      title: title || null,
      creatorId: session.user.id,
    },
    include: {
      creator: {
        select: { id: true, name: true, image: true, trustLevel: true },
      },
      messages: true,
      tags: {
        include: { tag: { select: { id: true, name: true, slug: true } } },
      },
    },
  });

  // 개척자 보상 (+10 발자국)
  grantPioneerReward(session.user.id, qaSet.id).catch(console.error);

  return NextResponse.json(qaSet);
}
