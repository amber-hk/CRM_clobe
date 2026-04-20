# Clobe CRM Internal

브이원씨(V1C) 내부 마케팅 CRM. 이메일 + 알림톡 발송을 관리하고, 템플릿 메타데이터를 dbt `crm_campaign_map`과 동기화합니다.

## 제품 스큐

| 스큐 | 설명 |
|------|------|
| Clobe AI | B2B 핀테크 자금관리 SaaS |
| Clobe Finance | 성장자금(매출채권 팩토링) |
| Clobe Connect | 세무대리인 ↔ 수임처 연동 |

## 기술 스택

- **프레임워크**: Next.js (App Router, TypeScript)
- **스타일**: Tailwind CSS
- **DB**: Supabase (PostgreSQL) — 미설정 시 localStorage 폴백
- **발송 채널**: NHN Cloud 알림톡 + 이메일 API
- **차트**: Chart.js
- **에디터**: Monaco Editor (이메일 HTML 편집)
- **아이콘**: Lucide React

## 실행

```bash
npm install
npm run dev        # http://localhost:3000
```

### 환경변수 (`.env.local`)

```bash
cp .env.local.example .env.local
```

| 변수 | 필수 | 설명 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | - | Supabase 프로젝트 URL. 없으면 localStorage 모드 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | - | Supabase anon key |
| `NHN_APPKEY` | - | NHN 알림톡 appkey. 없으면 mock 데이터 |
| `NHN_SENDER_KEY` | - | NHN 알림톡 senderKey |
| `NHN_SECRET_KEY` | - | NHN 알림톡 secret |
| `NHN_EMAIL_APPKEY` | - | NHN 이메일 appkey |
| `NHN_EMAIL_SECRET_KEY` | - | NHN 이메일 secret |

모든 변수는 선택. 키 없이도 mock 데이터로 전체 기능 동작합니다.

## 페이지 구성

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/` | 대시보드 | 지표 카드, 타임테이블, 발송량 차트, 캠페인 성과 차트 + 검색 |
| `/send` | 발송하기 | 3-step (캠페인 설정 → 콘텐츠 → 수신자). 이메일 자유/템플릿, 알림톡 |
| `/history` | 발송이력 | 완료 / 대기 중 탭. campaigns 테이블 기반 |
| `/automation` | 자동화 현황 | sendType별 아코디언 그룹핑 (triggered/user_setting/user_ping/미분류) |
| `/templates` | 템플릿 관리 | NHN 템플릿 목록 + CRM 별칭 편집 + 미정의/비활성 필터 |
| `/warnings` | 워닝 | CTR 미달, 추적 미수집, 휴면 템플릿 |
| `/settings` | 설정 | 발송 cap, 주말/공휴일 금지, 이메일 레이아웃 관리 |

## 프로젝트 구조

```
src/
├── app/
│   ├── (dashboard)/           # 사이드바 레이아웃 공유
│   │   ├── page.tsx           # 대시보드
│   │   ├── send/              # 발송하기 (3-step)
│   │   ├── history/           # 발송이력
│   │   ├── automation/        # 자동화 현황
│   │   ├── templates/         # 템플릿 관리
│   │   ├── warnings/          # 워닝
│   │   └── settings/          # 설정
│   └── api/
│       ├── send/test/         # POST  테스트 발송
│       └── nhn/email-template/# GET   이메일 HTML 프록시
├── components/
│   ├── Sidebar.tsx            # 좌측 사이드바 (lucide-react)
│   ├── common/                # Badges, DateRangePicker, SendTypeBadge
│   ├── dashboard/             # TrendChart, Timetable, CampaignPerformanceCharts
│   └── send/                  # AlimPreview (카카오톡 말풍선 미리보기)
├── lib/
│   ├── nhn.ts                 # NHN 알림톡 API 호출 + mock 폴백
│   ├── adapters/nhn-adapter.ts# NHN raw → CRM 타입 변환, 상태 정규화, 버전 그룹핑
│   ├── campaigns.ts           # campaigns 테이블 CRUD (Supabase/localStorage)
│   ├── campaign-map.ts        # crm_campaign_map CRUD + TEMPLATE_META 병합
│   ├── template-defaults.ts   # 66개 추론 메타 (displayName, sendType, sku, funnel)
│   ├── template-id.ts         # normalizeTemplateId() — dbt 정규화 규칙
│   ├── template-meta.tsx      # getTemplateDisplayName(), TemplateName 컴포넌트
│   ├── email-layouts.ts       # 스큐별 헤더/푸터 레이아웃 매핑
│   ├── variable-parser.ts     # #{알림톡} ${이메일} 변수 파싱/치환
│   ├── csv.ts                 # CSV 파싱/생성/다운로드
│   ├── mock-data.ts           # NHN 실데이터 기반 mock (알림톡 46 + 이메일 155)
│   └── dashboard-data.ts      # 대시보드 지표/차트 mock + 기간별 스냅샷
├── types/
│   └── crm.ts                 # 도메인 타입 (Template, AlimTemplate, Campaign 등)
└── middleware.ts              # Supabase 세션 리프레시

