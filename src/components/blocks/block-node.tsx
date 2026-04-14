"use client";

import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position } from "@xyflow/react";
import { BlockNodeData, BLOCK_CONFIG, BlockType } from "@/types/knowledge-block";
import { Pin, ChevronDown, ChevronRight, Link2, Copy, Trash2, Edit3 } from "lucide-react";

interface KnowledgeBlockNodeProps {
  data: BlockNodeData;
  selected?: boolean;
}

// 블록 노드 컴포넌트
function KnowledgeBlockNodeComponent({ data, selected }: KnowledgeBlockNodeProps) {
  const config = BLOCK_CONFIG[data.blockType as BlockType];
  const [isHovered, setIsHovered] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [localTitle, setLocalTitle] = useState(data.title);
  const [localContent, setLocalContent] = useState(data.content ?? "");
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // 편집 모드일 때 포커스
  useEffect(() => {
    if (data.isEditing && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [data.isEditing]);

  // 접힌 상태
  if (data.isCollapsed) {
    return (
      <div
        className="relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* 연결 핸들 */}
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
        />
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
        />

        {/* 접힌 블록 */}
        <div
          className={`
            px-3 py-2 rounded-lg border-2 cursor-pointer
            transition-all duration-200 ease-out
            ${selected ? "ring-2 ring-indigo-400 ring-offset-2" : ""}
            hover:shadow-md hover:scale-[1.02]
          `}
          style={{
            backgroundColor: config.bgColor,
            borderColor: selected ? config.color : config.borderColor,
          }}
          onClick={() => data.onCollapse?.(data.id)}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{data.emoji ?? config.emoji}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium truncate max-w-[160px]">{data.title}</span>
            {data.isPinned && <Pin className="w-3 h-3 text-amber-500" />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative group"
      onMouseEnter={() => {
        setIsHovered(true);
        setShowQuickActions(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowQuickActions(false);
      }}
    >
      {/* 연결 핸들 - 왼쪽 (입력) */}
      <Handle
        type="target"
        position={Position.Left}
        className={`
          !w-3 !h-3 !border-2 !border-white
          transition-all duration-200
          ${isHovered ? "!w-4 !h-4 !bg-indigo-500" : "!bg-gray-400"}
        `}
      />

      {/* 연결 핸들 - 오른쪽 (출력) */}
      <Handle
        type="source"
        position={Position.Right}
        className={`
          !w-3 !h-3 !border-2 !border-white
          transition-all duration-200
          ${isHovered ? "!w-4 !h-4 !bg-indigo-500" : "!bg-gray-400"}
        `}
      />

      {/* 메인 블록 */}
      <div
        className={`
          rounded-xl border-2 overflow-hidden
          transition-all duration-200 ease-out
          ${selected ? "ring-2 ring-indigo-400 ring-offset-2 shadow-lg" : ""}
          ${isHovered ? "shadow-lg scale-[1.01]" : "shadow-sm"}
          ${data.isDragging ? "opacity-50 scale-105" : ""}
        `}
        style={{
          backgroundColor: "var(--background)",
          borderColor: selected ? config.color : config.borderColor,
          minWidth: 200,
          maxWidth: 320,
        }}
      >
        {/* 헤더 */}
        <div
          className="px-3 py-2 flex items-center gap-2 cursor-move"
          style={{ backgroundColor: config.bgColor }}
        >
          {/* 이모지 */}
          <span className="text-xl select-none">{data.emoji ?? config.emoji}</span>

          {/* 타이틀 */}
          {data.isEditing ? (
            <input
              ref={titleRef}
              type="text"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onBlur={() => {
                // TODO: 저장
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                  contentRef.current?.focus();
                }
                if (e.key === "Escape") {
                  setLocalTitle(data.title);
                }
              }}
              className="flex-1 bg-transparent border-none outline-none font-medium text-sm"
              placeholder="제목 입력..."
            />
          ) : (
            <span className="flex-1 font-medium text-sm truncate">{data.title}</span>
          )}

          {/* 고정 아이콘 */}
          {data.isPinned && <Pin className="w-4 h-4 text-amber-500 shrink-0" />}

          {/* 접기 버튼 */}
          <button
            onClick={() => data.onCollapse?.(data.id)}
            className="p-1 rounded hover:bg-black/10 transition-colors"
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="px-3 py-2 min-h-[60px]">
          {data.isEditing ? (
            <textarea
              ref={contentRef}
              value={localContent}
              onChange={(e) => setLocalContent(e.target.value)}
              onBlur={() => {
                // TODO: 저장
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setLocalContent(data.content ?? "");
                }
              }}
              className="w-full bg-transparent border-none outline-none text-sm resize-none min-h-[60px]"
              placeholder="내용 입력... ([[링크]]로 연결)"
              rows={3}
            />
          ) : data.content ? (
            <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">
              {data.content}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground/50 italic">
              클릭하여 편집...
            </p>
          )}
        </div>

        {/* 푸터 - 통계 */}
        {(data.viewCount > 0 || data.citationCount > 0) && (
          <div className="px-3 py-1.5 border-t flex items-center gap-3 text-xs text-muted-foreground">
            {data.viewCount > 0 && <span>👁 {data.viewCount}</span>}
            {data.citationCount > 0 && <span>🔗 {data.citationCount}</span>}
          </div>
        )}
      </div>

      {/* 퀵 액션 (호버 시) */}
      {showQuickActions && !data.isEditing && (
        <div
          className={`
            absolute -top-10 left-1/2 -translate-x-1/2
            flex items-center gap-1
            px-2 py-1.5 rounded-lg
            bg-background/95 backdrop-blur border shadow-lg
            animate-in fade-in slide-in-from-bottom-2 duration-200
          `}
        >
          <button
            onClick={() => data.onEdit?.(data.id)}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            title="편집"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => data.onLink?.(data.id)}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            title="연결"
          >
            <Link2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => data.onDuplicate?.(data.id)}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            title="복제"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => data.onDelete?.(data.id)}
            className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-950 text-red-500 transition-colors"
            title="삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 타입 배지 (호버 시) */}
      {isHovered && (
        <div
          className={`
            absolute -bottom-6 left-1/2 -translate-x-1/2
            px-2 py-0.5 rounded-full text-xs font-medium
            animate-in fade-in duration-200
          `}
          style={{
            backgroundColor: config.bgColor,
            color: config.color,
            border: `1px solid ${config.borderColor}`,
          }}
        >
          {config.label}
        </div>
      )}
    </div>
  );
}

export const KnowledgeBlockNode = memo(KnowledgeBlockNodeComponent);
