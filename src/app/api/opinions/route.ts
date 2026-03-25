import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// POST /api/opinions - Create opinion node
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content, contentHtml, contentJson, targetMessageId, targetQASetId, relationType } = await req.json();

  // content 또는 contentHtml 중 하나는 필수
  const plainContent = content?.trim() || "";
  const htmlContent = contentHtml?.trim() || "";

  if (!plainContent && !htmlContent) {
    return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });
  }

  // 의견 노드 생성
  const opinion = await prisma.opinionNode.create({
    data: {
      content: plainContent || htmlContent.replace(/<[^>]*>/g, "").slice(0, 500), // HTML에서 평문 추출 (fallback)
      contentHtml: htmlContent || null,
      contentJson: contentJson ? JSON.stringify(contentJson) : null,
      userId: session.user.id,
    },
    include: {
      user: {
        select: { id: true, name: true, image: true },
      },
    },
  });

  // 관계 생성 (targetMessageId 또는 targetQASetId가 있으면)
  if (targetMessageId || targetQASetId) {
    await prisma.nodeRelation.create({
      data: {
        sourceOpinionId: opinion.id,
        targetMessageId: targetMessageId || null,
        targetQASetId: targetMessageId ? null : targetQASetId, // Message가 있으면 QASet 연결 안함
        relationType: relationType || "comment",
        isAIGenerated: false,
      },
    });
  }

  return NextResponse.json(opinion);
}

// GET /api/opinions?messageId=xxx - Get opinions for a message
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const messageId = searchParams.get("messageId");

  if (!messageId) {
    return NextResponse.json({ error: "messageId required" }, { status: 400 });
  }

  const relations = await prisma.nodeRelation.findMany({
    where: { targetMessageId: messageId },
    include: {
      sourceOpinion: {
        include: {
          user: {
            select: { id: true, name: true, image: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const opinions = relations
    .filter((r) => r.sourceOpinion)
    .map((r) => ({
      id: r.sourceOpinion!.id,
      content: r.sourceOpinion!.content,
      contentHtml: r.sourceOpinion!.contentHtml,
      relationType: r.relationType,
      user: r.sourceOpinion!.user,
      createdAt: r.sourceOpinion!.createdAt,
    }));

  return NextResponse.json(opinions);
}
