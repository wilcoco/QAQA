import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/qa-sets/[id]/human-answer
 * 인간이 직접 답변을 작성. AI 대신 사람이 답변하는 경우.
 * - role: "assistant" (기존 QA와 동일한 형태로 노출)
 * - isGapResponse: true, isInsight: true (인간 고유 지식으로 표시)
 * - afterMessageId: 특정 메시지 뒤에 답변 삽입 (선택사항)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { content, afterMessageId } = await req.json();

  if (!content?.trim()) {
    return NextResponse.json({ error: "답변 내용이 필요합니다." }, { status: 400 });
  }

  const qaSet = await prisma.qASet.findUnique({
    where: { id },
    include: { messages: { orderBy: { orderIndex: "asc" } } },
  });

  if (!qaSet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 공유된 QASet이나 AI 커뮤니티 질문은 누구나 답변 가능, 그 외에는 본인만
  const isAICommunityQuestion = qaSet.isAIGenerated && qaSet.aiQuestionType === "community";
  const canAnswer = qaSet.isShared || isAICommunityQuestion || qaSet.creatorId === session.user.id;
  if (!canAnswer) {
    return NextResponse.json({ error: "답변 권한이 없습니다." }, { status: 403 });
  }

  // afterMessageId가 있으면 해당 메시지 뒤에 삽입, 없으면 맨 끝에 추가
  let insertIndex = qaSet.messages.length;

  if (afterMessageId) {
    const afterMessage = qaSet.messages.find(m => m.id === afterMessageId);
    if (afterMessage) {
      insertIndex = afterMessage.orderIndex + 1;

      // 이후 메시지들의 orderIndex를 1씩 증가
      await prisma.message.updateMany({
        where: {
          qaSetId: id,
          orderIndex: { gte: insertIndex },
        },
        data: {
          orderIndex: { increment: 1 },
        },
      });
    }
  }

  // 인간 답변을 assistant role로 저장 (기존 QA와 동일하게 노출되도록)
  await prisma.message.create({
    data: {
      qaSetId: id,
      role: "assistant",
      content: content.trim(),
      orderIndex: insertIndex,
      isGapResponse: true,
      isInsight: true,
      isHumanAuthored: true,
      insightReason: `${session.user.name ?? "사용자"}가 직접 작성한 인간 답변`,
      relationSimple: "인간답변", // 관계 표시
    },
  });

  // 전체 QASet 반환
  const updated = await prisma.qASet.findUnique({
    where: { id },
    include: {
      creator: {
        select: { id: true, name: true, image: true, trustLevel: true },
      },
      messages: {
        orderBy: { orderIndex: "asc" },
      },
      tags: {
        include: { tag: { select: { id: true, name: true, slug: true } } },
      },
      investments: {
        where: { isActive: true },
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
        orderBy: { position: "asc" },
      },
      parentQASet: {
        select: {
          id: true,
          title: true,
          creator: { select: { id: true, name: true, authorityScore: true } },
        },
      },
    },
  });

  return NextResponse.json(updated);
}
