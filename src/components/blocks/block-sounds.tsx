"use client";

import { useCallback, useState, createContext, useContext, ReactNode } from "react";

// ═══════════════════════════════════════════════════════════
// 사운드 효과 시스템 (Web Audio API)
// ═══════════════════════════════════════════════════════════

type SoundType =
  | "create"      // 블록 생성
  | "delete"      // 블록 삭제
  | "connect"     // 연결
  | "drop"        // 드롭
  | "click"       // 클릭
  | "hover"       // 호버
  | "success"     // 성공
  | "error"       // 에러
  | "whoosh"      // 빠른 이동
  | "pop"         // 팝
  | "ding"        // 딩
  | "achievement" // 업적 달성
  | "levelup";    // 레벨업

// 사운드 파라미터
interface SoundParams {
  frequency: number;
  duration: number;
  type: OscillatorType;
  gain: number;
  ramp?: "up" | "down" | "updown";
  delay?: number;
}

// 사운드 프리셋
const SOUND_PRESETS: Record<SoundType, SoundParams[]> = {
  create: [
    { frequency: 523.25, duration: 0.1, type: "sine", gain: 0.3, ramp: "down" },
    { frequency: 659.25, duration: 0.15, type: "sine", gain: 0.2, delay: 0.05 },
  ],
  delete: [
    { frequency: 392, duration: 0.15, type: "triangle", gain: 0.3, ramp: "down" },
    { frequency: 311.13, duration: 0.2, type: "triangle", gain: 0.2, delay: 0.1 },
  ],
  connect: [
    { frequency: 440, duration: 0.08, type: "sine", gain: 0.2 },
    { frequency: 554.37, duration: 0.08, type: "sine", gain: 0.15, delay: 0.06 },
    { frequency: 659.25, duration: 0.1, type: "sine", gain: 0.1, delay: 0.12 },
  ],
  drop: [
    { frequency: 200, duration: 0.08, type: "sine", gain: 0.4, ramp: "down" },
  ],
  click: [
    { frequency: 800, duration: 0.03, type: "square", gain: 0.1 },
  ],
  hover: [
    { frequency: 600, duration: 0.02, type: "sine", gain: 0.05 },
  ],
  success: [
    { frequency: 523.25, duration: 0.1, type: "sine", gain: 0.3 },
    { frequency: 659.25, duration: 0.1, type: "sine", gain: 0.25, delay: 0.08 },
    { frequency: 783.99, duration: 0.15, type: "sine", gain: 0.2, delay: 0.16 },
  ],
  error: [
    { frequency: 200, duration: 0.15, type: "sawtooth", gain: 0.2 },
    { frequency: 180, duration: 0.2, type: "sawtooth", gain: 0.15, delay: 0.1 },
  ],
  whoosh: [
    { frequency: 300, duration: 0.2, type: "sine", gain: 0.1, ramp: "updown" },
  ],
  pop: [
    { frequency: 1000, duration: 0.05, type: "sine", gain: 0.3, ramp: "down" },
  ],
  ding: [
    { frequency: 880, duration: 0.3, type: "sine", gain: 0.2, ramp: "down" },
  ],
  achievement: [
    { frequency: 523.25, duration: 0.15, type: "sine", gain: 0.3 },
    { frequency: 659.25, duration: 0.15, type: "sine", gain: 0.25, delay: 0.1 },
    { frequency: 783.99, duration: 0.15, type: "sine", gain: 0.2, delay: 0.2 },
    { frequency: 1046.5, duration: 0.3, type: "sine", gain: 0.3, delay: 0.3 },
  ],
  levelup: [
    { frequency: 261.63, duration: 0.1, type: "sine", gain: 0.3 },
    { frequency: 329.63, duration: 0.1, type: "sine", gain: 0.25, delay: 0.08 },
    { frequency: 392, duration: 0.1, type: "sine", gain: 0.25, delay: 0.16 },
    { frequency: 523.25, duration: 0.1, type: "sine", gain: 0.25, delay: 0.24 },
    { frequency: 659.25, duration: 0.1, type: "sine", gain: 0.2, delay: 0.32 },
    { frequency: 783.99, duration: 0.2, type: "sine", gain: 0.3, delay: 0.4 },
  ],
};

// 사운드 컨텍스트
interface SoundContextType {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  volume: number;
  setVolume: (volume: number) => void;
  play: (sound: SoundType) => void;
}

