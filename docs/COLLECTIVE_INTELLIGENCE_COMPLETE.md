# 집단지성 플랫폼 완성 기획서

> **핵심 비전**: AI 답변을 수동적으로 소비하는 것이 아닌, 인간의 지능이 추가되어 AI와 사람 모두가 똑똑해지는 구조

---

## 현황 분석

### 구현된 것
| 기능 | 상태 | 파일 |
|------|------|------|
| 사람 답변 모드 | O | `human-answer/route.ts` |
| AI 답변 개선 | O | `improve/route.ts` |
| 발자국 투자 | O | `invest-dialog.tsx` |
| 반대 발자국 (사냥) | O | `hunt-dialog.tsx` |
| 의견 달기 | O | `message-card.tsx` |
| 인사이트 감지 | O | `insight-detector.ts` |
| 인간 지식 → AI 주입 | O | `human-knowledge-retrieval.ts` |

### 부족한 것
| 문제 | 영향 |
|------|------|
| 피드백 루프 미완성 | 내 기여가 도움됐는지 모름 → 동기 저하 |
| 협업 편집 제한 | 소유자만 수정 → 진정한 집단지성 불가 |
| 토론 구조 약함 | 의견 간 대화/투표 없음 → 일방향 |
| AI 학습 불투명 | "내가 AI를 똑똑하게 했다" 체감 없음 |
| 기여 보상 분리 | 인용 시 보상 없음 → 선순환 끊김 |

---

## Phase 1: 피드백 루프 완성 (2주)

### 1.1 인용 추적 시스템 (Citation Tracking)

**목표**: 내 지식이 다른 사람에게 도움될 때 알림 + 보상

#### 데이터 모델 추가

```prisma
model Citation {
  id              String   @id @default(cuid())
  
  // 인용된 원본
  sourceType      String   // "insight" | "human_answer" | "opinion" | "improvement"
  sourceMessageId String?
  sourceOpinionId String?
  sourceUserId    String   // 원저자
  
  // 인용한 대화
  targetQASetId   String
  targetMessageId String   // AI 응답 메시지 ID
  targetUserId    String   // 질문자
  
  // 메타데이터
  similarity      Float    // 유사도 점수
  wasHelpful      Boolean? // 질문자 피드백 (null = 미응답)
  
  // 보상
  rewardGranted   Int      @default(0)
  
  createdAt       DateTime @default(now())
  
  @@index([sourceUserId, createdAt])
  @@index([targetQASetId])
}
```

#### API 구현

```typescript
// POST /api/citations/track
// AI 응답 생성 시 자동 호출 (chat/route.ts에서)

interface TrackCitationInput {
  humanKnowledgeResults: HumanKnowledgeResult[];
  targetQASetId: string;
  targetMessageId: string;
}

// 1. Citation 레코드 생성
// 2. 원저자에게 알림 발송
// 3. 인용 보상 (+2 발자국) 지급
```

#### 알림 타입 추가

```typescript
// Notification.type에 추가
"citation_received"      // "당신의 답변이 새 대화에서 인용되었습니다"
"citation_helpful"       // "인용된 답변이 '도움됨' 평가를 받았습니다" (+보너스)
"citation_milestone"     // "당신의 지식이 10명에게 도움이 되었습니다"
```

#### UX: AI 응답에 인용 표시

