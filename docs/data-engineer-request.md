# CRM 실데이터 연동 요청

> 마케팅팀 → 데이터 엔지니어
>
> CRM 프론트는 70% 정도 구현 완료, 실데이터 연동 필요

---

## 현재 상황

- CRM은 Next.js로 만들어진 내부 마케팅 툴
- 지금은 mock 데이터로 동작 중이고, 실제 발송 데이터와 연결이 필요
- BigQuery에 이미 있는 데이터를 최대한 활용

---

## CRM에서 보여주고 싶은 화면들

| 화면 | 필요한 데이터 |
|------|--------------|
| 대시보드 타임테이블 | 오늘 발송 예정 목록 (템플릿명, 채널, 예정 시각) |
| 발송이력 | 과거 발송 목록 (캠페인명, 채널, 발송 회사 수, 오픈율, 유입률, 상태) |
| 대시보드 성과 차트 | 캠페인별 발송 수 / 오픈율 / 유입률 추이 |
| 워닝 | 수신 실패율 급등, 발송 중단된 템플릿 |

---

## 지표 정의 (집계 단위: 회사, 유저 아님)

| 지표 | 계산 | 비고 |
|------|------|------|
| **발송 수** | 발송 성공한 회사 수 | 같은 회사 여러 구성원 = 1건 |
| **오픈율** | 오픈 회사 수 ÷ 발송 회사 수 | 이메일만. 알림톡은 집계 안 함 |
| **유입률** | 메일 수신 당일 서비스 접속한 회사 수 ÷ 수신 회사 수 | 이메일 + 알림톡 |

---

## 요청 1: 기존 BigQuery 테이블 확장

`mart.crm_campaign_map` 테이블이 이미 있는 걸 확인했습니다 (95행).

이 테이블에 아래 컬럼을 추가해주실 수 있을까요?

| 컬럼 | 타입 | 값 예시 | 용도 |
|------|------|---------|------|
| `sku` | text | `clobe-ai`, `clobe-finance`, `clobe-connect` | 제품별 필터 |
| `send_type` | text | `triggered`, `user_setting`, `user_ping` | 자동화 유형 구분 |
| `funnel_stage` | text | `onboarding`, `activation`, `retention`, `offboarding`, `finance` | 퍼널 단계 |
| `is_active` | boolean | `true` / `false` | 비활성 템플릿 숨김 처리 |

CRM 쪽에서 이미 66개 템플릿에 대한 분류 데이터를 만들어뒀습니다.
이 데이터를 dbt seed 파일이나 BigQuery 직접 INSERT로 넣을 수 있게 CSV로 드릴 수 있어요.

**send_type 정의**:
- `triggered`: 조건 만족 시 자동 발송 (미접속 N일, 수집 오류 등)
- `user_setting`: 유저가 수신 설정해둔 것 (자금일보, 한도 업데이트 등)
- `user_ping`: 유저 액션 직후 즉시 발송 (가입 환영, 스레드 알림 등)

---

## 요청 2: 발송 이력 데이터

CRM 발송이력 화면에 아래 데이터가 필요합니다.

**이미 있는 데이터인지 확인 부탁**:
- NHN 이메일/알림톡 발송 로그가 BigQuery에 적재되고 있는지?
- 적재되고 있다면 테이블명과 컬럼 구조가 어떻게 되는지?

**필요한 필드**:

| 필드 | 설명 |
|------|------|
| 발송 일시 | NHN 발송 시점 |
| 템플릿 ID | NHN templateCode 또는 templateId |
| 채널 | email / alimtalk |
| 수신 회사 ID | 어떤 회사에 보냈는지 |
| 발송 결과 | 성공 / 실패 |
| 오픈 여부 | 이메일만, 오픈 시각 |

이 데이터가 있으면 아래처럼 집계해서 CRM에 보여줄 수 있어요:
```sql
-- 캠페인별 성과 (CRM 대시보드용)
SELECT
  template_id,
  cm.display_name,
  COUNT(DISTINCT company_id) AS recipient_count,
  COUNT(DISTINCT CASE WHEN opened THEN company_id END)
    / NULLIF(COUNT(DISTINCT company_id), 0) AS open_rate
FROM send_logs sl
JOIN mart.crm_campaign_map cm ON cm.template_id = sl.normalized_template_id
WHERE sl.sent_at >= CURRENT_DATE - 30
GROUP BY 1, 2
```

