"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";

// ═══════════════════════════════════════════════════════════
// 통합 게임화 컨텍스트
// ═══════════════════════════════════════════════════════════

// XP 보상 설정
export const XP_REWARDS = {
  askQuestion: 10,
  receiveAnswer: 5,
  addOpinion: 15,
  addEvidence: 20,
  addCorrection: 25,
  shareQA: 30,
  receiveFootprint: 10,
  giveFootprint: 5,
  completeConversation: 50,
  firstOfDay: 20,
  streak3: 50,
  streak7: 100,
} as const;

// 업적 정의
export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  condition: (stats: UserStats) => boolean;
  xpReward: number;
}

export interface UserStats {
  totalQuestions: number;
  totalOpinions: number;
  totalCorrections: number;
  totalShares: number;
  totalFootprintsGiven: number;
  totalFootprintsReceived: number;
  conversationDepth: number;
  currentStreak: number;
  totalXP: number;
  level: number;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_question",
    title: "첫 질문",
    description: "첫 번째 질문을 했습니다",
    emoji: "🌱",
    condition: (s) => s.totalQuestions >= 1,
    xpReward: 20,
  },
  {
    id: "curious_mind",
    title: "호기심 왕",
    description: "10개의 질문을 했습니다",
    emoji: "🔍",
    condition: (s) => s.totalQuestions >= 10,
    xpReward: 100,
  },
  {
    id: "first_opinion",
    title: "목소리를 내다",
    description: "첫 번째 의견을 남겼습니다",
    emoji: "💬",
    condition: (s) => s.totalOpinions >= 1,
    xpReward: 20,
  },
  {
    id: "fact_checker",
    title: "팩트체커",
    description: "5개의 수정/오류지적을 했습니다",
    emoji: "✅",
    condition: (s) => s.totalCorrections >= 5,
    xpReward: 150,
  },
  {
    id: "knowledge_sharer",
    title: "지식 공유자",
    description: "3개의 대화를 공유했습니다",
    emoji: "🌐",
    condition: (s) => s.totalShares >= 3,
    xpReward: 100,
  },
  {
    id: "pathfinder",
    title: "길잡이",
    description: "10개의 발자국을 남겼습니다",
    emoji: "👣",
    condition: (s) => s.totalFootprintsGiven >= 10,
    xpReward: 80,
  },
  {
    id: "popular_path",
    title: "인기 있는 길",
    description: "50개의 발자국을 받았습니다",
    emoji: "🔥",
    condition: (s) => s.totalFootprintsReceived >= 50,
    xpReward: 200,
  },
  {
    id: "deep_diver",
    title: "깊이 파고들기",
    description: "대화 깊이 5단계 달성",
    emoji: "⬇️",
    condition: (s) => s.conversationDepth >= 5,
    xpReward: 120,
  },
  {
    id: "streak_3",
    title: "3일 연속",
    description: "3일 연속 활동했습니다",
    emoji: "🔥",
    condition: (s) => s.currentStreak >= 3,
    xpReward: 50,
  },
  {
    id: "streak_7",
    title: "일주일 연속",
    description: "7일 연속 활동했습니다",
    emoji: "💪",
    condition: (s) => s.currentStreak >= 7,
    xpReward: 150,
  },
];

// 레벨 계산
export function calculateLevel(xp: number): { level: number; currentXP: number; nextLevelXP: number; progress: number } {
  // 레벨당 필요 XP: 100 * level
  let level = 1;
  let remainingXP = xp;

  while (remainingXP >= level * 100) {
    remainingXP -= level * 100;
    level++;
  }

  const nextLevelXP = level * 100;
  const progress = (remainingXP / nextLevelXP) * 100;

  return { level, currentXP: remainingXP, nextLevelXP, progress };
}

// 컨텍스트 타입
interface GameContextType {
  stats: UserStats;
  unlockedAchievements: string[];
  recentAchievement: Achievement | null;
  addXP: (amount: number, reason?: string) => void;
  checkAchievements: () => void;
  incrementStat: (stat: keyof Omit<UserStats, 'totalXP' | 'level'>) => void;
  showCelebration: (type: 'xp' | 'achievement' | 'milestone', data?: unknown) => void;
  dismissAchievement: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

// 플로팅 XP 표시
interface FloatingXP {
  id: string;
  amount: number;
  reason?: string;
  x: number;
  y: number;
}

// Provider
export function GameProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<UserStats>({
    totalQuestions: 0,
    totalOpinions: 0,
    totalCorrections: 0,
    totalShares: 0,
    totalFootprintsGiven: 0,
    totalFootprintsReceived: 0,
    conversationDepth: 0,
    currentStreak: 1,
    totalXP: 0,
    level: 1,
  });

  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [recentAchievement, setRecentAchievement] = useState<Achievement | null>(null);
  const [floatingXPs, setFloatingXPs] = useState<FloatingXP[]>([]);

