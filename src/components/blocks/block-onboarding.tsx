"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, X, Sparkles, MousePointer2, Link2, Zap } from "lucide-react";

// ═══════════════════════════════════════════════════════════
// 인터랙티브 온보딩 튜토리얼
// ═══════════════════════════════════════════════════════════

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  emoji: string;
  highlight?: "canvas" | "toolbar" | "block" | "minimap";
  action?: string;
  tip?: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "지식 캔버스에 오신 것을 환영합니다! 🎉",
    description: "AI와 함께 지식을 정리하고, 연결하고, 확장하는 공간입니다.",
    emoji: "🌟",
    tip: "모든 지식은 블록 단위로 관리됩니다",
  },
  {
    id: "create-block",
    title: "블록 만들기",
    description: "캔버스를 우클릭하거나 '/' 키를 눌러 새 블록을 만들어보세요.",
    emoji: "➕",
    highlight: "canvas",
    action: "우클릭 또는 / 키",
    tip: "질문, AI답변, 인사이트 등 다양한 타입이 있어요",
  },
  {
    id: "edit-block",
    title: "블록 편집하기",
    description: "블록을 더블클릭하면 내용을 편집할 수 있습니다.",
    emoji: "✏️",
    highlight: "block",
    action: "더블클릭",
    tip: "[[링크]] 문법으로 다른 블록을 참조할 수 있어요",
  },
  {
    id: "connect-blocks",
    title: "블록 연결하기",
    description: "블록의 핸들을 드래그해서 다른 블록과 연결하세요.",
    emoji: "🔗",
    highlight: "block",
    action: "핸들 드래그",
    tip: "연결 타입을 선택하면 관계가 더 명확해져요",
  },
  {
    id: "organize",
    title: "정리하기",
    description: "블록을 드래그해서 자유롭게 배치하고, 폴더로 그룹화하세요.",
    emoji: "📦",
    highlight: "canvas",
    action: "드래그 앤 드롭",
    tip: "미니맵으로 전체 구조를 한눈에 볼 수 있어요",
  },
  {
    id: "shortcuts",
    title: "단축키 마스터",
    description: "키보드 단축키로 더 빠르게 작업하세요!",
    emoji: "⌨️",
    action: "? 키로 단축키 보기",
    tip: "Cmd+K 검색, Cmd+N 새블록, Delete 삭제",
  },
  {
    id: "done",
    title: "준비 완료! 🚀",
    description: "이제 당신만의 지식 그래프를 만들어보세요!",
    emoji: "✨",
    tip: "언제든 도움이 필요하면 ? 키를 눌러주세요",
  },
];

