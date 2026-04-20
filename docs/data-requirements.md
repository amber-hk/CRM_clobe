# Clobe CRM 데이터 요건 정의서

> **작성자**: 마케팅팀  
> **대상**: 데이터 엔지니어  
> **상태**: CRM 프론트 완성 (Next.js + Tailwind), mock 데이터로 동작 중. 실데이터 연동 필요.

---

## 1. ERD (Entity Relationship Diagram)

```
┌─────────────────────┐        ┌─────────────────────────┐
│    campaigns        │        │   crm_campaign_map      │
│─────────────────────│        │─────────────────────────│
│ id (PK, uuid)       │        │ template_id (PK, text)  │
│ name                │───────>│ channel                 │
│ template_id (FK)    │        │ display_name            │
│ channel             │        │ description             │
│ send_type           │        │ sku                     │
│ sku_id              │        │ funnel_stage            │
│ sent_at             │        │ send_type               │
│ recipient_count     │        │ is_active               │
│ open_rate           │        │ updated_at              │
│ conversion_rate     │        └─────────────────────────┘
│ status              │                    ▲
│ created_at          │                    │ normalizeTemplateId()
│ created_by          │                    │
└─────────────────────┘        ┌───────────┴─────────────┐
                               │  NHN Cloud Templates    │
         ┌─────────────────┐   │  (알림톡 46개 + 이메일   │
         │  send_logs      │   │   155개, 외부 시스템)    │
         │  (신규 필요)     │   └─────────────────────────┘
         │─────────────────│
         │ id (PK)         │
         │ campaign_id(FK) │
         │ recipient_id    │
         │ channel         │
         │ sent_at         │
         │ status          │
         │ opened_at       │
         │ clicked_at      │
         │ nhn_request_id  │
         └─────────────────┘

         ┌──────────────────────┐
         │  scheduled_sends     │
         │  (신규 필요)         │
         │──────────────────────│
         │ id (PK)              │
         │ campaign_id (FK)     │
         │ template_id          │
         │ channel              │
         │ scheduled_at         │
         │ expected_count       │
         │ reason               │
         │ status               │
         └──────────────────────┘
```

**관계 요약**:
- `campaigns.template_id` → `crm_campaign_map.template_id` (N:1)
- `send_logs.campaign_id` → `campaigns.id` (N:1)
- `scheduled_sends.campaign_id` → `campaigns.id` (N:1, nullable)
- `crm_campaign_map.template_id`는 NHN templateId를 정규화한 값

---

## 2. 테이블별 컬럼 정의서

### 2-1. campaigns (기존 — DDL 있음)

> 파일: `supabase/migrations/20260415_campaigns.sql`

| 컬럼 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `id` | uuid | PK | 자동 생성 | `550e8400-...` |
| `name` | text | O | 캠페인 이름 (CRM에서 입력) | `"4월 부가세 안내"` |
| `template_id` | text | - | 정규화된 NHN 템플릿 ID. 자유 발송이면 null | `"daily_report"` |
| `channel` | text | O | `'email'` \| `'alimtalk'` | `"email"` |
| `send_type` | text | O | `'triggered'` \| `'user_setting'` \| `'user_ping'` \| `'adhoc'` | `"adhoc"` |
| `sku_id` | text | - | `'clobe-ai'` \| `'clobe-finance'` \| `'clobe-connect'` | `"clobe-ai"` |
| `sent_at` | timestamptz | - | 실제 발송 시점 | `2026-04-08T14:32:00Z` |
| `recipient_count` | integer | - | **발송 회사 수** (유저 수 아님) | `3840` |
| `open_rate` | float | - | 이메일만. 알림톡은 null | `0.38` |
| `conversion_rate` | float | - | 유입률 (수신 당일 접속 회사 수 / 수신 회사 수) | `0.22` |
| `status` | text | - | `'pending'` \| `'sending'` \| `'done'` \| `'failed'` | `"done"` |
| `created_at` | timestamptz | - | 레코드 생성 시점 (default now) | |
| `created_by` | text | - | 발송자 또는 `"자동화"` | `"앰버"` |

### 2-2. crm_campaign_map (기존 — DDL 있음)