```
┌──────────────────────────────────────────────────┐
│ 🤖 AI 응답                                        │
│                                                  │
│ 서울의 벚꽃 명소로는 여의도가 대표적입니다.            │
│                                                  │
│ ┌────────────────────────────────────────────┐   │
│ │ 💡 커뮤니티 인사이트 참조                      │   │
│ │ @김철수: "올해는 4월 초가 절정이었어요"        │   │
│ │ @박영희: "주차가 어려워서 지하철 추천"         │   │
│ │                          [도움됨 👍] [아니오]  │   │
│ └────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

#### 보상 구조

| 이벤트 | 보상 |
|--------|------|
| 내 지식이 인용됨 | +2 발자국 |
| 인용에 "도움됨" 평가 | +3 발자국 (추가) |
| 10회 인용 달성 | +10 발자국 (마일스톤) |
| 50회 인용 달성 | +30 발자국 + "지식 기여자" 배지 |

---

### 1.2 기여 대시보드

**목표**: 내 기여의 영향력을 한눈에

#### 컴포넌트: `my-impact-dashboard.tsx`

```
┌──────────────────────────────────────────────────┐
│ 🌟 나의 기여 임팩트                                │
├──────────────────────────────────────────────────┤
│                                                  │
│  📊 이번 주 요약                                  │
│  ┌────────┬────────┬────────┬────────┐          │
│  │ 💡 3   │ ✍️ 5   │ 📣 12  │ 👁️ 156 │          │
│  │인사이트 │ 개선   │ 인용됨  │ 조회수  │          │
│  └────────┴────────┴────────┴────────┘          │
│                                                  │
│  🔥 가장 영향력 있는 기여                          │
│  ┌──────────────────────────────────────────┐   │
│  │ "React 18의 Suspense는..."                │   │
│  │ 💡 인사이트 · 23회 인용 · 15명에게 도움       │   │
│  │ +47 발자국 획득                            │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  📈 AI 개선 기여도                                │
│  [████████████░░░░░░░░] 62%                     │
│  "당신의 지식이 AI 응답 품질을 12% 향상시켰습니다"   │
│                                                  │
└──────────────────────────────────────────────────┘
```

#### 데이터 모델 추가

```prisma
model UserImpactStats {
  id                  String   @id @default(cuid())
  userId              String   @unique
  
  // 누적 통계
  totalInsights       Int      @default(0)
  totalImprovements   Int      @default(0)
  totalCitations      Int      @default(0)
  totalHelpfulVotes   Int      @default(0)
  
  // 주간/월간 (롤업)
  weeklyInsights      Int      @default(0)
  weeklyCitations     Int      @default(0)
  
  // AI 품질 기여 점수 (0-100)
  aiQualityContribution Float  @default(0)
  
  lastCalculatedAt    DateTime @default(now())
  
  @@index([userId])
}
```

---

## Phase 2: 협업 편집 시스템 (3주)

### 2.1 제안(Suggestion) 시스템

**목표**: 소유자가 아니어도 개선 제안 가능 → 소유자 승인 시 반영

#### 데이터 모델

```prisma
model EditSuggestion {
  id              String   @id @default(cuid())
  
  // 대상
  messageId       String
  message         Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)
  
  // 제안자
  suggesterId     String
  suggester       User     @relation("SuggestionAuthor", fields: [suggesterId], references: [id])
  
  // 내용
  originalContent String   // 제안 시점 원본
  suggestedContent String  // 제안 내용
  suggestionNote  String?  // 제안 사유
  
  // 상태
  status          String   @default("pending") // "pending" | "accepted" | "rejected" | "merged"
  
  // 투표 (커뮤니티 검증)
  upvotes         Int      @default(0)
  downvotes       Int      @default(0)
  
  // 처리
  reviewedById    String?
  reviewedAt      DateTime?
  reviewNote      String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  votes           SuggestionVote[]
  
  @@index([messageId, status])
  @@index([suggesterId])
}

model SuggestionVote {
  id              String   @id @default(cuid())
  suggestionId    String
  suggestion      EditSuggestion @relation(fields: [suggestionId], references: [id], onDelete: Cascade)
  userId          String
  isUpvote        Boolean
  createdAt       DateTime @default(now())
  
  @@unique([suggestionId, userId])
}
```

#### UX: 제안 플로우

```
[비소유자가 답변을 볼 때]
┌──────────────────────────────────────────────────┐
│ 🤖 AI 응답                                        │
│                                                  │
│ 서울의 인구는 약 1000만명입니다.                    │
│                                                  │
│ [✏️ 개선 제안] [💬 의견] [📋 복사]                  │
└──────────────────────────────────────────────────┘

