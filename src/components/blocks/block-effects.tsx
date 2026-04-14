"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

// ═══════════════════════════════════════════════════════════
// 파티클 이펙트 - 블록 생성/삭제 시 사용
// ═══════════════════════════════════════════════════════════

interface ParticleConfig {
  emoji: string;
  color: string;
}

// 블록 생성 축하 이펙트
export function celebrateBlockCreation(x: number, y: number, config: ParticleConfig) {
  // 이모지 파티클
  const emojiParticle = confetti.create(undefined, { resize: true });

  emojiParticle({
    particleCount: 15,
    spread: 60,
    origin: { x: x / window.innerWidth, y: y / window.innerHeight },
    colors: [config.color, "#6366f1", "#22c55e"],
    shapes: ["circle"],
    scalar: 0.8,
    gravity: 0.8,
    drift: 0,
    ticks: 100,
  });
}

// 대규모 축하 (마일스톤 달성 등)
export function celebrateMilestone() {
  const duration = 3000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ["#6366f1", "#22c55e", "#f59e0b"],
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ["#ec4899", "#3b82f6", "#a855f7"],
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  frame();
}

// ═══════════════════════════════════════════════════════════
// 플로팅 이모지 - 재미있는 반응
// ═══════════════════════════════════════════════════════════

interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number;
  y: number;
}