> 파일: `supabase/migrations/0001~0003`

| 컬럼 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `template_id` | text | PK | dbt 정규화 규칙 적용된 ID | `"daily_report"` |
| `channel` | text | O | `'ALIMTALK'` \| `'EMAIL'` | `"EMAIL"` |
| `display_name` | text | O | CRM/대시보드에 표시되는 별칭 | `"자금일보"` |
| `description` | text | - | 용도 설명 | `"매일 아침 발송되는 자금일보"` |
| `sku` | text | - | 제품 스큐 | `"clobe-ai"` |
| `funnel_stage` | text | - | `'onboarding'` \| `'activation'` \| `'retention'` \| `'offboarding'` \| `'finance'` | `"activation"` |
| `send_type` | text | - | `'triggered'` \| `'user_setting'` \| `'user_ping'` | `"user_setting"` |
| `is_active` | boolean | - | false면 발송/자동화 화면에서 숨김 (default true) | `true` |
| `updated_at` | timestamptz | - | 마지막 수정 시점 | |

**정규화 규칙** (dbt `mart.crm_campaign_map`과 동일):
```sql
REGEXP_REPLACE(LOWER(template_id), r'(_\d)?_(prod|dev)$|_\d$', '')
```
예시:
- `daily_report_prod` → `daily_report`
- `data_connection_d1_test-1_prod` → `data_connection_d1_test-1`
- `off-notice-1st-t2` → `off-notice-1st-t2` (매칭 없음, 그대로)

### 2-3. send_logs (신규 — 스키마 제안)

> NHN 발송 결과를 건별로 적재. campaigns 테이블의 집계 원본.

| 컬럼 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `id` | bigint | PK | 자동 증가 | |
| `campaign_id` | uuid | FK | campaigns.id | |
| `recipient_id` | text | O | 회사 ID 또는 이메일/전화번호 해시 | `"company_abc123"` |
| `channel` | text | O | `'email'` \| `'alimtalk'` | |
| `sent_at` | timestamptz | O | NHN 발송 시점 | |
| `status` | text | O | `'success'` \| `'failed'` \| `'pending'` | |
| `opened_at` | timestamptz | - | 이메일 오픈 시점 (알림톡 null) | |
| `clicked_at` | timestamptz | - | CTA 클릭 시점 | |
| `nhn_request_id` | text | - | NHN API response의 requestId | `"20260408-abc..."` |
| `nhn_result_code` | text | - | NHN 발송 결과 코드 | `"0"` (성공) |

**용도**: `campaigns.open_rate`, `conversion_rate`, `recipient_count` 집계 원본.

### 2-4. scheduled_sends (신규 — 스키마 제안)

> 발송 예정 목록. CRM 발송이력 "대기 중" 탭 + 대시보드 타임테이블 데이터 소스.

| 컬럼 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `id` | uuid | PK | 자동 생성 | |
| `campaign_id` | uuid | FK | campaigns.id (nullable — 아직 생성 전) | |
| `template_id` | text | O | 정규화된 템플릿 ID | `"daily_report"` |
| `channel` | text | O | `'email'` \| `'alimtalk'` | |
| `scheduled_at` | timestamptz | O | 발송 예정 시각 | `2026-04-21T09:00:00Z` |
| `expected_count` | integer | - | 예상 발송 회사 수 | `1200` |
| `reason` | text | - | `'cap'` \| `'weekend'` \| `'holiday'` \| `'scheduled'` | `"scheduled"` |
| `status` | text | O | `'pending'` \| `'sent'` \| `'cancelled'` | `"pending"` |
| `created_at` | timestamptz | - | | |

---

## 3. API 스펙

### 3-1. 이미 구현된 API (CRM 앱 내부)

| 메서드 | 경로 | 용도 | 상태 |
|--------|------|------|------|
| `POST` | `/api/send/test` | 테스트 발송 (알림톡: NHN 실호출, 이메일: stub) | 구현 완료 |
| `GET` | `/api/nhn/email-template?templateId=xxx` | NHN 이메일 템플릿 HTML body 프록시 | 구현 완료 |

### 3-2. 신규 필요 API (백엔드 구현 요청)