supabase/migrations/
├── 0001_crm_campaign_map.sql  # 템플릿 메타 테이블
├── 0002_add_send_type.sql     # send_type 컬럼
├── 0003_add_is_active.sql     # is_active 컬럼
└── 20260415_campaigns.sql     # 캠페인 테이블

docs/
└── data-requirements.md       # 데이터 엔지니어 전달용 요건 정의서
```

## 데이터 레이어

### NHN 알림톡 연동

```
NHN API (46 templates)
  → fetchTemplates()
  → nhn-adapter
      groupTemplatesByName()     # 같은 templateName 버전 묶기
      normalizeTemplateStatus()  # TSC03→approved, TSC04→rejected
      toAlimTemplate()           # AlimTemplate (미리보기 렌더 필드 포함)
```

### 템플릿 별칭 시스템

```
NHN templateId
  ↓ normalizeTemplateId()
정규화 키 (= dbt crm_campaign_map.template_id)
  ↓ TEMPLATE_META[key]  (추론 기본값, 66개)
  ↓ localStorage[key]   (유저 편집, 우선)
  ↓ Supabase[key]       (연동 시, 최우선)
  → displayName / sku / sendType / funnelStage / isActive
```

### mock ↔ 실데이터 전환

모든 데이터 접근 함수(`getCampaigns`, `loadCampaignMap`, `fetchTemplates`)는 환경변수 유무로 자동 분기:
- 키 있음 → Supabase / NHN API 실호출
- 키 없음 → `mock-data.ts` + `localStorage` 폴백

실데이터 전환 시 프론트 코드 변경 없이 `.env.local`만 설정하면 됩니다.

## 주요 개념

### sendType (발송 유형)

| 값 | 설명 | 색상 |
|----|------|------|
| `triggered` | 조건 만족 시 자동 발송 (미접속, 오류 감지) | 파랑 |
| `user_setting` | 유저가 수신 설정해둔 것 (자금일보, 한도 업데이트) | 초록 |
| `user_ping` | 유저 액션 직후 즉시 발송 (가입 환영, 스레드 알림) | 보라 |
| `adhoc` | CRM에서 수동 발송 | 회색 |

### 미정의 템플릿

아래 중 하나라도 없으면 "미정의":
- `display_name` (별칭)
- `sku` (제품 스큐)
- `send_type` (발송 유형)

비활성(`is_active: false`) 템플릿은 미정의 판정에서 제외.

### 지표 정의

| 지표 | 계산 | 채널 |
|------|------|------|
| 발송 수 | 발송 성공 회사 수 (유저 아님) | 전체 |
| 오픈율 | 오픈 회사 수 / 발송 회사 수 | 이메일만 |
| 유입률 | 수신 당일 접속 회사 수 / 수신 회사 수 | 전체 |

## 관련 문서

- [데이터 요건 정의서](docs/data-requirements.md) — 데이터 엔지니어 전달용 (ERD, API 스펙, 지표 계산식)
- [NHN Cloud 알림톡 API](https://docs.nhncloud.com/ko/Notification/KakaoTalk%20Bizmessage/ko/alimtalk-api-guide/)
- [NHN Cloud 이메일 API](https://docs.nhncloud.com/ko/Notification/Email/ko/api-guide/)
