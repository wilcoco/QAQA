"use client";

import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position } from "@xyflow/react";
import { motion, AnimatePresence } from "framer-motion";
import { BlockNodeData, BLOCK_CONFIG, BlockType } from "@/types/knowledge-block";
import { Pin, ChevronDown, ChevronRight, Link2, Copy, Trash2, Edit3, Sparkles, Zap } from "lucide-react";

interface KnowledgeBlockNodeProps {
  data: BlockNodeData;
  selected?: boolean;
}

// 블록 노드 애니메이션 버전
function KnowledgeBlockNodeAnimatedComponent({ data, selected }: KnowledgeBlockNodeProps) {
  const config = BLOCK_CONFIG[data.blockType as BlockType];
  const [isHovered, setIsHovered] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [localTitle, setLocalTitle] = useState(data.title);
  const [localContent, setLocalContent] = useState(data.content ?? "");
  const [ripplePos, setRipplePos] = useState<{ x: number; y: number } | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);

  // 편집 모드일 때 포커스
  useEffect(() => {
    if (data.isEditing && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [data.isEditing]);

  // 리플 이펙트
  const triggerRipple = (e: React.MouseEvent) => {
    if (!blockRef.current) return;
    const rect = blockRef.current.getBoundingClientRect();
    setRipplePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setTimeout(() => setRipplePos(null), 600);
  };

  // 접힌 상태
  if (data.isCollapsed) {
    return (
      <motion.div
        className="relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
      >
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

        <motion.div
          className="px-3 py-2 rounded-lg border-2 cursor-pointer"
          style={{
            backgroundColor: config.bgColor,
            borderColor: selected ? config.color : config.borderColor,
          }}
          animate={{
            boxShadow: selected
              ? `0 0 20px ${config.color}40`
              : isHovered
                ? `0 4px 12px rgba(0,0,0,0.1)`
                : "none",
          }}
          onClick={() => data.onCollapse?.(data.id)}
        >
          <div className="flex items-center gap-2">
            <motion.span
              className="text-lg"
              animate={{ rotate: isHovered ? [0, -10, 10, 0] : 0 }}
              transition={{ duration: 0.5 }}
            >
              {data.emoji ?? config.emoji}
            </motion.span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium truncate max-w-[160px]">{data.title}</span>
            {data.isPinned && (
              <motion.div animate={{ rotate: [0, 15, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                <Pin className="w-3 h-3 text-amber-500" />
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={blockRef}
      className="relative group"
      onMouseEnter={() => {
        setIsHovered(true);
        setShowQuickActions(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowQuickActions(false);
      }}
      onClick={triggerRipple}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      {/* 연결 핸들 - 왼쪽 */}
      <Handle
        type="target"
        position={Position.Left}
        className="!border-2 !border-white transition-all duration-200"
        style={{
          width: isHovered ? 14 : 10,
          height: isHovered ? 14 : 10,
          background: isHovered ? "#6366f1" : "#9ca3af",
        }}
      />

      {/* 연결 핸들 - 오른쪽 */}
      <Handle
        type="source"
        position={Position.Right}
        className="!border-2 !border-white transition-all duration-200"
        style={{
          width: isHovered ? 14 : 10,
          height: isHovered ? 14 : 10,
          background: isHovered ? "#6366f1" : "#9ca3af",
        }}
      />

      {/* 메인 블록 */}
      <motion.div
        className="rounded-xl border-2 overflow-hidden relative"
        style={{
          backgroundColor: "var(--background)",
          borderColor: selected ? config.color : config.borderColor,
          minWidth: 200,
          maxWidth: 320,
        }}
        animate={{
          boxShadow: selected
            ? `0 0 0 3px ${config.color}30, 0 10px 40px -10px rgba(0,0,0,0.3)`
            : isHovered
              ? "0 10px 40px -10px rgba(0,0,0,0.2)"
              : "0 2px 8px -2px rgba(0,0,0,0.1)",
        }}
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        {/* 리플 이펙트 */}
        <AnimatePresence>
          {ripplePos && (
            <motion.div
              className="absolute rounded-full pointer-events-none"
              style={{
                left: ripplePos.x,
                top: ripplePos.y,
                backgroundColor: config.color,
              }}
              initial={{ width: 0, height: 0, opacity: 0.4, x: 0, y: 0 }}
              animate={{ width: 300, height: 300, opacity: 0, x: -150, y: -150 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>

        {/* 헤더 */}
        <motion.div
          className="px-3 py-2 flex items-center gap-2 cursor-move relative overflow-hidden"
          style={{ backgroundColor: config.bgColor }}
        >
          {/* 반짝이 효과 (호버 시) */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              />
            )}
          </AnimatePresence>

          {/* 이모지 */}
          <motion.span
            className="text-xl select-none relative z-10"
            animate={{
              scale: isHovered ? [1, 1.2, 1] : 1,
              rotate: isHovered ? [0, -5, 5, 0] : 0,
            }}
            transition={{ duration: 0.5 }}
          >
            {data.emoji ?? config.emoji}
          </motion.span>

          {/* 타이틀 */}
          {data.isEditing ? (
            <input
              ref={titleRef}
              type="text"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                  contentRef.current?.focus();
                }
              }}
              className="flex-1 bg-transparent border-none outline-none font-medium text-sm relative z-10"
              placeholder="제목 입력..."
            />
          ) : (
            <span className="flex-1 font-medium text-sm truncate relative z-10">{data.title}</span>
          )}

          {/* 고정 아이콘 */}
          {data.isPinned && (
            <motion.div
              animate={{ rotate: [0, 15, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <Pin className="w-4 h-4 text-amber-500 shrink-0" />
            </motion.div>
          )}

          {/* 인사이트 표시 */}
          {data.blockType === "insight" && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Sparkles className="w-4 h-4 text-purple-500" />
            </motion.div>
          )}

          {/* 접기 버튼 */}
          <motion.button
            onClick={() => data.onCollapse?.(data.id)}
            className="p-1 rounded hover:bg-black/10 transition-colors relative z-10"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </motion.button>
        </motion.div>

        {/* 컨텐츠 */}
        <div className="px-3 py-2 min-h-[60px]">
          {data.isEditing ? (
            <textarea
              ref={contentRef}
              value={localContent}
              onChange={(e) => setLocalContent(e.target.value)}
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
          <motion.div
            className="px-3 py-1.5 border-t flex items-center gap-3 text-xs text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {data.viewCount > 0 && (
              <motion.span
                whileHover={{ scale: 1.1 }}
                className="flex items-center gap-1"
              >
                👁 {data.viewCount}
              </motion.span>
            )}
            {data.citationCount > 0 && (
              <motion.span
                whileHover={{ scale: 1.1 }}
                className="flex items-center gap-1"
              >
                🔗 {data.citationCount}
                {data.citationCount >= 10 && (
                  <motion.span
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    <Zap className="w-3 h-3 text-amber-500" />
                  </motion.span>
                )}
              </motion.span>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* 퀵 액션 */}
      <AnimatePresence>
        {showQuickActions && !data.isEditing && (
          <motion.div
            className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1.5 rounded-xl bg-background/95 backdrop-blur-lg border shadow-xl"
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            {[
              { icon: Edit3, action: data.onEdit, label: "편집", color: undefined },
              { icon: Link2, action: data.onLink, label: "연결", color: undefined },
              { icon: Copy, action: data.onDuplicate, label: "복제", color: undefined },
              { icon: Trash2, action: data.onDelete, label: "삭제", color: "text-red-500 hover:bg-red-100 dark:hover:bg-red-950" },
            ].map(({ icon: Icon, action, label, color }, i) => (
              <motion.button
                key={label}
                onClick={() => action?.(data.id)}
                className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${color ?? ""}`}
                title={label}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }}
                whileTap={{ scale: 0.9 }}
              >
                <Icon className="w-4 h-4" />
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 타입 배지 */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
            style={{
              backgroundColor: config.bgColor,
              color: config.color,
              border: `1px solid ${config.borderColor}`,
            }}
            initial={{ opacity: 0, y: -5, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.8 }}
          >
            {config.label}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 선택 시 외곽 글로우 */}
      {selected && (
        <motion.div
          className="absolute -inset-1 rounded-xl pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${config.color}20, transparent)`,
            border: `2px solid ${config.color}40`,
          }}
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        />
      )}
    </motion.div>
  );
}

export const KnowledgeBlockNodeAnimated = memo(KnowledgeBlockNodeAnimatedComponent);