#### `GET /api/crm/campaigns`
오늘 기준 캠페인 목록 + 성과 지표.

```json
// Response
{
  "campaigns": [
    {
      "id": "uuid",
      "name": "자금일보",
      "template_id": "daily_report",
      "channel": "alimtalk",
      "send_type": "user_setting",
      "sku_id": "clobe-ai",
      "sent_at": "2026-04-20T09:00:00Z",
      "recipient_count": 4820,
      "open_rate": null,
      "conversion_rate": 0.25,
      "status": "done",
      "created_by": "자동화"
    }
  ]
}
```

#### `GET /api/crm/schedule/today`
오늘 발송 예정 목록 (타임테이블 + 대기 중 탭 데이터 소스).

```json
// Response
{
  "scheduled": [
    {
      "id": "uuid",
      "template_id": "daily_report",
      "display_name": "자금일보",
      "channel": "alimtalk",
      "scheduled_at": "2026-04-21T09:00:00+09:00",
      "expected_count": 4820,
      "reason": "scheduled",
      "status": "pending"
    }
  ]
}
```

#### `GET /api/crm/campaigns/{id}/stats`
단일 캠페인 상세 성과.

```json
// Response
{
  "campaign_id": "uuid",
  "recipient_count": 3840,
  "open_count": 1459,
  "open_rate": 0.38,
  "click_count": 845,
  "conversion_count": 845,
  "conversion_rate": 0.22,
  "bounce_count": 12,
  "unsubscribe_count": 3
}
```

#### `POST /api/crm/campaigns`
CRM에서 수동 발송 시 캠페인 생성.

```json
// Request
{
  "name": "4월 부가세 안내",
  "template_id": null,
  "channel": "email",
  "send_type": "adhoc",
  "sku_id": "clobe-ai",
  "recipient_count": 3840,
  "created_by": "앰버"
}

// Response
{ "id": "uuid", "status": "pending", "created_at": "..." }
```

---

## 4. 지표 계산 정의

### 핵심 지표

| 지표 | 계산식 | 집계 단위 | 채널 | 비고 |
|------|--------|-----------|------|------|
| **발송 수** | COUNT(DISTINCT recipient_id) WHERE status='success' | 회사 | 전체 | 유저 수 아님! |
| **오픈율** | 오픈 회사 수 / 발송 성공 회사 수 | 회사 | 이메일만 | 알림톡은 null |
| **유입률** | 수신 당일 서비스 접속 회사 수 / 수신 회사 수 | 회사 | 전체 | 핵심 전환 지표 |
| **수신 실패율** | status='failed' 회사 수 / 전체 발송 회사 수 | 회사 | 전체 | 임계치 5% |
| **수신 거부율** | 수신거부 처리 회사 수 / 발송 회사 수 | 회사 | 이메일만 | 임계치 0.5% |

### "유입률" 상세 정의

```
유입률 (conversion_rate) =
  (수신 당일 24시간 이내 서비스에 1회 이상 접속한 회사 수)
  ÷
  (해당 캠페인을 수신한 회사 수)
```

- **수신 당일**: `sent_at` 기준 같은 날 (KST 00:00 ~ 23:59)
- **서비스 접속**: 클로브AI 앱 로그인 이벤트 (BigQuery 접속 로그 기준)
- **회사 단위**: 같은 회사의 여러 구성원이 접속해도 1건

### "오픈율" 상세 정의

```
오픈율 (open_rate) =
  (이메일을 1회 이상 오픈한 회사 수)
  ÷
  (이메일 수신 성공 회사 수)
```

- NHN 발송 통계 API 또는 자체 트래킹 픽셀 기준
- 알림톡은 오픈 추적 불가 → 항상 null

---

## 5. 데이터 흐름도

