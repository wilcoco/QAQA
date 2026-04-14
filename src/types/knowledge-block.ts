// Knowledge Block 타입 정의
// Railway-style 블록 에디터를 위한 타입

export type BlockType =
  | "folder"        // 📁 폴더/그룹
  | "question"      // 📄 질문
  | "ai_answer"     // 🤖 AI 답변
  | "human_answer"  // ✍️ 인간 답변
  | "insight"       // 💡 인사이트
  | "opinion"       // 💬 의견
  | "reference"     // 🔗 참조 링크
  | "synthesis";    // 📋 합성 요약

export type LinkType =
  | "reference"     // 일반 참조
  | "extends"       // 확장/발전
  | "contradicts"   // 반박/모순
  | "supports"      // 지지/근거
  | "derived_from"  // 파생
  | "related";      // 관련

export type LinkStyle = "solid" | "dashed" | "dotted";

// 블록 타입별 설정
export const BLOCK_CONFIG: Record<BlockType, {
  emoji: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}> = {
  folder: {
    emoji: "📁",
    label: "폴더",
    color: "#f97316",
    bgColor: "rgba(249, 115, 22, 0.1)",
    borderColor: "rgba(249, 115, 22, 0.3)",
    description: "관련 블록들을 그룹으로 묶습니다",
  },
  question: {
    emoji: "📄",
    label: "질문",
    color: "#3b82f6",
    bgColor: "rgba(59, 130, 246, 0.1)",
    borderColor: "rgba(59, 130, 246, 0.3)",
    description: "사용자가 던진 질문",
  },
  ai_answer: {
    emoji: "🤖",
    label: "AI 답변",
    color: "#6b7280",
    bgColor: "rgba(107, 114, 128, 0.1)",
    borderColor: "rgba(107, 114, 128, 0.3)",
    description: "AI가 생성한 답변",
  },
  human_answer: {
    emoji: "✍️",
    label: "인간 답변",
    color: "#eab308",
    bgColor: "rgba(234, 179, 8, 0.1)",
    borderColor: "rgba(234, 179, 8, 0.3)",
    description: "사람이 직접 작성한 답변",
  },
  insight: {
    emoji: "💡",
    label: "인사이트",
    color: "#a855f7",
    bgColor: "rgba(168, 85, 247, 0.1)",
    borderColor: "rgba(168, 85, 247, 0.3)",
    description: "가치있는 발견이나 통찰",
  },
  opinion: {
    emoji: "💬",
    label: "의견",
    color: "#22c55e",
    bgColor: "rgba(34, 197, 94, 0.1)",
    borderColor: "rgba(34, 197, 94, 0.3)",
    description: "보충, 반박, 질문 등 의견",
  },
  reference: {
    emoji: "🔗",
    label: "참조",
    color: "#14b8a6",
    bgColor: "rgba(20, 184, 166, 0.1)",
    borderColor: "rgba(20, 184, 166, 0.3)",
    description: "외부 링크나 다른 블록 참조",
  },
  synthesis: {
    emoji: "📋",
    label: "합성",
    color: "#ec4899",
    bgColor: "rgba(236, 72, 153, 0.1)",
    borderColor: "rgba(236, 72, 153, 0.3)",
    description: "AI가 정리한 종합 요약",
  },
};

// 링크 타입별 설정
export const LINK_CONFIG: Record<LinkType, {
  label: string;
  color: string;
  style: LinkStyle;
  emoji: string;
}> = {
  reference: {
    label: "참조",
    color: "#6b7280",
    style: "solid",
    emoji: "→",
  },
  extends: {
    label: "확장",
    color: "#3b82f6",
    style: "solid",
    emoji: "↗",
  },
  contradicts: {
    label: "반박",
    color: "#ef4444",
    style: "dashed",
    emoji: "⚡",
  },
  supports: {
    label: "지지",
    color: "#22c55e",
    style: "solid",
    emoji: "✓",
  },
  derived_from: {
    label: "파생",
    color: "#a855f7",
    style: "dotted",
    emoji: "◇",
  },
  related: {
    label: "관련",
    color: "#6b7280",
    style: "dashed",
    emoji: "~",
  },
};