export function useFloatingEmojis() {
  const [emojis, setEmojis] = useState<FloatingEmoji[]>([]);

  const addEmoji = useCallback((emoji: string, x: number, y: number) => {
    const id = `emoji-${Date.now()}-${Math.random()}`;
    setEmojis((prev) => [...prev, { id, emoji, x, y }]);

    // 1.5초 후 제거
    setTimeout(() => {
      setEmojis((prev) => prev.filter((e) => e.id !== id));
    }, 1500);
  }, []);

  const FloatingEmojisContainer = () => (
    <div className="fixed inset-0 pointer-events-none z-50">
      <AnimatePresence>
        {emojis.map((e) => (
          <motion.div
            key={e.id}
            initial={{ opacity: 1, scale: 0.5, x: e.x, y: e.y }}
            animate={{
              opacity: 0,
              scale: 1.5,
              y: e.y - 100,
              rotate: Math.random() * 30 - 15,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute text-3xl"
          >
            {e.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  return { addEmoji, FloatingEmojisContainer };
}

// ═══════════════════════════════════════════════════════════
// 업적 시스템 (Achievements)
// ═══════════════════════════════════════════════════════════

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_block",
    title: "첫 발걸음",
    description: "첫 번째 블록을 만들었습니다",
    emoji: "🌱",
    unlocked: false,
  },
  {
    id: "connector",
    title: "연결자",
    description: "5개의 블록을 연결했습니다",
    emoji: "🔗",
    unlocked: false,
    progress: 0,
    maxProgress: 5,
  },
  {
    id: "organizer",
    title: "정리의 달인",
    description: "폴더 3개를 만들었습니다",
    emoji: "📁",
    unlocked: false,
    progress: 0,
    maxProgress: 3,
  },
  {
    id: "insight_hunter",
    title: "인사이트 사냥꾼",
    description: "10개의 인사이트를 발견했습니다",
    emoji: "💡",
    unlocked: false,
    progress: 0,
    maxProgress: 10,
  },
  {
    id: "speed_demon",
    title: "스피드 데몬",
    description: "1분 안에 5개 블록을 만들었습니다",
    emoji: "⚡",
    unlocked: false,
  },
  {
    id: "knowledge_tree",
    title: "지식의 나무",
    description: "깊이 5단계의 계층 구조를 만들었습니다",
    emoji: "🌳",
    unlocked: false,
  },
  {
    id: "perfectionist",
    title: "완벽주의자",
    description: "하나의 주제에 20개 이상의 블록을 추가했습니다",
    emoji: "✨",
    unlocked: false,
    progress: 0,
    maxProgress: 20,
  },
];

// 업적 토스트 알림
export function AchievementToast({
  achievement,
  onClose,
}: {
  achievement: Achievement;
  onClose: () => void;
}) {
  useEffect(() => {
    celebrateMilestone();
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl shadow-2xl">
        <motion.div
          initial={{ rotate: -10, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
          className="text-4xl"
        >
          {achievement.emoji}
        </motion.div>
        <div>
          <div className="text-xs uppercase tracking-wider opacity-80">
            업적 달성!
          </div>
          <div className="font-bold text-lg">{achievement.title}</div>
          <div className="text-sm opacity-90">{achievement.description}</div>
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5 }}
          className="text-2xl"
        >
          🎉
        </motion.div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// 연결 스파크 이펙트
// ═══════════════════════════════════════════════════════════

export function ConnectionSpark({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <svg className="fixed inset-0 pointer-events-none z-40" style={{ overflow: "visible" }}>
      <motion.circle
        cx={x1}
        cy={y1}
        r={4}
        fill="#6366f1"
        initial={{ scale: 0, opacity: 1 }}
        animate={{
          cx: [x1, (x1 + x2) / 2, x2],
          cy: [y1, (y1 + y2) / 2 - 20, y2],
          scale: [0, 1.5, 0],
          opacity: [1, 1, 0],
        }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      <motion.circle
        cx={x2}
        cy={y2}
        r={8}
        fill="none"
        stroke="#6366f1"
        strokeWidth={2}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 2], opacity: [1, 0] }}
        transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════
// 젠 모드 (집중 모드)
// ═══════════════════════════════════════════════════════════

export function ZenModeOverlay({ onExit }: { onExit: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-30 pointer-events-none"
    >
      {/* 상하좌우 그라데이션 비네트 */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background opacity-30" />

      {/* ESC 힌트 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto"
      >
        <button
          onClick={onExit}
          className="px-4 py-2 rounded-full bg-muted/50 text-muted-foreground text-sm backdrop-blur hover:bg-muted transition-colors"
        >
          ESC로 나가기
        </button>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// 타이핑 이펙트 (제목 입력 시)
// ═══════════════════════════════════════════════════════════

export function TypingCursor() {
  return (
    <motion.span
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
      className="inline-block w-0.5 h-5 bg-indigo-500 ml-0.5"
    />
  );
}

// ═══════════════════════════════════════════════════════════
// 블록 생성 모션 래퍼
// ═══════════════════════════════════════════════════════════

export function BlockMotionWrapper({
  children,
  isNew,
  isDeleting,
}: {
  children: React.ReactNode;
  isNew?: boolean;
  isDeleting?: boolean;
}) {
  return (
    <motion.div
      initial={isNew ? { scale: 0.8, opacity: 0, y: 20 } : false}
      animate={
        isDeleting
          ? { scale: 0.8, opacity: 0, x: -20, rotate: -5 }
          : { scale: 1, opacity: 1, y: 0, x: 0, rotate: 0 }
      }
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
      }}
    >
      {children}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// 드래그 트레일 이펙트
// ═══════════════════════════════════════════════════════════

interface TrailPoint {
  x: number;
  y: number;
  timestamp: number;
}

export function useDragTrail() {
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const startDrag = useCallback(() => {
    setIsDragging(true);
    setTrail([]);
  }, []);

  const updateDrag = useCallback((x: number, y: number) => {
    if (!isDragging) return;

    setTrail((prev) => {
      const now = Date.now();
      const newPoint = { x, y, timestamp: now };
      // 최근 10개 포인트만 유지
      const filtered = prev.filter((p) => now - p.timestamp < 200);
      return [...filtered, newPoint].slice(-10);
    });
  }, [isDragging]);

  const endDrag = useCallback(() => {
    setIsDragging(false);
    setTrail([]);
  }, []);

  const DragTrailSvg = () => (
    <svg className="fixed inset-0 pointer-events-none z-30" style={{ overflow: "visible" }}>
      {trail.map((point, i) => (
        <motion.circle
          key={i}
          cx={point.x}
          cy={point.y}
          r={4}
          fill="#6366f1"
          initial={{ opacity: 0.6, scale: 1 }}
          animate={{ opacity: 0, scale: 0 }}
          transition={{ duration: 0.3 }}
        />
      ))}
    </svg>
  );

  return { startDrag, updateDrag, endDrag, DragTrailSvg };
}

// ═══════════════════════════════════════════════════════════
// 키보드 힌트 오버레이
// ═══════════════════════════════════════════════════════════

export function KeyboardHintsOverlay({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { keys: ["⌘", "K"], label: "빠른 검색" },
    { keys: ["⌘", "N"], label: "새 블록" },
    { keys: ["/"], label: "명령어" },
    { keys: ["⌘", "D"], label: "복제" },
    { keys: ["⌘", "L"], label: "링크" },
    { keys: ["Delete"], label: "삭제" },
    { keys: ["Tab"], label: "들여쓰기" },
    { keys: ["Esc"], label: "취소" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-background rounded-2xl p-6 shadow-2xl max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span>⌨️</span> 키보드 단축키
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <div className="flex gap-1">
                {s.keys.map((key, j) => (
                  <kbd
                    key={j}
                    className="px-2 py-1 rounded bg-muted text-xs font-mono"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          아무 곳이나 클릭하여 닫기
        </p>
      </motion.div>
    </motion.div>
  );
}