const SoundContext = createContext<SoundContextType | null>(null);

// 사운드 프로바이더
export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  // 오디오 컨텍스트 초기화 (사용자 인터랙션 후)
  const getAudioContext = useCallback(() => {
    if (audioContext) return audioContext;
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    setAudioContext(ctx);
    return ctx;
  }, [audioContext]);

  // 사운드 재생
  const play = useCallback((sound: SoundType) => {
    if (!enabled) return;

    try {
      const ctx = getAudioContext();
      const preset = SOUND_PRESETS[sound];

      preset.forEach((params) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = params.type;
        oscillator.frequency.value = params.frequency;

        const adjustedGain = params.gain * volume;
        const startTime = ctx.currentTime + (params.delay || 0);

        if (params.ramp === "down") {
          gainNode.gain.setValueAtTime(adjustedGain, startTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + params.duration);
        } else if (params.ramp === "up") {
          gainNode.gain.setValueAtTime(0.01, startTime);
          gainNode.gain.exponentialRampToValueAtTime(adjustedGain, startTime + params.duration);
        } else if (params.ramp === "updown") {
          gainNode.gain.setValueAtTime(0.01, startTime);
          gainNode.gain.exponentialRampToValueAtTime(adjustedGain, startTime + params.duration / 2);
          gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + params.duration);
        } else {
          gainNode.gain.setValueAtTime(adjustedGain, startTime);
          gainNode.gain.setValueAtTime(0.01, startTime + params.duration);
        }

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(startTime);
        oscillator.stop(startTime + params.duration + 0.1);
      });
    } catch (e) {
      // 오디오 재생 실패 시 무시
      console.debug("Sound play failed:", e);
    }
  }, [enabled, volume, getAudioContext]);

  return (
    <SoundContext.Provider value={{ enabled, setEnabled, volume, setVolume, play }}>
      {children}
    </SoundContext.Provider>
  );
}

// 사운드 훅
export function useSound() {
  const context = useContext(SoundContext);
  if (!context) {
    // 프로바이더 없이도 동작하도록 기본값 반환
    return {
      enabled: false,
      setEnabled: () => {},
      volume: 0,
      setVolume: () => {},
      play: () => {},
    };
  }
  return context;
}

// ═══════════════════════════════════════════════════════════
// 사운드 설정 UI
// ═══════════════════════════════════════════════════════════

export function SoundSettings() {
  const { enabled, setEnabled, volume, setVolume, play } = useSound();

  return (
    <div className="p-4 rounded-xl bg-background border shadow-lg w-64">
      <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
        <span>🔊</span> 사운드 설정
      </h3>

      {/* 활성화 토글 */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm">효과음</span>
        <button
          onClick={() => {
            setEnabled(!enabled);
            if (!enabled) play("click");
          }}
          className={`
            relative w-12 h-6 rounded-full transition-colors
            ${enabled ? "bg-indigo-500" : "bg-gray-300"}
          `}
        >
          <div
            className={`
              absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform
              ${enabled ? "translate-x-7" : "translate-x-1"}
            `}
          />
        </button>
      </div>

      {/* 볼륨 슬라이더 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm">볼륨</span>
          <span className="text-xs text-muted-foreground">{Math.round(volume * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={(e) => {
            setVolume(parseFloat(e.target.value));
            play("click");
          }}
          disabled={!enabled}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700 accent-indigo-500"
        />
      </div>

      {/* 테스트 버튼들 */}
      <div className="grid grid-cols-3 gap-1">
        {(["create", "delete", "connect", "success", "pop", "ding"] as SoundType[]).map((sound) => (
          <button
            key={sound}
            onClick={() => play(sound)}
            disabled={!enabled}
            className={`
              px-2 py-1 text-xs rounded transition-colors
              ${enabled ? "hover:bg-muted" : "opacity-50 cursor-not-allowed"}
            `}
          >
            {sound}
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 햅틱 피드백 (모바일용)
// ═══════════════════════════════════════════════════════════

export function useHaptic() {
  const vibrate = useCallback((pattern: number | number[] = 10) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  return {
    light: () => vibrate(10),
    medium: () => vibrate(25),
    heavy: () => vibrate(50),
    success: () => vibrate([10, 50, 10]),
    error: () => vibrate([50, 30, 50]),
    pattern: vibrate,
  };
}