---

## 요청 3: 유입률 계산용 데이터

유입률은 CRM의 핵심 지표인데, 계산하려면 두 데이터의 조인이 필요합니다:

```
유입률 = (메일 받은 날 서비스에 접속한 회사 수) ÷ (메일 받은 회사 수)
```

**필요한 것**:
1. 발송 로그: 어떤 회사에 언제 보냈는지 (`send_logs`)
2. 접속 로그: 어떤 회사가 언제 서비스에 접속했는지

**확인 부탁**:
- 회사별 접속 로그가 BigQuery에 있는지? (테이블명?)
- 있다면 `company_id` + `accessed_at` 같은 필드가 있는지?
- dbt 모델로 조인해서 `campaign_conversion_rate` 같은 mart 테이블 만들어줄 수 있는지?

---

## 요청 4: 발송 스케줄 데이터

대시보드 타임테이블에 "오늘 예정된 발송"을 보여주고 싶습니다.

**확인 부탁**:
- 크론잡이나 스케줄러에서 관리하는 발송 스케줄 데이터가 있는지?
- 있다면 어디서 조회할 수 있는지? (DB? API? 설정 파일?)
- 없다면 `scheduled_sends` 테이블을 새로 만들어야 하는데, 어디에 만드는 게 좋을지?

---

## 데이터 동기화 방향

```
BigQuery (mart.crm_campaign_map)
    ↕ 동기화 (방향 미정)
Supabase (crm_campaign_map)
    ↕
CRM 앱 (읽기/쓰기)
```

**논의 필요**:
- CRM에서 편집한 display_name/sku/send_type을 BigQuery에 반영하는 방향?
  - A) CRM → Supabase → BigQuery (CRM이 원본)
  - B) BigQuery → Supabase (dbt가 원본, CRM은 읽기 전용)
  - C) 양방향 (충돌 해결 규칙 필요)

현재 CRM에서는 `normalizeTemplateId()` 함수로 템플릿 ID를 정규화하고 있어요.
정규화 규칙이 dbt 쪽과 동일한지 같이 확인하면 좋겠습니다:
```
REGEXP_REPLACE(LOWER(template_id), r'(_\d)?_(prod|dev)$|_\d$', '')
```

---

## 참고 자료

CRM 프로젝트 안에 상세 문서가 있습니다:

| 문서 | 내용 |
|------|------|
| `docs/data-requirements.md` | ERD, 테이블 DDL, API 스펙, 지표 계산 정의 |
| `docs/data-source-map.md` | 화면별 데이터 소스 맵 (현재 mock → 실데이터 전환 포인트) |
| `docs/action-requirements.md` | 실발송/모니터링을 위한 백엔드 연동 요건 |
| `supabase/migrations/` | Supabase 테이블 DDL (4개 파일) |
| `src/lib/template-defaults.ts` | 66개 템플릿 분류 데이터 (dbt seed로 전환 가능) |

---

## 우선순위 제안

| 순서 | 할 일 | 이유 |
|------|------|------|
| **1** | `crm_campaign_map`에 sku/send_type/funnel_stage/is_active 컬럼 추가 | CRM 분류 체계 적용. DDL 있음, 바로 가능 |
| **2** | NHN 발송 로그가 BQ에 있는지 확인 + 구조 공유 | 있으면 발송이력 바로 연동 가능 |
| **3** | 발송 로그 → 캠페인 성과 집계 mart 테이블 | 대시보드 차트 실데이터 |
| **4** | 접속 로그 조인 → 유입률 계산 | 핵심 전환 지표 |
| **5** | 동기화 방향 결정 + 파이프라인 | CRM ↔ BigQuery 연결 |

1번은 바로 할 수 있고, 2번은 확인만 해주시면 다음 단계 진행할 수 있어요.
편한 시간에 같이 15분 정도 얘기할 수 있을까요?
