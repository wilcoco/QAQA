"use client";

import { useState, createContext, useContext, ReactNode } from "react";

// ═══════════════════════════════════════════════════════════
// 블록 테마 시스템 - 재미있는 스킨들
// ═══════════════════════════════════════════════════════════

export type BlockTheme =
  | "default"      // 기본 클린 테마
  | "neon"         // 사이버펑크 네온
  | "pastel"       // 파스텔 톤
  | "dark-hacker"  // 해커 스타일
  | "retro"        // 레트로 8비트
  | "nature"       // 자연/숲 테마
  | "ocean"        // 바다 테마
  | "space";       // 우주 테마

interface ThemeConfig {
  id: BlockTheme;
  name: string;
  emoji: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    border: string;
    glow?: string;
  };
  fonts?: {
    heading?: string;
    body?: string;
  };
  effects?: {
    glow?: boolean;
    grain?: boolean;
    scanlines?: boolean;
    particles?: "stars" | "bubbles" | "leaves" | "snow" | "none";
  };
}

export const THEMES: Record<BlockTheme, ThemeConfig> = {
  default: {
    id: "default",
    name: "기본",
    emoji: "✨",
    description: "깔끔하고 미니멀한 기본 테마",
    colors: {
      primary: "#6366f1",
      secondary: "#8b5cf6",
      accent: "#22c55e",
      background: "#ffffff",
      text: "#1f2937",
      border: "#e5e7eb",
    },
  },
  neon: {
    id: "neon",
    name: "네온",
    emoji: "🌆",
    description: "사이버펑크 네온 글로우",
    colors: {
      primary: "#ff00ff",
      secondary: "#00ffff",
      accent: "#ffff00",
      background: "#0a0a0f",
      text: "#ffffff",
      border: "#ff00ff40",
      glow: "#ff00ff",
    },
    effects: {
      glow: true,
      scanlines: true,
    },
  },
  pastel: {
    id: "pastel",
    name: "파스텔",
    emoji: "🌸",
    description: "부드러운 파스텔 톤",
    colors: {
      primary: "#f9a8d4",
      secondary: "#c4b5fd",
      accent: "#a7f3d0",
      background: "#fef7ff",
      text: "#6b21a8",
      border: "#f0abfc40",
    },
  },
  "dark-hacker": {
    id: "dark-hacker",
    name: "해커",
    emoji: "💻",
    description: "매트릭스 스타일",
    colors: {
      primary: "#00ff00",
      secondary: "#00cc00",
      accent: "#00ff00",
      background: "#000000",
      text: "#00ff00",
      border: "#00ff0030",
      glow: "#00ff00",
    },
    fonts: {
      heading: "monospace",
      body: "monospace",
    },
    effects: {
      glow: true,
      grain: true,
    },
  },
  retro: {
    id: "retro",
    name: "레트로",
    emoji: "👾",
    description: "8비트 레트로 게임",
    colors: {
      primary: "#ff6b6b",
      secondary: "#4ecdc4",
      accent: "#ffe66d",
      background: "#2c2c54",
      text: "#ffffff",
      border: "#706fd3",
    },
    fonts: {
      heading: "'Press Start 2P', monospace",
    },
  },
  nature: {
    id: "nature",
    name: "숲",
    emoji: "🌿",
    description: "자연에서 영감을 받은",
    colors: {
      primary: "#059669",
      secondary: "#84cc16",
      accent: "#f59e0b",
      background: "#f0fdf4",
      text: "#14532d",
      border: "#86efac",
    },
    effects: {
      particles: "leaves",
    },
  },
  ocean: {
    id: "ocean",
    name: "바다",
    emoji: "🌊",
    description: "깊은 바다 테마",
    colors: {
      primary: "#0ea5e9",
      secondary: "#06b6d4",
      accent: "#f472b6",
      background: "#0c4a6e",
      text: "#e0f2fe",
      border: "#38bdf840",
      glow: "#0ea5e9",
    },
    effects: {
      particles: "bubbles",
      glow: true,
    },
  },
  space: {
    id: "space",
    name: "우주",
    emoji: "🚀",
    description: "별들 사이를 여행하며",
    colors: {
      primary: "#a855f7",
      secondary: "#ec4899",
      accent: "#facc15",
      background: "#0f0f23",
      text: "#e2e8f0",
      border: "#6366f140",
      glow: "#a855f7",
    },
    effects: {
      particles: "stars",
      glow: true,
    },
  },
};

