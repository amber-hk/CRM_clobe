# CRM 화면별 데이터 소스 맵

> 각 페이지가 어떤 데이터를 어디서 가져오는지 정리.
> **현재 상태**: mock 데이터. 실데이터 전환 시 변경 포인트 표시.

---

## 1. 대시보드 (`/`)

| UI 영역 | 현재 소스 | 실데이터 소스 | 비고 |
|---------|-----------|--------------|------|
| 지표 카드 (총 발송 / 오픈율 / 유입률) | `dashDataByPeriod` 하드코딩 | `campaigns` 테이블 집계 | 기간·채널·스큐 필터 연동 |
| 추적 미수집 카드 | 하드코딩 `3건` | `send_logs` WHERE opened_at IS NULL 집계 | |
| 스큐 필터 칩 | 프론트 state | 프론트 state (변경 없음) | |
| 타임테이블 | `ttSchedules` 하드코딩 | `scheduled_sends` 테이블 | 주간 발송 예정 |
| 일별 발송량 차트 | `trendDaily` 90일 시드 생성 | `campaigns` 일별 GROUP BY | |
| 캠페인 성과 차트 Top 10 | `campaigns.ts` mock 시드 | `campaigns` 테이블 | |
| 오픈율 추이 | mock 시드 기반 라인 | `send_logs` 일별 오픈율 집계 | 이메일만 |
| 유입률 추이 | mock 시드 기반 라인 | BigQuery 접속 로그 ↔ `send_logs` 조인 | |
| 캠페인 비교 테이블 | `campaigns.ts` mock | `campaigns` 테이블 | 정렬 가능 |
| 캠페인 검색 | `getCampaigns()` localStorage | `campaigns` Supabase 조회 | |

---

## 2. 발송하기 (`/send`)

| UI 영역 | 현재 소스 | 실데이터 소스 | 비고 |
|---------|-----------|--------------|------|
| Step 1: 캠페인 이름 | 유저 입력 | 유저 입력 (변경 없음) | |
| Step 1: 스큐 선택 | `email-layouts.ts` localStorage | `email-layouts.ts` (변경 없음) | |
| Step 2: 이메일 템플릿 목록 | `mockEmailTemplates` (NHN API 기반 155개) | NHN 이메일 API 실시간 or 캐시 | `_dev`/`_prod` 필터, `isLayout` 제외 |
| Step 2: 알림톡 템플릿 목록 | `mockNhnTemplates` (NHN API 기반 46개) | `fetchTemplates()` NHN 실호출 | 키 있으면 자동 전환 |
| Step 2: 템플릿 본문 (이메일) | `/api/nhn/email-template` 프록시 | 동일 (변경 없음) | NHN_EMAIL_APPKEY 필요 |
| Step 2: 변수 파싱 | `parseAlimVars()` / `parseEmailVars()` | 동일 (변경 없음) | `#{}`알림톡, `${}`이메일 |
| Step 2: 이메일 미리보기 | `textToHtml()` + `applyEmailVars()` | 동일 (변경 없음) | |
| Step 2: 알림톡 미리보기 | `AlimPreview` 컴포넌트 | 동일 (변경 없음) | |
| Step 3: CSV 파싱 | `csv.ts` 프론트 파싱 | 동일 (변경 없음) | |
| Step 3: 테스트 발송 | `/api/send/test` → NHN 알림톡 실호출 or stub | 동일 + 이메일 NHN 연동 추가 | |
| Step 3: 발송 요청 → 캠페인 생성 | `createCampaign()` localStorage | `createCampaign()` Supabase | |
| displayName 표시 | `getTemplateDisplayName()` localStorage | Supabase `crm_campaign_map` | |
| 비활성 필터 | `isTemplateActive()` localStorage | Supabase `crm_campaign_map.is_active` | |

---

## 3. 발송이력 (`/history`)

| UI 영역 | 현재 소스 | 실데이터 소스 | 비고 |
|---------|-----------|--------------|------|
| 완료 탭 테이블 | `getCampaigns()` localStorage mock 15건 | `campaigns` Supabase | |
| 대기 중 탭 | `mockPendingSends` ← `ttSchedules` plan 항목 | `scheduled_sends` 테이블 | |
| 날짜 필터 | `sent_at` / `sentAtIso` 문자열 비교 | `campaigns.sent_at` 범위 쿼리 | |
| 스큐 필터 | `sku_id` 프론트 필터 | 동일 | |
| 캠페인명 표시 | `TemplateName` 컴포넌트 | 동일 (Supabase 전환 시 자동) | |
| sendType 뱃지 | `SEND_TYPE_STYLE` 상수 | 동일 (변경 없음) | |
| 취소 버튼 (대기 중) | 프론트 state에서 제거 | `scheduled_sends` DELETE/UPDATE | |

---

## 4. 자동화 현황 (`/automation`)