[개선 제안 클릭 시]
┌──────────────────────────────────────────────────┐
│ ✏️ 개선 제안하기                                   │
├──────────────────────────────────────────────────┤
│ 원본:                                            │
│ "서울의 인구는 약 1000만명입니다."                   │
│                                                  │
│ 제안:                                            │
│ ┌──────────────────────────────────────────┐    │
│ │ 서울의 인구는 약 950만명입니다 (2024년 기준). │    │
│ │ 수도권 전체는 약 2600만명입니다.             │    │
│ └──────────────────────────────────────────┘    │
│                                                  │
│ 제안 사유:                                        │
│ ┌──────────────────────────────────────────┐    │
│ │ 최신 통계청 자료 반영                        │    │
│ └──────────────────────────────────────────┘    │
│                                                  │
│                    [취소] [제안 보내기]            │
└──────────────────────────────────────────────────┘
```

#### 소유자 알림 및 처리

```
┌──────────────────────────────────────────────────┐
│ 🔔 새 개선 제안 (3건)                              │
├──────────────────────────────────────────────────┤
│ @박영희님의 제안                                   │
│ "서울의 인구는 약 950만명..." → 원본과 비교         │
│                                                  │
│ 커뮤니티 의견: 👍 7  👎 1                          │
│                                                  │
│ [수락 ✓] [거절 ✗] [수정 후 수락]                   │
└──────────────────────────────────────────────────┘
```

#### 보상

| 이벤트 | 보상 |
|--------|------|
| 제안 수락됨 | +5 발자국 |
| 제안에 투표 받음 (👍) | +1 발자국 |
| 3회 이상 제안 수락 | "개선자" 배지 |

---

### 2.2 공동 편집 모드 (Wiki-style)

**목표**: 특정 QASet을 "공동 편집 가능"으로 설정

#### 데이터 모델 확장

```prisma
// QASet 모델에 추가
model QASet {
  // ... 기존 필드
  
  // 협업 설정
  collaborationType   String  @default("owner_only") 
  // "owner_only" | "suggestion_only" | "open_edit" | "trusted_edit"
  
  // open_edit: 누구나 편집 (위키 스타일)
  // trusted_edit: trustLevel 3+ 만 편집
  
  // 편집 이력
  editHistory         EditHistory[]
}

model EditHistory {
  id              String   @id @default(cuid())
  qaSetId         String
  qaSet           QASet    @relation(fields: [qaSetId], references: [id], onDelete: Cascade)
  
  messageId       String
  editorId        String
  
  previousContent String
  newContent      String
  editNote        String?
  
  // 롤백 가능
  isReverted      Boolean  @default(false)
  revertedById    String?
  revertedAt      DateTime?
  
  createdAt       DateTime @default(now())
  
  @@index([qaSetId, createdAt])
}
```

#### UX: 협업 타입 설정 (공유 시)

```
┌──────────────────────────────────────────────────┐
│ 🚀 이 길을 공유합니다                               │
├──────────────────────────────────────────────────┤
│                                                  │
│ 협업 방식 선택:                                    │
│                                                  │
│ ○ 🔒 나만 편집 가능                                │
│   다른 사람은 의견만 남길 수 있습니다                 │
│                                                  │
│ ● 💡 제안 받기 (추천)                              │
│   개선 제안을 받고 내가 검토 후 반영합니다            │
│                                                  │
│ ○ 📝 신뢰자 공동 편집                              │
│   신뢰도 3 이상 사용자가 직접 편집할 수 있습니다      │
│                                                  │
│ ○ 🌍 완전 공개 편집 (위키)                         │
│   누구나 편집 가능, 모든 변경이 기록됩니다            │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## Phase 3: 토론 구조 강화 (2주)

### 3.1 의견 간 대화 (Threaded Opinions)

**목표**: 의견에 대한 의견 → 진정한 토론

#### 데이터 모델 확장