```
[NHN Cloud 알림톡 API]──발송 요청──→ NHN 서버 ──결과 콜백──→ ?
[NHN Cloud 이메일 API]──발송 요청──→ NHN 서버 ──결과 콜백──→ ?

                    ┌─────────────────────────────────────┐
                    │         현재 미결정 구간             │
                    │                                     │
                    │  NHN 발송 결과 → 어디에 적재?       │
                    │  선택지:                             │
                    │  A) NHN 콜백 → 자체 서버 → Supabase │
                    │  B) NHN 통계 API 배치 조회 → BQ     │
                    │  C) NHN 콜백 → BigQuery 직접        │
                    └──────────┬──────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  BigQuery           │
                    │  - raw.send_logs    │
                    │  - raw.open_events  │
                    │  - raw.access_logs  │
                    └──────────┬──────────┘
                               │ dbt transform
                               ▼
                    ┌─────────────────────┐
                    │  BigQuery mart      │
                    │  - crm_campaign_map │ ←── Supabase에서 sync (또는 반대)
                    │  - campaign_stats   │
                    └──────────┬──────────┘
                               │ sync (방향 미정)
                               ▼
                    ┌─────────────────────┐
                    │  Supabase           │
                    │  - campaigns        │ ←── CRM 앱 읽기/쓰기
                    │  - crm_campaign_map │ ←── CRM 앱 읽기/쓰기
                    │  - send_logs        │ ←── CRM 대시보드 읽기
                    │  - scheduled_sends  │ ←── CRM 대시보드 읽기
                    └─────────────────────┘
                               ▲
                               │ API
                    ┌──────────┴──────────┐
                    │  Clobe CRM (Next.js)│
                    │  localhost:3000      │
                    └─────────────────────┘
```

---

## 6. 우선순위

| 순서 | 항목 | 이유 | 완료 기준 |
|------|------|------|-----------|
| **P0** | Supabase에 campaigns + crm_campaign_map 테이블 생성 | DDL 이미 있음. 테이블만 만들면 CRM mock → 실데이터 전환 가능 | CRM `/history` 페이지에 Supabase 데이터 표시 |
| **P1** | NHN 발송 결과 적재 파이프라인 (send_logs) | 오픈율/유입률 집계의 원본 데이터 | 발송 1건 결과가 send_logs에 적재 확인 |
| **P2** | BigQuery 접속 로그 ↔ send_logs 조인 (유입률) | 핵심 전환 지표 | campaigns.conversion_rate에 실 유입률 반영 |
| **P3** | crm_campaign_map ↔ dbt seed 동기화 | CRM에서 편집한 별칭이 BigQuery 대시보드에도 반영 | dbt run 후 BigQuery mart에 최신 display_name 반영 |
| **P4** | scheduled_sends 테이블 + 스케줄러 연동 | 타임테이블/대기 중 탭 실데이터 | CRM 대시보드에 오늘 발송 예정 표시 |

---

## 7. 논의 필요 사항

데이터 엔지니어와 결정해야 할 사항:

1. **NHN 발송 결과 수집 방식**: 콜백(웹훅) vs 배치 조회 vs 실시간 폴링?
2. **BigQuery ↔ Supabase 동기화 방향**: BQ→Supabase? Supabase→BQ? 양방향?
3. **유입률 계산 위치**: BigQuery에서 dbt로 계산 후 Supabase 동기? 또는 Supabase에서 직접?
4. **발송 이력 보존 기간**: send_logs 파티셔닝/TTL 정책
5. **template_id 정규화 규칙 검증**: 현재 JS 규칙과 dbt SQL 규칙이 동일한지 테스트 케이스 맞추기

---

## 부록: 기존 파일 위치

| 파일 | 내용 |
|------|------|
| `supabase/migrations/0001_crm_campaign_map.sql` | crm_campaign_map DDL |
| `supabase/migrations/0002_add_send_type.sql` | send_type 컬럼 추가 |
| `supabase/migrations/0003_add_is_active.sql` | is_active 컬럼 추가 |
| `supabase/migrations/20260415_campaigns.sql` | campaigns DDL |
| `src/lib/template-id.ts` | 정규화 함수 (JS) |
| `src/lib/template-defaults.ts` | 초기 시드 데이터 (66개 항목) |
| `src/lib/campaigns.ts` | Campaign 타입 + mock 시드 15개 |
| `src/lib/nhn.ts` | NHN 알림톡 API 호출 레이어 |
| `src/app/api/send/test/route.ts` | 테스트 발송 API |
| `src/app/api/nhn/email-template/route.ts` | 이메일 HTML 프록시 |