| UI 영역 | 현재 소스 | 실데이터 소스 | 비고 |
|---------|-----------|--------------|------|
| 알림톡 자동화 목록 | `listAutomations()` → mock 46개 | `fetchTemplates()` NHN 실호출 + `loadCrmMetadata()` Supabase | |
| 이메일 자동화 목록 | `mockEmailTemplates` 필터 | NHN 이메일 API or Supabase 캐시 | |
| sendType 그룹핑 | `loadCampaignMap()` localStorage | Supabase `crm_campaign_map.send_type` | |
| 비활성 필터 | `campaignMap[key].is_active` | Supabase | |
| 사이드 패널 NHN 읽기전용 | `AutomationItem` 필드 | 동일 | |
| 사이드 패널 CRM 편집 | 프론트 state (저장 안 됨) | Supabase `crm_campaign_map` upsert | |
| 토글 ON/OFF | 프론트 state | 추후 `crm_campaign_map.is_active` 연동 | |

---

## 5. 템플릿 관리 (`/templates`)

| UI 영역 | 현재 소스 | 실데이터 소스 | 비고 |
|---------|-----------|--------------|------|
| 이메일 템플릿 목록 | `mockEmailTemplates` 155개 | NHN 이메일 API | Rover/Z.Deprecated 필터 |
| 알림톡 템플릿 목록 | `adaptTemplates(fetchTemplates())` 46개 | NHN 알림톡 API 실호출 | 키 있으면 자동 |
| displayName / sku / sendType / funnel | `loadCampaignMap()` = TEMPLATE_META + localStorage | Supabase `crm_campaign_map` | |
| 미정의 카운트 | `missingFields()` 프론트 계산 | 동일 (Supabase 전환 시 데이터만 변경) | |
| 비활성 토글 | `toggleActive()` → localStorage | Supabase upsert | |
| 저장 | `upsertCampaignMap()` localStorage | Supabase upsert | |
| 이메일 HTML 보기 | `/api/nhn/email-template?templateId=xxx` | 동일 (변경 없음) | |
| 알림톡 미리보기 | `AlimPreview` 컴포넌트 | 동일 (변경 없음) | |
| 카드 선택 스타일 | 인라인 style (Tailwind purge 우회) | 동일 (변경 없음) | |
| 방향키 네비게이션 | `window.keydown` 리스너 | 동일 (변경 없음) | |

---

## 6. 워닝 (`/warnings`)

| UI 영역 | 현재 소스 | 실데이터 소스 | 비고 |
|---------|-----------|--------------|------|
| CTR 미달 자동화 테이블 | `mockCtrWarnings` 하드코딩 8건 | `send_logs` CTR 집계 + 기준 threshold | |
| 기준 CTR 입력 | 프론트 state (기본 10%) | 프론트 state or 설정 테이블 | |
| OFF 요청 모달 | 프론트 state 변경 | `crm_campaign_map.is_active = false` + 슬랙 알림? | |
| 추적 미수집 카드 | `mockTrackingWarnings` 하드코딩 3건 | `send_logs` WHERE opened_at IS NULL AND channel='email' | |
| 휴면 템플릿 카드 | `mockDormantTemplates` 하드코딩 4건 | `send_logs` 7일 집계 AVG < 3건/일 | |
| 총 워닝 뱃지 | 3개 섹션 합산 | 동일 로직, 실데이터 | 사이드바에도 표시 |

---

## 7. 설정 (`/settings`)

| UI 영역 | 현재 소스 | 실데이터 소스 | 비고 |
|---------|-----------|--------------|------|
| Daily Cap 값 | 프론트 state (기본 3) | Supabase 설정 테이블 (미정의) | |
| 주말 발송 금지 토글 | 프론트 state | Supabase 설정 테이블 | |
| 공휴일 발송 금지 토글 | 프론트 state | Supabase 설정 테이블 | |
| 공휴일 목록 | `mockHolidays2026` 하드코딩 15일 | Supabase `holidays` 테이블 (미정의) | |
| 정책 요약 박스 | 프론트 state 기반 렌더 | 동일 (변경 없음) | |
| 이메일 레이아웃 관리 | `loadLayouts()` localStorage | localStorage 유지 or Supabase | |

---

## 공통 컴포넌트 데이터 소스

| 컴포넌트 | 현재 소스 | 비고 |
|----------|-----------|------|
| `TemplateName` | `getTemplateMeta()` → localStorage → `TEMPLATE_META` 폴백 | 전역 사용 |
| `ChannelBadge` | props (변환 없음) | |
| `SkuTag` | `skuMeta` 상수 | |
| `SendTypeBadge` | `SEND_TYPE_STYLE` 상수 | |
| `DateRangePicker` | `react-day-picker` (프론트 only) | |
| `Sidebar` 워닝 뱃지 | `mockCtrWarnings` + `mockTrackingWarnings` + `mockDormantTemplates` 합산 | 실데이터 시 API 호출 필요 |

---

## 실데이터 전환 우선순위

```
Phase 1: Supabase 테이블 생성 (DDL 있음)
  campaigns + crm_campaign_map → /history, /templates 실데이터 전환
  .env.local에 Supabase 키만 넣으면 자동 전환

Phase 2: NHN 발송 결과 적재
  send_logs 테이블 + NHN 콜백/배치 → /warnings 실데이터 전환
  대시보드 지표 카드 실데이터 전환

Phase 3: BigQuery 연동
  접속 로그 조인 → 유입률 실계산
  dbt crm_campaign_map 동기화

Phase 4: 스케줄러
  scheduled_sends 테이블 → 타임테이블 + 대기 중 탭 실데이터
  설정 테이블 (daily cap, 공휴일) → /settings 영속화
```
