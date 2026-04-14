"use client";

import { useState, useEffect, useRef } from "react";
import { SLASH_COMMANDS, BLOCK_CONFIG, BlockType } from "@/types/knowledge-block";
import { Command, Search } from "lucide-react";

interface SlashCommandPaletteProps {
  position: { x: number; y: number };
  onSelect: (commandId: string) => void;
  onClose: () => void;
}

export function SlashCommandPalette({ position, onSelect, onClose }: SlashCommandPaletteProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 필터링된 명령어
  const filteredCommands = SLASH_COMMANDS.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(search.toLowerCase()) ||
      cmd.description.toLowerCase().includes(search.toLowerCase())
  );

  // 포커스
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // 키보드 네비게이션
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            onSelect(filteredCommands[selectedIndex].id);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [filteredCommands, selectedIndex, onSelect, onClose]);

  // 검색 변경 시 선택 리셋
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  return (
    <div
      ref={containerRef}
      className="fixed z-50 animate-in fade-in zoom-in-95 duration-200"
      style={{
        left: Math.min(position.x + 100, window.innerWidth - 320),
        top: Math.min(position.y + 100, window.innerHeight - 400),
      }}
    >
      <div className="w-72 bg-background/95 backdrop-blur-xl border rounded-xl shadow-2xl overflow-hidden">
        {/* 검색 입력 */}
        <div className="p-3 border-b">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="명령어 검색..."
              className="flex-1 bg-transparent border-none outline-none text-sm"
            />
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] text-muted-foreground">
              ESC
            </kbd>
          </div>
        </div>

        {/* 명령어 목록 */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              검색 결과가 없습니다
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCommands.map((cmd, index) => {
                const config = cmd.blockType ? BLOCK_CONFIG[cmd.blockType] : null;
                return (
                  <button
                    key={cmd.id}
                    onClick={() => onSelect(cmd.id)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left
                      transition-all duration-150
                      ${index === selectedIndex
                        ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                        : "hover:bg-muted/50"
                      }
                    `}
                  >
                    {/* 이모지 */}
                    <div
                      className={`
                        w-9 h-9 rounded-lg flex items-center justify-center text-lg
                        transition-transform duration-150
                        ${index === selectedIndex ? "scale-110" : ""}
                      `}
                      style={{
                        backgroundColor: config?.bgColor ?? "rgba(107, 114, 128, 0.1)",
                      }}
                    >
                      {cmd.emoji}
                    </div>

                    {/* 텍스트 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{cmd.label}</span>
                        {cmd.shortcut && (
                          <kbd className="h-5 px-1.5 rounded border bg-muted font-mono text-[10px] text-muted-foreground">
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {cmd.description}
                      </p>
                    </div>

                    {/* 선택 인디케이터 */}
                    {index === selectedIndex && (
                      <div className="w-1.5 h-8 rounded-full bg-indigo-500" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 푸터 - 힌트 */}
        <div className="p-2 border-t bg-muted/30">
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border bg-background text-[10px]">↑↓</kbd>
              이동
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border bg-background text-[10px]">Enter</kbd>
              선택
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border bg-background text-[10px]">ESC</kbd>
              닫기
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