```prisma
model OpinionNode {
  // ... 기존 필드
  
  // 부모 의견 (대댓글 구조)
  parentOpinionId String?
  parentOpinion   OpinionNode?  @relation("OpinionThread", fields: [parentOpinionId], references: [id])
  childOpinions   OpinionNode[] @relation("OpinionThread")
  
  // 입장 태그
  stance          String?  // "agree" | "disagree" | "neutral" | "question"
  
  // 투표
  upvotes         Int      @default(0)
  downvotes       Int      @default(0)
}
```

#### UX: 토론 스레드

```
┌──────────────────────────────────────────────────┐
│ 💬 토론 (12개 의견)                                │
├──────────────────────────────────────────────────┤
│                                                  │
│ 🟢 @김철수 (동의) · 👍 15                          │
│ │ "실제로 React 18에서 Suspense를 써봤는데..."    │
│ │                                                │
│ ├─ 🔴 @박영희 (반박) · 👍 8                       │
│ │  │ "하지만 Next.js 환경에서는 다릅니다..."       │
│ │  │                                             │
│ │  ├─ 🟡 @이민수 (질문)                          │
│ │  │   "구체적으로 어떤 차이가 있나요?"            │
│ │  │                                             │
│ │  └─ 🟢 @박영희 (답변)                          │
│ │      "서버 컴포넌트에서는..."                   │
│ │                                                │
│ └─ 🟢 @최지원 (근거 추가) · 👍 5                  │
│     "공식 문서에서도 이렇게 설명합니다: [링크]"     │
│                                                  │
│ [💬 의견 추가하기]                                 │
└──────────────────────────────────────────────────┘
```

### 3.2 의견 투표 + 합의 도출

**목표**: 가장 가치있는 의견이 부각되고, 합의점 시각화

#### 투표 시스템

```prisma
model OpinionVote {
  id          String   @id @default(cuid())
  opinionId   String
  opinion     OpinionNode @relation(fields: [opinionId], references: [id], onDelete: Cascade)
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  
  voteType    String   // "upvote" | "downvote" | "insightful" | "needs_evidence"
  
  createdAt   DateTime @default(now())
  
  @@unique([opinionId, userId])
}
```

#### UX: 합의 요약 (AI 생성)

```
┌──────────────────────────────────────────────────┐
│ 🎯 커뮤니티 합의 요약                               │
├──────────────────────────────────────────────────┤
│                                                  │
│ ✅ 합의된 점 (12명 동의):                          │
│ • React 18 Suspense는 데이터 페칭에 효과적          │
│ • 서버 컴포넌트와 함께 쓸 때 주의 필요               │
│                                                  │
│ ⚖️ 논쟁 중 (찬 5 vs 반 4):                        │
│ • Next.js App Router에서의 적합성                  │
│                                                  │
│ ❓ 추가 검증 필요:                                 │
│ • 대규모 앱에서의 성능 벤치마크                      │
│                                                  │
│ 📊 이 토론에 참여하기 →                            │
└──────────────────────────────────────────────────┘
```

---

## Phase 4: AI 학습 가시화 (2주)

### 4.1 "AI 메모리" 시각화

**목표**: 사람 기여가 AI 지식으로 축적되는 과정을 보여줌

#### UX: AI 지식 저장소

```
┌──────────────────────────────────────────────────┐
│ 🧠 AI 지식 저장소                                  │
│ "이 주제에 대해 AI가 학습한 인간 지식들"             │
├──────────────────────────────────────────────────┤
│                                                  │
│ 📚 "React Suspense" 주제 (47개 인사이트)           │
│                                                  │
│ 최근 추가된 지식:                                  │
│ ┌──────────────────────────────────────────┐    │
│ │ 💡 @김철수                                │    │
│ │ "프로덕션에서는 ErrorBoundary와 함께..."    │    │
│ │ 📊 14회 인용 · 98% 도움됨                  │    │
│ │ 📅 3일 전 추가                            │    │
│ └──────────────────────────────────────────┘    │
│                                                  │
│ ┌──────────────────────────────────────────┐    │
│ │ ✍️ @박영희                                │    │
│ │ "Next.js 14에서 달라진 점은..."            │    │
│ │ 📊 8회 인용 · 92% 도움됨                   │    │
│ │ 📅 1주 전 추가                            │    │
│ └──────────────────────────────────────────┘    │
│                                                  │
│ 🔍 전체 47개 인사이트 보기 →                       │
└──────────────────────────────────────────────────┘
```