  // localStorage에서 불러오기
  useEffect(() => {
    const saved = localStorage.getItem("game-stats");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setStats(parsed.stats || stats);
        setUnlockedAchievements(parsed.achievements || []);
      } catch (e) {
        console.error("Failed to load game stats", e);
      }
    }
  }, []);

  // localStorage에 저장
  useEffect(() => {
    localStorage.setItem("game-stats", JSON.stringify({
      stats,
      achievements: unlockedAchievements,
    }));
  }, [stats, unlockedAchievements]);

  // XP 추가
  const addXP = useCallback((amount: number, reason?: string) => {
    setStats(prev => {
      const newXP = prev.totalXP + amount;
      const { level } = calculateLevel(newXP);
      return { ...prev, totalXP: newXP, level };
    });

    // 플로팅 XP 표시
    const id = `xp-${Date.now()}`;
    setFloatingXPs(prev => [...prev, {
      id,
      amount,
      reason,
      x: Math.random() * 100 + 50,
      y: Math.random() * 50 + 100,
    }]);

    setTimeout(() => {
      setFloatingXPs(prev => prev.filter(f => f.id !== id));
    }, 2000);
  }, []);

  // 업적 체크
  const checkAchievements = useCallback(() => {
    for (const achievement of ACHIEVEMENTS) {
      if (!unlockedAchievements.includes(achievement.id) && achievement.condition(stats)) {
        setUnlockedAchievements(prev => [...prev, achievement.id]);
        setRecentAchievement(achievement);
        addXP(achievement.xpReward, `업적: ${achievement.title}`);

        // 축하 이펙트
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#6366f1", "#22c55e", "#f59e0b"],
        });

        break; // 한 번에 하나씩만
      }
    }
  }, [stats, unlockedAchievements, addXP]);

  // 스탯 증가
  const incrementStat = useCallback((stat: keyof Omit<UserStats, 'totalXP' | 'level'>) => {
    setStats(prev => ({
      ...prev,
      [stat]: (prev[stat] as number) + 1,
    }));
  }, []);

  // 축하 효과
  const showCelebration = useCallback((type: 'xp' | 'achievement' | 'milestone') => {
    if (type === 'milestone') {
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
  }, []);

  // 업적 닫기
  const dismissAchievement = useCallback(() => {
    setRecentAchievement(null);
  }, []);

  return (
    <GameContext.Provider value={{
      stats,
      unlockedAchievements,
      recentAchievement,
      addXP,
      checkAchievements,
      incrementStat,
      showCelebration,
      dismissAchievement,
    }}>
      {children}

      {/* 플로팅 XP */}
      <div className="fixed inset-0 pointer-events-none z-50">
        <AnimatePresence>
          {floatingXPs.map(f => (
            <motion.div
              key={f.id}
              initial={{ opacity: 1, y: f.y, x: f.x }}
              animate={{ opacity: 0, y: f.y - 50 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="absolute text-lg font-bold text-amber-500"
            >
              +{f.amount} XP
              {f.reason && <span className="text-xs ml-1 text-muted-foreground">({f.reason})</span>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 업적 토스트 */}
      <AnimatePresence>
        {recentAchievement && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
          >
            <div
              className="flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl shadow-2xl cursor-pointer"
              onClick={dismissAchievement}
            >
              <motion.div
                initial={{ rotate: -10, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                className="text-4xl"
              >
                {recentAchievement.emoji}
              </motion.div>
              <div>
                <div className="text-xs uppercase tracking-wider opacity-80">
                  업적 달성!
                </div>
                <div className="font-bold text-lg">{recentAchievement.title}</div>
                <div className="text-sm opacity-90">{recentAchievement.description}</div>
                <div className="text-xs mt-1 text-amber-300">+{recentAchievement.xpReward} XP</div>
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
        )}
      </AnimatePresence>
    </GameContext.Provider>
  );
}

// Hook
export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    // 프로바이더 없이도 기본값 반환
    return {
      stats: {
        totalQuestions: 0,
        totalOpinions: 0,
        totalCorrections: 0,
        totalShares: 0,
        totalFootprintsGiven: 0,
        totalFootprintsReceived: 0,
        conversationDepth: 0,
        currentStreak: 1,
        totalXP: 0,
        level: 1,
      },
      unlockedAchievements: [],
      recentAchievement: null,
      addXP: () => {},
      checkAchievements: () => {},
      incrementStat: () => {},
      showCelebration: () => {},
      dismissAchievement: () => {},
    };
  }
  return context;
}

// ═══════════════════════════════════════════════════════════
// XP 바 컴포넌트
// ═══════════════════════════════════════════════════════════

export function XPBar({ compact = false }: { compact?: boolean }) {
  const { stats } = useGame();
  const { level, currentXP, nextLevelXP, progress } = calculateLevel(stats.totalXP);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold">
          Lv.{level}
        </div>
        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-bold">
            ⭐ Lv.{level}
          </div>
          <span className="text-sm font-medium">{stats.totalXP} XP</span>
        </div>
        <span className="text-xs text-muted-foreground">
          다음 레벨까지 {nextLevelXP - currentXP} XP
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}
