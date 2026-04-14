"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  FolderPlus,
  FileQuestion,
  Lightbulb,
  MessageCircle,
  Link2,
  FileText,
  Grid,
  Maximize,
  Search,
  Command,
} from "lucide-react";
import { BlockType, BLOCK_CONFIG } from "@/types/knowledge-block";

interface BlockToolbarProps {
  onAddBlock: (type: BlockType) => void;
  onToggleGrid: () => void;
  onZoomFit: () => void;
}

const QUICK_ADD_BLOCKS: { type: BlockType; icon: React.ReactNode }[] = [
  { type: "folder", icon: <FolderPlus className="w-4 h-4" /> },
  { type: "question", icon: <FileQuestion className="w-4 h-4" /> },
  { type: "insight", icon: <Lightbulb className="w-4 h-4" /> },
  { type: "opinion", icon: <MessageCircle className="w-4 h-4" /> },
  { type: "reference", icon: <Link2 className="w-4 h-4" /> },
];

export function BlockToolbar({ onAddBlock, onToggleGrid, onZoomFit }: BlockToolbarProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <div className="flex items-center gap-1 p-1.5 bg-background/95 backdrop-blur border rounded-xl shadow-lg">
      {/* 추가 버튼 그룹 */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setShowAddMenu(!showAddMenu)}
        >
          <Plus className="w-4 h-4" />
        </Button>

        {/* 추가 메뉴 드롭다운 */}
        {showAddMenu && (
          <div className="absolute top-full left-0 mt-1 p-2 bg-background border rounded-lg shadow-lg z-50 w-48 animate-in fade-in slide-in-from-top-2">
            <div className="text-xs text-muted-foreground font-medium mb-2 px-2">
              블록 추가
            </div>
            {Object.entries(BLOCK_CONFIG).map(([type, config]) => (
              <button
                key={type}
                onClick={() => {
                  onAddBlock(type as BlockType);
                  setShowAddMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-sm"
              >
                <span>{config.emoji}</span>
                <span>{config.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 구분선 */}
      <div className="w-px h-6 bg-border mx-1" />

      {/* 퀵 추가 버튼들 */}
      {QUICK_ADD_BLOCKS.map(({ type, icon }) => {
        const config = BLOCK_CONFIG[type];
        return (
          <Button
            key={type}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onAddBlock(type)}
            title={`${config.emoji} ${config.label} 추가`}
            style={{
              color: config.color,
            }}
          >
            {icon}
          </Button>
        );
      })}

      {/* 구분선 */}
      <div className="w-px h-6 bg-border mx-1" />

      {/* 뷰 컨트롤 */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onToggleGrid}
        title="그리드 토글"
      >
        <Grid className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onZoomFit}
        title="화면에 맞추기"
      >
        <Maximize className="w-4 h-4" />
      </Button>

      {/* 구분선 */}
      <div className="w-px h-6 bg-border mx-1" />

      {/* 검색 */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 gap-1.5 text-muted-foreground"
        title="검색 (Cmd+K)"
      >
        <Search className="w-4 h-4" />
        <span className="text-xs hidden sm:inline">검색</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
          <Command className="w-3 h-3" />K
        </kbd>
      </Button>
    </div>
  );
}