// 블록 링크 인터페이스
export interface BlockLinkData {
  id: string;
  sourceId: string;
  targetId: string;
  linkType: LinkType;
  label?: string;
  linkText?: string;
  context?: string;
  color?: string;
  style: LinkStyle;
  controlX?: number;
  controlY?: number;
}

// React Flow용 노드 데이터 (Record<string, unknown> 호환)
export interface BlockNodeData {
  [key: string]: unknown;

  id: string;
  blockType: BlockType;
  title: string;
  content?: string;
  contentHtml?: string;
  emoji?: string;
  color?: string;

  // 연결된 엔티티
  qaSetId?: string;
  messageId?: string;
  opinionNodeId?: string;
  externalUrl?: string;

  // 계층 정보
  parentId?: string;
  orderIndex: number;

  // 캔버스 위치
  posX: number;
  posY: number;
  width: number;
  height: number;
  isCollapsed: boolean;

  // 메타
  topicClusterId?: string;
  isPinned: boolean;
  viewCount: number;
  citationCount: number;

  // 관계
  creator?: {
    id: string;
    name: string | null;
    image: string | null;
  };

  createdAt: string;
  updatedAt: string;

  // 인터랙션 상태
  isSelected?: boolean;
  isHovered?: boolean;
  isDragging?: boolean;
  isEditing?: boolean;

  // 콜백
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onLink?: (id: string) => void;
  onCollapse?: (id: string) => void;
  onPin?: (id: string) => void;
}

// KnowledgeBlockData는 BlockNodeData의 alias
export type KnowledgeBlockData = BlockNodeData;

// 슬래시 명령어
export interface SlashCommand {
  id: string;
  label: string;
  emoji: string;
  description: string;
  shortcut?: string;
  action: string;
  blockType?: BlockType;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { id: "question", label: "질문", emoji: "📄", description: "새 질문 블록", blockType: "question", action: "create" },
  { id: "insight", label: "인사이트", emoji: "💡", description: "인사이트로 마킹", blockType: "insight", action: "create" },
  { id: "opinion", label: "의견", emoji: "💬", description: "의견 추가", blockType: "opinion", action: "create" },
  { id: "folder", label: "폴더", emoji: "📁", description: "새 폴더 생성", blockType: "folder", action: "create" },
  { id: "link", label: "링크", emoji: "🔗", description: "링크 삽입", shortcut: "Cmd+L", action: "link" },
  { id: "reference", label: "참조", emoji: "📎", description: "다른 블록 참조", blockType: "reference", action: "create" },
  { id: "synthesis", label: "요약", emoji: "📋", description: "AI 요약 생성", blockType: "synthesis", action: "synthesize" },
  { id: "merge", label: "병합", emoji: "🔀", description: "블록 병합", action: "merge" },
  { id: "move", label: "이동", emoji: "📁", description: "폴더로 이동", action: "move" },
];

// 키보드 단축키
export const KEYBOARD_SHORTCUTS = {
  search: { key: "k", meta: true, label: "빠른 검색" },
  newBlock: { key: "n", meta: true, label: "새 블록" },
  duplicate: { key: "d", meta: true, label: "복제" },
  link: { key: "l", meta: true, label: "링크 삽입" },
  delete: { key: "Backspace", label: "삭제" },
  escape: { key: "Escape", label: "취소" },
  indent: { key: "Tab", label: "들여쓰기" },
  outdent: { key: "Tab", shift: true, label: "내어쓰기" },
  up: { key: "ArrowUp", label: "위로" },
  down: { key: "ArrowDown", label: "아래로" },
  enter: { key: "Enter", label: "열기/편집" },
  slash: { key: "/", label: "명령어" },
};