// 테마 컨텍스트
interface ThemeContextType {
  theme: BlockTheme;
  setTheme: (theme: BlockTheme) => void;
  config: ThemeConfig;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function BlockThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<BlockTheme>("default");

  return (
    <ThemeContext.Provider value={{ theme, setTheme, config: THEMES[theme] }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useBlockTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return { theme: "default" as BlockTheme, setTheme: () => {}, config: THEMES.default };
  }
  return context;
}

// ═══════════════════════════════════════════════════════════
// 테마 선택 UI
// ═══════════════════════════════════════════════════════════

export function ThemePicker({ onSelect }: { onSelect?: (theme: BlockTheme) => void }) {
  const { theme, setTheme, config } = useBlockTheme();

  const handleSelect = (t: BlockTheme) => {
    setTheme(t);
    onSelect?.(t);
  };

  return (
    <div className="p-4 rounded-2xl bg-background/95 backdrop-blur border shadow-xl">
      <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
        <span>🎨</span> 테마 선택
      </h3>
      <div className="grid grid-cols-4 gap-2">
        {Object.values(THEMES).map((t) => (
          <button
            key={t.id}
            onClick={() => handleSelect(t.id)}
            className={`
              p-3 rounded-xl border-2 transition-all duration-200
              hover:scale-105 hover:shadow-lg
              ${theme === t.id ? "ring-2 ring-offset-2 ring-indigo-500" : ""}
            `}
            style={{
              backgroundColor: t.colors.background,
              borderColor: t.colors.primary,
              color: t.colors.text,
            }}
            title={t.description}
          >
            <div className="text-2xl mb-1">{t.emoji}</div>
            <div className="text-xs font-medium">{t.name}</div>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3 text-center">
        현재: {config.emoji} {config.name}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 테마 기반 스타일 훅
// ═══════════════════════════════════════════════════════════

export function useThemeStyles() {
  const { config } = useBlockTheme();

  return {
    blockStyle: {
      backgroundColor: config.colors.background,
      borderColor: config.colors.border,
      color: config.colors.text,
      boxShadow: config.effects?.glow
        ? `0 0 20px ${config.colors.glow}40`
        : undefined,
    },
    headerStyle: {
      backgroundColor: `${config.colors.primary}20`,
    },
    accentColor: config.colors.accent,
    primaryColor: config.colors.primary,
    hasGlow: config.effects?.glow ?? false,
    particles: config.effects?.particles ?? "none",
  };
}

// ═══════════════════════════════════════════════════════════
// 파티클 배경 (테마별)
// ═══════════════════════════════════════════════════════════

export function ThemeParticles() {
  const { config } = useBlockTheme();
  const particleType = config.effects?.particles;

  if (!particleType || particleType === "none") return null;

  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    delay: Math.random() * 5,
    duration: Math.random() * 10 + 10,
  }));

  const getEmoji = () => {
    switch (particleType) {
      case "stars": return "✨";
      case "bubbles": return "🫧";
      case "leaves": return "🍃";
      case "snow": return "❄️";
      default: return "•";
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-float"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: `${p.size * 4}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            opacity: 0.3,
          }}
        >
          {getEmoji()}
        </div>
      ))}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.1;
          }
          50% {
            transform: translateY(-100px) rotate(180deg);
            opacity: 0.4;
          }
        }
        .animate-float {
          animation: float linear infinite;
        }
      `}</style>
    </div>
  );
}
