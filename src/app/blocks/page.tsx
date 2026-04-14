"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { BlockCanvasEnhanced } from "@/components/blocks/block-canvas-enhanced";
import { KnowledgeBlockData, BlockLinkData } from "@/types/knowledge-block";
import { Header } from "@/components/layout/header";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

// 데모용 초기 블록 데이터
const DEMO_BLOCKS: KnowledgeBlockData[] = [
  {
    id: "block-1",
    blockType: "folder",
    title: "React 상태관리",
    content: "React에서 상태를 관리하는 다양한 방법들",
    emoji: "📁",
    orderIndex: 0,
    posX: 100,
    posY: 100,
    width: 260,
    height: 100,
    isCollapsed: false,
    isPinned: true,
    viewCount: 156,
    citationCount: 23,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "block-2",
    blockType: "question",
    title: "useState vs useReducer",
    content: "언제 useState를 쓰고 언제 useReducer를 써야 하나요? 복잡한 상태 로직이 있을 때 기준이 궁금합니다.",
    emoji: "📄",
    orderIndex: 1,
    posX: 450,
    posY: 80,
    width: 280,
    height: 120,
    isCollapsed: false,
    isPinned: false,
    viewCount: 89,
    citationCount: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "block-3",
    blockType: "ai_answer",
    title: "AI 답변",
    content: "일반적으로 단순한 상태는 useState, 복잡한 상태 로직이나 여러 sub-value가 있을 때는 useReducer를 권장합니다. useReducer는 상태 업데이트 로직을 컴포넌트 외부로 분리할 수 있어 테스트하기도 좋습니다.",
    emoji: "🤖",
    orderIndex: 2,
    posX: 450,
    posY: 250,
    width: 280,
    height: 160,
    isCollapsed: false,
    isPinned: false,
    viewCount: 67,
    citationCount: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "block-4",
    blockType: "insight",
    title: "실무 인사이트",
    content: "프로덕션에서 5년간 써본 결과, 3개 이상의 관련 상태가 있으면 useReducer로 가는 게 유지보수에 좋았습니다. 단, 팀원들이 reducer 패턴에 익숙해야 합니다.",
    emoji: "💡",
    orderIndex: 3,
    posX: 800,
    posY: 180,
    width: 260,
    height: 140,
    isCollapsed: false,
    isPinned: false,
    viewCount: 234,
    citationCount: 45,
    creator: { id: "user-1", name: "김철수", image: null },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "block-5",
    blockType: "opinion",
    title: "반박 의견",
    content: "Context와 함께 쓸 때는 오히려 useState가 더 단순할 수 있습니다. useReducer + Context 조합은 오버엔지니어링이 될 수 있어요.",
    emoji: "💬",
    orderIndex: 4,
    posX: 800,
    posY: 380,
    width: 260,
    height: 120,
    isCollapsed: false,
    isPinned: false,
    viewCount: 45,
    citationCount: 8,
    creator: { id: "user-2", name: "박영희", image: null },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "block-6",
    blockType: "reference",
    title: "React 공식 문서",
    content: "useReducer 공식 가이드",
    externalUrl: "https://react.dev/reference/react/useReducer",
    emoji: "🔗",
    orderIndex: 5,
    posX: 450,
    posY: 450,
    width: 220,
    height: 80,
    isCollapsed: false,
    isPinned: false,
    viewCount: 23,
    citationCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// 데모용 연결 데이터
const DEMO_LINKS: BlockLinkData[] = [
  {
    id: "link-1",
    sourceId: "block-1",
    targetId: "block-2",
    linkType: "reference",
    label: "포함",
    style: "solid",
  },
  {
    id: "link-2",
    sourceId: "block-2",
    targetId: "block-3",
    linkType: "extends",
    label: "답변",
    style: "solid",
  },
  {
    id: "link-3",
    sourceId: "block-3",
    targetId: "block-4",
    linkType: "extends",
    label: "보완",
    style: "solid",
  },
  {
    id: "link-4",
    sourceId: "block-3",
    targetId: "block-5",
    linkType: "contradicts",
    label: "반박",
    style: "dashed",
  },
  {
    id: "link-5",
    sourceId: "block-3",
    targetId: "block-6",
    linkType: "reference",
    label: "출처",
    style: "dotted",
  },
];

export default function BlocksPage() {
  const { data: session, status } = useSession();
  const [blocks, setBlocks] = useState<KnowledgeBlockData[]>(DEMO_BLOCKS);
  const [links, setLinks] = useState<BlockLinkData[]>(DEMO_LINKS);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-4xl">📦</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* 상단 네비게이션 */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-14 z-40">
        <div className="container flex items-center gap-4 h-12 px-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>홈으로</span>
          </Link>

          <div className="flex-1" />

          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="font-medium">블록 에디터</span>
            <span className="text-muted-foreground">베타</span>
          </div>
        </div>
      </div>

      {/* 블록 캔버스 (향상된 버전) */}
      <div className="flex-1 relative">
        <BlockCanvasEnhanced
          initialBlocks={blocks}
          initialLinks={links}
          onBlocksChange={setBlocks}
          onLinksChange={setLinks}
        />
      </div>

      {/* 하단 상태바 */}
      <div className="border-t bg-muted/30 px-4 py-2">
        <div className="container flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>📦 {blocks.length}개 블록</span>
            <span>🔗 {links.length}개 연결</span>
          </div>
          <div className="flex items-center gap-4">
            <span>? : 단축키</span>
            <span>Z : 젠 모드</span>
            <span>/ : 명령어</span>
            <span>Cmd+N : 새 블록</span>
          </div>
        </div>
      </div>
    </div>
  );
}