### 4.2 실시간 AI 참조 표시

**목표**: AI 응답 생성 중 어떤 인간 지식을 참조하는지 실시간 표시

#### UX: 스트리밍 중 참조 표시

```
┌──────────────────────────────────────────────────┐
│ 🤖 AI가 답변을 생성하고 있습니다...                  │
│                                                  │
│ ░░░░░░░░░░░░░░░░                                │
│                                                  │
│ 📖 참조 중인 커뮤니티 지식:                         │
│ • 💡 @김철수의 인사이트 (React 최적화)              │
│ • ✍️ @박영희의 경험담 (Next.js 마이그레이션)        │
│ • 💬 @이민수의 의견 (성능 비교)                    │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 4.3 주제별 AI 품질 점수

**목표**: 인간 기여로 AI가 얼마나 똑똑해졌는지 측정

#### 데이터 모델

```prisma
model TopicAIQuality {
  id                  String   @id @default(cuid())
  topicClusterId      String   @unique
  topicCluster        TopicCluster @relation(fields: [topicClusterId], references: [id])
  
  // 품질 지표
  baselineScore       Float    @default(50)  // 인간 기여 없이 AI만의 점수
  currentScore        Float    @default(50)  // 현재 점수
  
  // 기여 통계
  totalInsights       Int      @default(0)
  totalHumanAnswers   Int      @default(0)
  totalImprovements   Int      @default(0)
  totalOpinions       Int      @default(0)
  
  // 측정 방법: 도움됨 비율 기반
  helpfulRate         Float    @default(0)   // 인용 후 "도움됨" 비율
  
  lastCalculatedAt    DateTime @default(now())
  
  @@index([currentScore])
}
```

#### UX: 주제 페이지에 AI 품질 표시

```
┌──────────────────────────────────────────────────┐
│ 📂 React Suspense 주제                            │
├──────────────────────────────────────────────────┤
│                                                  │
│ 🧠 AI 지능 레벨                                   │
│ ┌────────────────────────────────────────────┐  │
│ │  기본 AI    [████░░░░░░░░░░░░░░░░] 50점     │  │
│ │  + 인사이트 [██████████░░░░░░░░░░] +20점    │  │
│ │  + 개선     [████████████░░░░░░░░] +8점     │  │
│ │  + 의견     [██████████████░░░░░░] +5점     │  │
│ │  ───────────────────────────────────────   │  │
│ │  현재 AI    [██████████████████░░] 83점     │  │
│ └────────────────────────────────────────────┘  │
│                                                  │
│ 💡 "커뮤니티 기여로 AI가 66% 더 똑똑해졌습니다"       │
│                                                  │
│ 🏆 최고 기여자: @김철수 (+12점), @박영희 (+8점)     │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## Phase 5: 선순환 경제 완성 (2주)

### 5.1 인용 보상 체계

**목표**: 지식 기여 → 인용 → 보상 → 더 많은 기여

#### 보상 플로우

```
[인간 기여]
    │
    ▼
[AI 지식으로 저장]
    │
    ▼
[다른 대화에서 인용] ─────→ [원저자에게 +2 발자국]
    │
    ▼
["도움됨" 평가] ──────────→ [원저자에게 +3 발자국 추가]
    │
    ▼
[마일스톤 달성] ──────────→ [배지 + 보너스 발자국]
```

### 5.2 지식 농장 (Knowledge Farm)

**목표**: 내 지식이 "자라는" 게임화