export function BlockOnboarding({
  onComplete,
  onSkip,
}: {
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [step, setStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const currentStep = ONBOARDING_STEPS[step];
  const progress = ((step + 1) / ONBOARDING_STEPS.length) * 100;

  const nextStep = () => {
    if (isAnimating) return;
    setIsAnimating(true);

    if (step < ONBOARDING_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }

    setTimeout(() => setIsAnimating(false), 300);
  };

  const prevStep = () => {
    if (isAnimating || step === 0) return;
    setIsAnimating(true);
    setStep(step - 1);
    setTimeout(() => setIsAnimating(false), 300);
  };

  // 키보드 네비게이션
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") nextStep();
      if (e.key === "ArrowLeft") prevStep();
      if (e.key === "Escape") onSkip();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [step, isAnimating]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onSkip} />

      {/* 하이라이트 영역 */}
      {currentStep.highlight && (
        <HighlightArea area={currentStep.highlight} />
      )}

      {/* 메인 카드 */}
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative z-10 w-full max-w-lg mx-4"
      >
        <div className="bg-background rounded-2xl shadow-2xl overflow-hidden border">
          {/* 프로그레스 바 */}
          <div className="h-1 bg-muted">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* 컨텐츠 */}
          <div className="p-8">
            {/* 이모지 애니메이션 */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="text-6xl mb-4 text-center"
            >
              {currentStep.emoji}
            </motion.div>

            {/* 제목 */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-bold text-center mb-3"
            >
              {currentStep.title}
            </motion.h2>

            {/* 설명 */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-muted-foreground text-center mb-4"
            >
              {currentStep.description}
            </motion.p>

            {/* 액션 배지 */}
            {currentStep.action && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="flex justify-center mb-4"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium">
                  <MousePointer2 className="w-4 h-4" />
                  {currentStep.action}
                </div>
              </motion.div>
            )}

            {/* 팁 */}
            {currentStep.tip && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-sm text-center text-muted-foreground bg-muted/50 rounded-lg p-3"
              >
                💡 {currentStep.tip}
              </motion.div>
            )}
          </div>

          {/* 네비게이션 */}
          <div className="px-8 py-4 bg-muted/30 flex items-center justify-between">
            <button
              onClick={prevStep}
              disabled={step === 0}
              className={`
                flex items-center gap-1 px-3 py-2 rounded-lg transition-all
                ${step === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-muted"}
              `}
            >
              <ChevronLeft className="w-4 h-4" />
              이전
            </button>

            <div className="flex gap-1.5">
              {ONBOARDING_STEPS.map((_, i) => (
                <motion.div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === step ? "bg-indigo-500" : i < step ? "bg-indigo-300" : "bg-muted-foreground/30"
                  }`}
                  animate={{ scale: i === step ? 1.2 : 1 }}
                />
              ))}
            </div>

            <button
              onClick={nextStep}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
            >
              {step === ONBOARDING_STEPS.length - 1 ? (
                <>
                  시작하기
                  <Sparkles className="w-4 h-4" />
                </>
              ) : (
                <>
                  다음
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* 스킵 버튼 */}
        <button
          onClick={onSkip}
          className="absolute -top-12 right-0 flex items-center gap-1 text-white/70 hover:text-white transition-colors text-sm"
        >
          건너뛰기 <X className="w-4 h-4" />
        </button>
      </motion.div>

      {/* 떠다니는 힌트 아이콘들 */}
      <FloatingHints />
    </motion.div>
  );
}

// 하이라이트 영역 표시
function HighlightArea({ area }: { area: string }) {
  const positions: Record<string, { top: string; left: string; width: string; height: string }> = {
    canvas: { top: "10%", left: "10%", width: "80%", height: "80%" },
    toolbar: { top: "60px", left: "20px", width: "200px", height: "50px" },
    block: { top: "30%", left: "30%", width: "300px", height: "150px" },
    minimap: { top: "auto", left: "auto", width: "150px", height: "100px" },
  };

  const pos = positions[area] || positions.canvas;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute pointer-events-none"
      style={{
        ...pos,
        bottom: area === "minimap" ? "20px" : undefined,
        right: area === "minimap" ? "20px" : undefined,
      }}
    >
      <div className="w-full h-full border-2 border-indigo-400 rounded-xl animate-pulse" />
      <div className="absolute inset-0 bg-indigo-500/10 rounded-xl" />
    </motion.div>
  );
}

// 떠다니는 힌트 아이콘들
function FloatingHints() {
  const hints = [
    { icon: Link2, x: "15%", y: "20%", delay: 0 },
    { icon: Zap, x: "85%", y: "30%", delay: 0.5 },
    { icon: Sparkles, x: "10%", y: "70%", delay: 1 },
    { icon: MousePointer2, x: "80%", y: "75%", delay: 1.5 },
  ];

  return (
    <>
      {hints.map((hint, i) => (
        <motion.div
          key={i}
          className="absolute text-white/20"
          style={{ left: hint.x, top: hint.y }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 0.3, 0],
            scale: [0.5, 1.2, 0.5],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 3,
            delay: hint.delay,
            repeat: Infinity,
            repeatDelay: 2,
          }}
        >
          <hint.icon className="w-8 h-8" />
        </motion.div>
      ))}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// 미니 팁 풍선 (컨텍스트 힌트)
// ═══════════════════════════════════════════════════════════

export function TipBubble({
  tip,
  position = "top",
  onDismiss,
}: {
  tip: string;
  position?: "top" | "bottom" | "left" | "right";
  onDismiss?: () => void;
}) {
  const positionClasses = {
    top: "-top-12 left-1/2 -translate-x-1/2",
    bottom: "-bottom-12 left-1/2 -translate-x-1/2",
    left: "-left-40 top-1/2 -translate-y-1/2",
    right: "-right-40 top-1/2 -translate-y-1/2",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`absolute ${positionClasses[position]} z-50`}
    >
      <div className="relative px-3 py-2 rounded-lg bg-indigo-500 text-white text-sm shadow-lg max-w-[200px]">
        💡 {tip}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white text-indigo-500 flex items-center justify-center text-xs hover:bg-gray-100"
          >
            ×
          </button>
        )}
        {/* 화살표 */}
        <div
          className={`
            absolute w-2 h-2 bg-indigo-500 transform rotate-45
            ${position === "top" ? "-bottom-1 left-1/2 -translate-x-1/2" : ""}
            ${position === "bottom" ? "-top-1 left-1/2 -translate-x-1/2" : ""}
            ${position === "left" ? "-right-1 top-1/2 -translate-y-1/2" : ""}
            ${position === "right" ? "-left-1 top-1/2 -translate-y-1/2" : ""}
          `}
        />
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// 첫 방문 체크
// ═══════════════════════════════════════════════════════════

export function useFirstVisit(key: string = "block-canvas-onboarding") {
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    const visited = localStorage.getItem(key);
    if (!visited) {
      setIsFirstVisit(true);
    }
  }, [key]);

  const markAsVisited = () => {
    localStorage.setItem(key, "true");
    setIsFirstVisit(false);
  };

  const resetVisit = () => {
    localStorage.removeItem(key);
    setIsFirstVisit(true);
  };

  return { isFirstVisit, markAsVisited, resetVisit };
}
