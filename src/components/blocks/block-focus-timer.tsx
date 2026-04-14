"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Zap, Flame, Coffee, Trophy } from "lucide-react";
import { celebrateMilestone } from "./block-effects";
import { useSound } from "./block-sounds";

// ═══════════════════════════════════════════════════════════
// 집중 타이머 (뽀모도로 + 게이미피케이션)
// ═══════════════════════════════════════════════════════════

interface FocusSession {
  id: string;
  duration: number;  // 분
  completedAt: Date;
  blocksCreated: number;
  type: "focus" | "break";
}

interface FocusTimerProps {
  onSessionComplete?: (session: FocusSession) => void;
  onBlockCreate?: () => void;  // 블록 생성 시 호출
}

const FOCUS_DURATION = 25 * 60;  // 25분
const BREAK_DURATION = 5 * 60;   // 5분
const LONG_BREAK_DURATION = 15 * 60;  // 15분

export function FocusTimer({ onSessionComplete, onBlockCreate }: FocusTimerProps) {
  const { play } = useSound();

  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(FOCUS_DURATION);
  const [mode, setMode] = useState<"focus" | "break" | "longBreak">("focus");
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [blocksThisSession, setBlocksThisSession] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showReward, setShowReward] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // 타이머 로직
  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSessionEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  // 세션 종료
  const handleSessionEnd = useCallback(() => {
    setIsRunning(false);
    play("achievement");
    celebrateMilestone();

    if (mode === "focus") {
      setSessionsCompleted((prev) => prev + 1);
      setStreak((prev) => prev + 1);
      setShowReward(true);

      onSessionComplete?.({
        id: `session-${Date.now()}`,
        duration: FOCUS_DURATION / 60,
        completedAt: new Date(),
        blocksCreated: blocksThisSession,
        type: "focus",
      });

      // 4번째 포모도로 후 긴 휴식
      if ((sessionsCompleted + 1) % 4 === 0) {
        setMode("longBreak");
        setTimeLeft(LONG_BREAK_DURATION);
      } else {
        setMode("break");
        setTimeLeft(BREAK_DURATION);
      }
    } else {
      // 휴식 끝
      setMode("focus");
      setTimeLeft(FOCUS_DURATION);
      setBlocksThisSession(0);
    }

    setTimeout(() => setShowReward(false), 3000);
  }, [mode, sessionsCompleted, blocksThisSession, onSessionComplete, play]);

  // 시작/일시정지
  const toggleTimer = () => {
    if (!isRunning) {
      play("click");
    }
    setIsRunning(!isRunning);
  };

  // 리셋
  const resetTimer = () => {
    play("click");
    setIsRunning(false);
    setMode("focus");
    setTimeLeft(FOCUS_DURATION);
    setBlocksThisSession(0);
  };

  // 포맷
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 진행률
  const progress = mode === "focus"
    ? ((FOCUS_DURATION - timeLeft) / FOCUS_DURATION) * 100
    : mode === "break"
      ? ((BREAK_DURATION - timeLeft) / BREAK_DURATION) * 100
      : ((LONG_BREAK_DURATION - timeLeft) / LONG_BREAK_DURATION) * 100;

  // 모드별 색상
  const modeColors = {
    focus: { bg: "bg-rose-500", text: "text-rose-500", ring: "ring-rose-400" },
    break: { bg: "bg-emerald-500", text: "text-emerald-500", ring: "ring-emerald-400" },
    longBreak: { bg: "bg-blue-500", text: "text-blue-500", ring: "ring-blue-400" },
  };

  const colors = modeColors[mode];

  // 최소화된 상태
  if (!isExpanded) {
    return (
      <motion.button
        onClick={() => setIsExpanded(true)}
        className={`
          fixed bottom-20 right-4 z-40
          w-14 h-14 rounded-full shadow-lg
          flex items-center justify-center
          ${colors.bg} text-white
          hover:scale-110 transition-transform
        `}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        animate={isRunning ? { scale: [1, 1.05, 1] } : {}}
        transition={isRunning ? { repeat: Infinity, duration: 1 } : {}}
      >
        {mode === "focus" ? (
          <Flame className="w-6 h-6" />
        ) : mode === "break" ? (
          <Coffee className="w-6 h-6" />
        ) : (
          <Zap className="w-6 h-6" />
        )}
        {isRunning && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-white/50"
            initial={{ scale: 1 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        )}
      </motion.button>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed bottom-20 right-4 z-40 w-72"
      >
        <div className="bg-background/95 backdrop-blur-lg rounded-2xl border shadow-2xl overflow-hidden">
          {/* 헤더 */}
          <div className={`px-4 py-3 ${colors.bg} text-white`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {mode === "focus" ? (
                  <>
                    <Flame className="w-5 h-5" />
                    <span className="font-bold">집중 모드</span>
                  </>
                ) : mode === "break" ? (
                  <>
                    <Coffee className="w-5 h-5" />
                    <span className="font-bold">짧은 휴식</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    <span className="font-bold">긴 휴식</span>
                  </>
                )}
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-white/20 rounded transition-colors text-xs"
              >
                최소화
              </button>
            </div>
          </div>

          {/* 타이머 */}
          <div className="p-6">
            {/* 원형 프로그레스 */}
            <div className="relative w-40 h-40 mx-auto mb-4">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-muted/20"
                />
                <motion.circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className={colors.text}
                  strokeDasharray={2 * Math.PI * 70}
                  strokeDashoffset={2 * Math.PI * 70 * (1 - progress / 100)}
                  transition={{ duration: 0.5 }}
                />
              </svg>

              {/* 시간 표시 */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-mono font-bold">{formatTime(timeLeft)}</span>
                {isRunning && mode === "focus" && (
                  <motion.span
                    className="text-xs text-muted-foreground mt-1"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    집중 중...
                  </motion.span>
                )}
              </div>
            </div>

            {/* 컨트롤 */}
            <div className="flex items-center justify-center gap-3">
              <motion.button
                onClick={resetTimer}
                className="p-3 rounded-full hover:bg-muted transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <RotateCcw className="w-5 h-5" />
              </motion.button>

              <motion.button
                onClick={toggleTimer}
                className={`p-4 rounded-full ${colors.bg} text-white shadow-lg`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {isRunning ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6 ml-0.5" />
                )}
              </motion.button>

              <div className="p-3 text-center">
                <div className="text-lg font-bold">{sessionsCompleted}</div>
                <div className="text-xs text-muted-foreground">완료</div>
              </div>
            </div>

            {/* 통계 */}
            <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-2 text-center text-sm">
              <div>
                <div className="font-bold flex items-center justify-center gap-1">
                  <Flame className="w-4 h-4 text-orange-500" />
                  {streak}
                </div>
                <div className="text-xs text-muted-foreground">연속</div>
              </div>
              <div>
                <div className="font-bold">{blocksThisSession}</div>
                <div className="text-xs text-muted-foreground">블록</div>
              </div>
              <div>
                <div className="font-bold">{Math.round(sessionsCompleted * 25)}</div>
                <div className="text-xs text-muted-foreground">분</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 보상 팝업 */}
      <AnimatePresence>
        {showReward && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
          >
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white px-8 py-6 rounded-2xl shadow-2xl text-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="text-6xl mb-3"
              >
                🏆
              </motion.div>
              <div className="text-2xl font-bold mb-1">집중 완료!</div>
              <div className="text-white/80">
                {blocksThisSession > 0
                  ? `${blocksThisSession}개의 블록을 만들었어요`
                  : "잠시 휴식하세요"}
              </div>
              {streak >= 3 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 text-sm bg-white/20 rounded-full px-3 py-1"
                >
                  🔥 {streak}회 연속 집중!
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// 미니 XP 바 (레벨 시스템)
// ═══════════════════════════════════════════════════════════

interface XPBarProps {
  xp: number;
  level: number;
  xpToNextLevel: number;
}

export function XPBar({ xp, level, xpToNextLevel }: XPBarProps) {
  const progress = (xp / xpToNextLevel) * 100;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold">
        <Trophy className="w-3 h-3" />
        Lv.{level}
      </div>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <span className="text-xs text-muted-foreground">
        {xp}/{xpToNextLevel} XP
      </span>
    </div>
  );
}

// XP 계산 유틸
export function calculateLevel(totalXP: number): { level: number; xpInLevel: number; xpToNext: number } {
  // 레벨당 필요 XP: 100 * level
  let level = 1;
  let remainingXP = totalXP;

  while (remainingXP >= level * 100) {
    remainingXP -= level * 100;
    level++;
  }

  return {
    level,
    xpInLevel: remainingXP,
    xpToNext: level * 100,
  };
}

// XP 획득 소스
export const XP_REWARDS = {
  createBlock: 10,
  connectBlocks: 5,
  completePomodoro: 50,
  firstBlockOfDay: 20,
  tenBlockStreak: 100,
  shareInsight: 30,
} as const;