#### 컨셉

```
┌──────────────────────────────────────────────────┐
│ 🌱 나의 지식 농장                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│  [🌱] [🌿] [🌳] [🌳] [🌲]                         │
│  새싹  성장  결실  결실  거목                       │
│                                                  │
│ 🌱 "React 훅 팁" - 방금 심음                       │
│    0회 인용 · 자라는 중...                         │
│                                                  │
│ 🌳 "Next.js 캐싱 전략" - 결실 맺음!                │
│    23회 인용 · +47 발자국 수확                     │
│    [🍎 수확하기]                                   │
│                                                  │
│ 🌲 "TypeScript 제네릭 패턴" - 거목이 됨!           │
│    156회 인용 · 계속 열매 맺는 중                   │
│    이번 주 수확: +12 발자국                        │
│                                                  │
└──────────────────────────────────────────────────┘
```

#### 성장 단계

| 단계 | 조건 | 아이콘 | 보상 |
|------|------|--------|------|
| 새싹 | 기여 등록 | 🌱 | +2 |
| 싹틈 | 1회 인용 | 🌿 | +3 |
| 성장 | 5회 인용 | 🪴 | +5 |
| 결실 | 15회 인용 | 🌳 | +15 + 수확 가능 |
| 거목 | 50회 인용 | 🌲 | 지속적 수확 (인용당 +1) |

---

## 구현 우선순위 및 일정

### Phase 1: 피드백 루프 (2주) - 가장 급함
- [ ] Citation 모델 + API
- [ ] 인용 시 알림 발송
- [ ] AI 응답에 인용 출처 표시
- [ ] "도움됨" 피드백 UI

### Phase 2: 협업 편집 (3주)
- [ ] EditSuggestion 모델 + API
- [ ] 제안 UI (비소유자용)
- [ ] 소유자 검토 UI
- [ ] 협업 타입 설정

### Phase 3: 토론 강화 (2주)
- [ ] 의견 스레드 구조
- [ ] 투표 시스템
- [ ] 합의 요약 AI

### Phase 4: AI 학습 가시화 (2주)
- [ ] AI 지식 저장소 UI
- [ ] 실시간 참조 표시
- [ ] 주제별 AI 품질 점수

### Phase 5: 경제 완성 (2주)
- [ ] 인용 보상 자동화
- [ ] 지식 농장 게임화

---

## 성공 지표 (KPIs)

| 지표 | 현재 | 목표 (3개월) |
|------|------|-------------|
| 월간 인사이트 생성 | ? | 500+ |
| 기여당 평균 인용 횟수 | 0 | 5+ |
| "도움됨" 평가 비율 | 0% | 70%+ |
| 제안 수락률 | N/A | 40%+ |
| 활성 토론 스레드 | 0 | 100+ |
| AI 품질 점수 향상 | 0% | +30% |

---

## 핵심 원칙 (구현 시 준수)

1. **가시성 우선**: 백엔드에 있는 기능도 UX로 드러나야 의미있음
2. **즉각적 피드백**: 기여 → 보상/알림이 빨라야 동기부여
3. **공정한 귀속**: 원저자 크레딧 명확히
4. **점진적 신뢰**: 처음엔 제안, 신뢰 쌓이면 직접 편집
5. **게임화 but 본질 유지**: 발자국은 도구, 목적은 집단지성

---

## 결론

현재 시스템의 **기술적 백본은 있지만, 사용자 경험으로 드러나지 않음**.

이 기획의 핵심은:
1. **피드백 루프 완성** → "내 기여가 의미있다" 체감
2. **협업 문턱 낮춤** → 제안 시스템으로 참여 장벽 제거
3. **토론 구조화** → 일방향 의견 → 양방향 대화
4. **AI 학습 시각화** → "우리가 AI를 키운다" 내러티브

이것이 구현되면 **"AI를 소비하는 플랫폼"에서 "AI를 키우는 플랫폼"**으로 전환됨.
