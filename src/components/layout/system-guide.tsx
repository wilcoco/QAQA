"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { HubIcon, AuthorityIcon } from "@/components/ui/score-icons";

const GUIDE_SECTIONS = [
  {
    id: "overview",
    icon: "🧠",
    title: "전체 개요",
    content: [
      {
        subtitle: "업무 지식이란?",
        text: "질문과 답변을 통해 업무 지식을 축적하고 공유하는 플랫폼입니다. 좋은 길을 만들거나, 가치 있는 길을 발굴하여 걸어가면 보상을 받습니다.",
      },
      {
        subtitle: "핵심 활동",
        text: "1) 길 만들기 — AI와 대화하며 지식을 정리합니다.\n2) 길 열기 — 완성된 길을 커뮤니티에 공개합니다.\n3) 걸어가기 — 가치 있다고 판단한 길에 발자국을 남깁니다.\n4) 보상 받기 — 내가 걸어간 길에 후속 발자국이 생기면 보상을 받습니다.",
      },
    ],
  },
  {
    id: "invest",
    icon: "👣",
    title: "발자국 시스템",
    content: [
      {
        subtitle: "걸어가면 무슨 일이 일어나나요?",
        text: "발자국은 두 부분으로 나뉩니다:\n• 50% — 먼저 걸어간 사람들에게 비례 배분됩니다.\n• 50% — 나보다 먼저 걸어간 사람들에게 지분 비례로 돌아갑니다.",
      },
      {
        subtitle: "왜 일찍 걸어가면 유리한가요?",
        text: "먼저 걸어가면 이후 들어오는 모든 발자국에서 50%를 보상으로 나눠 받습니다. 인기 있는 길에 일찍 걸어갈수록 더 많은 후속 발자국으로부터 보상을 받을 수 있습니다.",
      },
      {
        subtitle: "개척자 보상",
        text: "좋은 길을 먼저 발견하고 걸어간 사람이 더 많은 보상을 받습니다. 여러 사람이 독립적으로 걸어갈 만큼 가치 있는 길만 큰 보상이 발생합니다.",
      },
      {
        subtitle: "보상 상한",
        text: "한 번 걸어가서 받을 수 있는 누적 보상은 원금의 2배까지입니다. 예를 들어 100👣을 남기면 최대 200👣까지 보상받을 수 있습니다.",
      },
    ],
  },
  {
    id: "scores",
    icon: "📊",
    title: "Hub & Authority 점수",
    content: [
      {
        subtitle: "🎯 Hub 점수 (길 찾기 안목)",
        text: "걸어가서 받은 보상 실적을 기반으로 계산됩니다. 좋은 길을 먼저 발굴해서 높은 보상을 받을수록 Hub가 올라갑니다.\n\n• Hub가 높으면: 같은 발자국으로 더 큰 실효 지분을 확보합니다.\n• 실효 가중치 = √(발자국 수) × Hub 점수\n• 기본값: 1.0 (신규 사용자)",
      },
      {
        subtitle: "⚡ Authority 점수 (길 개척 권위)",
        text: "내가 만든 길에 다른 사람들이 걸어간 실적을 기반으로 계산됩니다. 외부 발자국이 쌓일수록 Authority가 올라갑니다.\n\n• Authority가 높으면: 보상 배분 시 더 많은 보상, 확장된 길에서 높은 배분 비율을 확보합니다.\n• 기본값: 100 (길을 연 모든 사용자)\n• 자기 발자국은 제외됩니다 — 순수하게 다른 사람의 발자국만 반영합니다.",
      },
      {
        subtitle: "📐 로그 스케일이란?",
        text: "점수는 로그 함수로 계산되어 높아질수록 올리기 지수적으로 어려워집니다.\n\n예시 (Authority):\n• 외부 발자국 평균 100 → 점수 150\n• 외부 발자국 평균 1,000 → 점수 267\n• 외부 발자국 평균 10,000 → 점수 433\n\n같은 50점을 올리는 데 필요한 발자국이 점점 많아집니다. 이는 점수 조작을 비효율적으로 만들고, 꾸준한 양질의 활동만이 높은 점수를 유지할 수 있게 합니다.",
      },
    ],
  },
  {
    id: "trust",
    icon: "🎖️",
    title: "신뢰 레벨",
    content: [
      {
        subtitle: "신뢰 레벨이란?",
        text: "활동 점수(발자국 수 + 받은 보상)가 쌓이면 레벨이 올라갑니다. 레벨이 높을수록 1회 최대 발자국 한도가 증가합니다.",
      },
      {
        subtitle: "레벨별 한도",
        text: "• Lv.1 신규 — 최대 50👣 / 회 (활동 점수 0+)\n• Lv.2 기여자 — 최대 100👣 / 회 (활동 점수 150+)\n• Lv.3 전문가 — 최대 200👣 / 회 (활동 점수 500+)\n• Lv.4 마스터 — 최대 350👣 / 회 (활동 점수 1,500+)\n• Lv.5 권위자 — 최대 500👣 / 회 (활동 점수 5,000+)",
      },
    ],
  },
  {
    id: "rules",
    icon: "🛡️",
    title: "건전성 규칙",
    content: [
      {
        subtitle: "발자국 제한",
        text: "• 자기 길에 발자국 불가 (개척 시 Authority로 자동 반영)\n• 시간당 최대 3건 걸어가기\n• 하루 최대 10건 걸어가기\n• 같은 길에 다시 걸어가기는 24시간 후 가능\n• 신규 계정(7일 미만)은 1회 최대 50👣",
      },
      {
        subtitle: "점수 조작 방지",
        text: "• 로그 스케일로 높은 점수를 인위적으로 올리기 어려움\n• 자기 발자국은 Authority에 반영되지 않음\n• 상호 걸어가기 패턴 감지 시 경고\n• 다수의 독립적 발자국이 필요",
      },
      {
        subtitle: "발자국 지우기",
        text: "걸어간 후 24시간 이내에 철회할 수 있습니다. 다만, 발자국의 20%가 수수료로 차감됩니다.",
      },
    ],
  },
  {
    id: "negative",
    icon: "🔻",
    title: "반대 (마이너스)",
    content: [
      {
        subtitle: "반대란?",
        text: "낮은 품질이나 문제가 의심되는 길에 '반대'를 할 수 있습니다. 반대를 받은 길은 순 발자국이 감소하고, 개척자의 Authority가 떨어집니다.",
      },
      {
        subtitle: "반대 보상 구조",
        text: "걸어가기와 동일한 대칭 구조입니다!\n• 50% → 먼저 반대한 사람들에게 비례 배분\n• 50% → 선행 반대자 보상\n\n먼저 나쁜 길을 발견한 반대자가 유리합니다.",
      },
      {
        subtitle: "조건과 주의사항",
        text: "• 신뢰 레벨 Lv.2 이상만 가능\n• 이미 걸어간 길에는 불가 (반대도 마찬가지)\n• 자기 길에 반대 불가\n• 반대도 발자국 비용이 들므로 확신이 있을 때만!\n• 순 발자국이 0 이하가 되면 품질 경고 표시",
      },
    ],
  },
  {
    id: "fork",
    icon: "🔗",
    title: "확장 (갈래길)",
    content: [
      {
        subtitle: "확장이란?",
        text: "다른 사람이 연 길을 기반으로 새로운 질문을 이어나가는 기능입니다. 원본의 맥락을 유지하면서 더 깊은 탐구가 가능합니다.",
      },
      {
        subtitle: "확장된 길의 발자국 배분",
        text: "확장된 길에 발자국이 생기면, 일부가 원본 길 개척자에게도 배분됩니다. 배분 비율은 두 개척자의 Authority 비율로 결정됩니다.\n\n예시: 원본 Authority 200, 확장 Authority 100 → 원본에 67% 배분",
      },
    ],
  },
];

export function SystemGuide() {
  const [openSection, setOpenSection] = useState("overview");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" title="시스템 가이드">
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">도움말</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-lg">📖 시스템 가이드</DialogTitle>
        </DialogHeader>

        <div className="flex gap-3 overflow-hidden flex-1 min-h-0">
          {/* Section tabs */}
          <div className="w-36 shrink-0 space-y-1 overflow-y-auto">
            {GUIDE_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setOpenSection(section.id)}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors ${
                  openSection === section.id
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                <span className="mr-1.5">{section.icon}</span>
                {section.title}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto pr-1">
            {GUIDE_SECTIONS.filter((s) => s.id === openSection).map((section) => (
              <div key={section.id} className="space-y-4">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <span>{section.icon}</span>
                  {section.title}
                </h2>
                {section.content.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <h3 className="text-sm font-semibold text-foreground">{item.subtitle}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
