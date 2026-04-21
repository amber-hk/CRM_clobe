/**
 * Default `crm_campaign_map` rows inferred from NHN template ids, descriptions,
 * and category. Used as a fallback whenever Supabase / localStorage has no
 * user-saved override. User edits from the Templates page always win.
 *
 * Keys are the dbt-normalized template id (same rule as `normalizeTemplateId`).
 */

import type {
  CampaignChannel,
  CampaignMapEntry,
  CampaignSku,
  FunnelStage,
  SendType,
} from "./campaign-map";
import { normalizeTemplateId } from "./template-id";

const EPOCH = "1970-01-01T00:00:00Z";

type Partial = Omit<CampaignMapEntry, "template_id" | "updated_at">;

type ScheduleOpts = {
  frequency?: "once" | "recurring";
  scheduled_time?: string;
  scheduled_days?: "daily" | "weekday" | "weekday_no_fri" | "monday" | "variable";
  send_condition?: string;
  send_target?: string;
  ctr?: number | null;
  ctr_target?: number;
};

function mk(
  display_name: string,
  description: string | null,
  sku: CampaignSku | null,
  send_type: SendType,
  funnel_stage: FunnelStage,
  channel: CampaignChannel = "EMAIL",
  sched?: ScheduleOpts
): Partial {
  return { channel, display_name, description, sku, funnel_stage, send_type, ...sched };
}

/** Inactive stub — leaves classification fields blank, flagged is_active=false. */
function mkInactive(
  display_name: string,
  description: string,
  channel: CampaignChannel = "ALIMTALK"
): Partial {
  return {
    channel,
    display_name,
    description,
    sku: null,
    funnel_stage: null,
    send_type: null,
    is_active: false,
  };
}

/** Tuples of raw id → partial entry; normalized at export time. */
const RAW: Array<[string, Partial]> = [
  // --- email ---
  ["data_connection_d1_test-1_prod",                    mk("워크스페이스 생성 후 연동 넛징 D+1",   "워크스페이스 연동 후 다음날 아침 9시, 데이터 연동이 안 되어있는 유저에게 발송",         "clobe-ai",      "triggered",    "onboarding")],
  ["welcome_company_test-1_prod",                       mk("워크스페이스 생성 환영",              "회사 생성 직후 발송되는 환영 이메일",                                                     "clobe-ai",      "user_ping",    "onboarding")],
  ["user_1_year_expired",                               mk("1년 미활성 유저 삭제 안내",          "가입 후 1년간 워크스페이스 미생성 유저에게 계정 삭제 예정 안내",                         "clobe-ai",      "triggered",    "offboarding")],
  ["clobe_connect_client_vat_review_request",           mk("예상 부가세 검토 요청 (세무대리인 연동)", "세무대리인 연동된 고객이 예상 부가세 검토 요청을 세무대리인에게 발송",                "clobe-connect", "user_ping",    "activation")],
  ["clobe_connect_client_vat_request",                  mk("예상 부가세 검토 요청 (미연동)",      "세무대리인 미연동 고객이 예상 부가세 검토 요청을 세무대리인에게 발송",                   "clobe-connect", "user_ping",    "activation")],
  ["report_monday1_prod",                               mk("자금일보 월요일 주간 요약",           "월요일 전용, 지난주 현금흐름 요약 자금일보",                                              "clobe-ai",      "user_setting", "activation", "EMAIL", { frequency: "recurring", scheduled_time: "8:00", scheduled_days: "monday", send_condition: "매주 월요일", send_target: "자금일보 수신 설정 회사", ctr: null })],
  ["report_keep_error1_prod",                           mk("자금일보 3일 연속 수집 실패 안내 A",  "3일 연속 자금일보 수집 실패 시 3일차에 발송",                                             "clobe-ai",      "triggered",    "retention", "EMAIL", { frequency: "recurring", scheduled_time: "8:00", scheduled_days: "daily", send_condition: "3일 연속 수집 실패", send_target: "자금일보 수신 회사", ctr: null })],
  ["clobe_connect_client_data_request_prod",            mk("데이터 제공 요청 (수임처→세무대리인)", "클로브AI 고객이 세무대리인에게 데이터 제공을 요청할 때 발송",                            "clobe-connect", "user_ping",    "activation")],
  ["clobe_connect_client_tax_info_request_prod",        mk("클로브커넥트 연동 초대 (수임처→세무대리인)", "클로브AI 고객이 세무대리 메뉴를 통해 세무대리인에게 커넥트 연동 요청",                 "clobe-connect", "user_ping",    "onboarding")],
  ["report-offed-notice1_prod",                         mk("자금일보 중단 완료 안내 (11일차)",    "10일 이상 미접속으로 자금일보가 중단되었음을 안내",                                       "clobe-ai",      "triggered",    "offboarding", "EMAIL", { frequency: "once", scheduled_time: "8:00", scheduled_days: "weekday", send_condition: "미접속 11일차", send_target: "자금일보 수신 회사" })],
  ["clobe_connect_in_house_manager_approval_notice",    mk("세무대리 담당자 승인 완료 안내",      "세무대리 관리자 승인 완료 여부를 해당 구성원에게 안내",                                   "clobe-connect", "user_ping",    "onboarding")],
  ["clobe_in_house_manager_approval_request",           mk("세무대리 관리자 권한 요청",          "수임처가 세무대리인에게 사내 세무대리 담당자 승인 요청",                                  "clobe-connect", "user_ping",    "onboarding")],
  ["first_scraping_complete_d1_test2_prod",             mk("최초 수집 완료 D+1 미접속 넛징 B",    "최초 수집 이후 다음 영업일 아침까지 접속 로그 없으면 발송 (B안)",                         "clobe-ai",      "triggered",    "onboarding",  "EMAIL", { frequency: "once", scheduled_time: "10:00", scheduled_days: "weekday_no_fri", send_condition: "최초 수집 D+1 미접속", send_target: "수집 완료 회사" })],
  ["first_scraping_complete_d1_test1_prod",             mk("최초 수집 완료 D+1 미접속 넛징 A",    "최초 수집 이후 다음 영업일 아침까지 접속 로그 없으면 발송 (A안)",                         "clobe-ai",      "triggered",    "onboarding",  "EMAIL", { frequency: "once", scheduled_time: "10:00", scheduled_days: "weekday_no_fri", send_condition: "최초 수집 D+1 미접속", send_target: "수집 완료 회사" })],
  ["clobe_connect_tax_client_invitation_prod",          mk("클로브AI 가입 초대 (세무대리인→수임처)", "세무대리인이 수임처를 클로브AI에 초대",                                                 "clobe-connect", "user_ping",    "onboarding")],
  ["clobe_connect_payroll_notice_prod",                 mk("급여대장 전달 (세무대리인→수임처)",   "세무대리인이 클로브커넥트에서 수임처 담당자에게 급여대장 전송",                           "clobe-connect", "user_ping",    "activation")],
  ["ta-off-notice-2nd_prod",                            mk("세무대리인 수집 중단 안내 2차 (30일)", "세무대리인 30일 미접속, 수임처 데이터 자동 수집 중단 최종 안내",                         "clobe-connect", "triggered",    "offboarding")],
  ["ta-off-notice-1st_prod",                            mk("세무대리인 수집 중단 안내 1차 (15일)", "세무대리인 15일 미접속, 수임처 데이터 자동 수집 중단 예정 안내",                         "clobe-connect", "triggered",    "offboarding")],
  ["clobe_connect_invitation_prod",                     mk("클로브커넥트 초대 (수임처→세무대리인)", "수임처가 세무대리인에게 클로브커넥트 초대 메일 발송",                                   "clobe-connect", "user_ping",    "onboarding")],
  ["scrap-off-notice-4th_prod",                         mk("미접속 수집 중단 안내 4차 (31일)",    "30일 이상 미접속, 데이터 수집 및 분석 중단 안내",                                         "clobe-ai",      "triggered",    "offboarding", "EMAIL", { frequency: "once", scheduled_time: "10:00", scheduled_days: "weekday_no_fri", send_condition: "미접속 31일", send_target: "데이터 수집 중 회사", ctr: 0.029 })],
  ["scrap-off-notice-3rd_prod",                         mk("미접속 수집 중단 안내 3차 (30일)",    "오늘 자정 이후 금융 데이터 수집 종료 예정 최종 안내",                                     "clobe-ai",      "triggered",    "offboarding", "EMAIL", { frequency: "once", scheduled_time: "10:00", scheduled_days: "weekday_no_fri", send_condition: "미접속 30일", send_target: "데이터 수집 중 회사", ctr: 0.029 })],
  ["scrap-off-notice-2nd_prod",                         mk("미접속 수집 중단 안내 2차 (15일)",    "D-몇일 뒤 현금흐름 분석 중단 예정 안내",                                                  "clobe-ai",      "triggered",    "offboarding", "EMAIL", { frequency: "once", scheduled_time: "10:00", scheduled_days: "weekday_no_fri", send_condition: "미접속 15일", send_target: "데이터 수집 중 회사", ctr: 0.029 })],
  ["scrap-off-notice-1st_prod",                         mk("미접속 수집 중단 안내 1차 (7일)",     "7일 이상 미접속, 30일 미접속 시 수집 중단 예정 안내",                                     "clobe-ai",      "triggered",    "retention",   "EMAIL", { frequency: "once", scheduled_time: "10:00", scheduled_days: "weekday_no_fri", send_condition: "미접속 7일", send_target: "데이터 수집 중 회사", ctr: 0.0857 })],
  ["clobe_connect_data_request",                        mk("데이터 연동 요청 (구버전)",          "수임처가 세무대리인에게 데이터 연동 요청 (구버전)",                                       "clobe-connect", "user_ping",    "activation")],
  ["report-off-notice",                                 mk("자금일보 중단 안내 (10일차)",        "10일 이상 미접속으로 자금일보 발송 중단 예정 안내",                                       "clobe-ai",      "triggered",    "retention",   "EMAIL", { frequency: "once", scheduled_time: "15:00", scheduled_days: "weekday_no_fri", send_condition: "미접속 10일", send_target: "자금일보 수신 회사", ctr: 0.32 })],
  ["first_scraping_complete_prod",                      mk("최초 수집 완료 안내",                "최초 연동 후 스크래핑 및 분석 완료 시점에 발송",                                          "clobe-ai",      "user_ping",    "onboarding",  "EMAIL", { frequency: "once", scheduled_time: "변동", scheduled_days: "variable", send_condition: "최초 수집 완료", send_target: "데이터 연동 직후 회사", ctr: 0.7238 })],
  ["clobe_partners_invitation_prod",                    mk("클로브파트너스 초대",                "수임처가 세무대리인에게 클로브파트너스 초대",                                             "clobe-connect", "user_ping",    "onboarding")],
  ["partner_client_clobe_invitation_wtoptax_prod",      mk("클로브AI 가입 초대 (세일택스 전용)",  "세무법인세일택스 수임처 전용 클로브AI 초대 메일",                                         "clobe-connect", "user_ping",    "onboarding")],
  ["recommendation_event_promotion_prod",               mk("지인 추천 이벤트 프로모션",          "지인 추천 이벤트 홍보 이메일 (20만원 적립)",                                              "clobe-ai",      "triggered",    "activation",  "EMAIL", { frequency: "once", scheduled_time: "9:00", scheduled_days: "weekday", send_condition: "가입 후 조건 충족", send_target: "활성 회사" })],
  ["partner_client_clobe_invitation_prod",              mk("클로브AI 가입 초대 (파트너 수임처)",  "세무대리인이 수임처를 클로브AI에 초대",                                                   "clobe-connect", "user_ping",    "onboarding")],
  ["partner_invitation_prod",                           mk("파트너사 어드민 가입 알림",          "파트너사 고객 가입 시 파트너사 어드민에게 알림",                                          "clobe-ai",      "user_ping",    "onboarding")],
  ["tax_agent_agreement_prod",                          mk("수임 동의 요청",                     "세무대리인이 고객에게 수임 동의 요청 발송",                                               "clobe-connect", "user_ping",    "onboarding")],
  ["scraping_fatal_prod",                               mk("데이터 수집 FATAL 오류 안내",        "은행/홈택스 공동인증서 스크래핑 FATAL 오류 시 모든 구성원에게 발송",                      "clobe-ai",      "triggered",    "retention")],
  ["init_company_created_d2_prod",                      mk("가입 환영 (D+2)",                    "회사 생성 D+2 영업일에 모든 구성원에게 발송하는 환영 이메일",                             "clobe-ai",      "triggered",    "onboarding")],
  ["init_company_created_d5_prod",                      mk("이용 도움 안내 (D+5)",               "회사 생성 D+5 영업일에 이용 도움 필요 여부 안내",                                         "clobe-ai",      "triggered",    "onboarding")],
  ["crm_data_connection_01_prod",                       mk("데이터 연동 넛징 1차",               "회사 데이터 연동 유도 넛징 1회차",                                                        "clobe-ai",      "triggered",    "onboarding")],
  ["crm_data_connection_02_prod",                       mk("데이터 연동 넛징 2차",               "데이터 연동 유도 넛징 2회차 (자금일보 예시)",                                             "clobe-ai",      "triggered",    "onboarding")],
  ["crm_data_connection_03_prod",                       mk("데이터 연동 넛징 3차 (PM 편지)",      "데이터 연동 넛징 3회차, PM 직접 작성 형식",                                                "clobe-ai",      "triggered",    "onboarding")],
  ["magic_link_prod",                                   mk("PC 로그인 링크",                     "모바일로 회사 생성 후 PC에서 비밀번호 없이 로그인 가능한 링크 전송",                      "clobe-ai",      "user_ping",    "onboarding")],
  ["daily_report_prod",                                 mk("자금일보",                           "매일 아침 발송되는 자금일보",                                                             "clobe-ai",      "user_setting", "activation",  "EMAIL", { frequency: "recurring", scheduled_time: "8:00", scheduled_days: "daily", send_condition: "매일 아침", send_target: "자금일보 수신 설정 회사", ctr: 0.017 })],
  ["daily_report_notrx_1_prod",                         mk("자금일보 (거래 없음)",                "어제 거래내역이 없을 때 발송하는 자금일보",                                               "clobe-ai",      "user_setting", "activation",  "EMAIL", { frequency: "recurring", scheduled_time: "8:00", scheduled_days: "daily", send_condition: "매일 아침, 거래 없음", send_target: "자금일보 수신 설정 회사", ctr: null })],
  ["daily_report_error_1_prod",                         mk("자금일보 수집 오류",                  "자금일보 잔액 0원 또는 수집 오류 시 발송",                                                "clobe-ai",      "triggered",    "retention",   "EMAIL", { frequency: "recurring", scheduled_time: "8:00", scheduled_days: "daily", send_condition: "수집 오류 발생", send_target: "자금일보 수신 회사", ctr: null })],
  ["daily_report_scrape_fail_1_prod",                   mk("자금일보 수집 실패",                  "수집 실패 혹은 일부 실패 상태일 때 발송",                                                 "clobe-ai",      "triggered",    "retention",   "EMAIL", { frequency: "recurring", scheduled_time: "8:00", scheduled_days: "daily", send_condition: "수집 실패", send_target: "자금일보 수신 회사", ctr: null })],
  ["daily_report_promotion_prod",                       mk("자금일보 프로모션",                   "자금일보 프로모션 - 내일도 받고 싶으면 클릭",                                             "clobe-ai",      "triggered",    "activation")],
  ["invitation_prod",                                   mk("워크스페이스 구성원 초대",            "관리자가 구성원을 초대하면 초대받은 사람에게 발송",                                       "clobe-ai",      "user_ping",    "onboarding")],
  ["email_verification_prod",                           mk("이메일 인증번호",                     "회원가입, 비밀번호 재설정 등 이메일 인증번호 검증 과정에 발송",                           "clobe-ai",      "user_ping",    "onboarding")],
  ["update_agreement",                                  mk("이용약관 개정 공지",                 "서비스 이용약관 및 개인정보 처리방침 개정 공지",                                          "clobe-ai",      "triggered",    "activation")],
  ["tax_invoice_issuance_failure_prod",                 mk("세금계산서 발급 실패 알림",           "바로빌 세금계산서 발급 실패 시 발송",                                                     "clobe-ai",      "triggered",    "activation")],
  ["barobill_member_added_prod",                        mk("바로빌 연동 완료",                   "바로빌 회원사 추가 완료 시 발송",                                                         "clobe-ai",      "user_ping",    "onboarding")],
  ["rover_sign_in_verification_prod",                   mk("Rover 2FA 인증코드",                 "Rover 내부 툴 2FA 이메일 인증코드",                                                       "clobe-ai",      "user_ping",    "activation")],
  ["SHARE_CASH_INFO_WITH_EMAIL_PROD",                   mk("현금정보 이메일 공유",               "자금현황 데이터를 이메일로 공유",                                                         "clobe-ai",      "user_ping",    "activation")],
  ["TERM_OFFER_CRM_PROD",                               mk("신규 대출 한도 알림 (CRM)",          "고객에게 신규 대출 한도 발생 안내",                                                       "clobe-finance", "triggered",    "finance")],
  ["batch_payout_update_prod",                          mk("성장자금 한도 업데이트",             "성장자금 한도가 발생한 경우 고객에게 알림",                                               "clobe-finance", "triggered",    "finance")],
  ["PAYOUT_PROD",                                       mk("성장자금 지급 완료",                 "성장자금이 지급되었을 때 발송",                                                           "clobe-finance", "user_ping",    "finance")],
  ["REPURCHASE_PROD",                                   mk("환매 예정 안내",                     "환매가 진행될 예정일 때 발송",                                                            "clobe-finance", "triggered",    "finance")],
  ["REPAYMENT_D-DAY_PROD",                              mk("회수일 당일 안내",                   "오늘이 회수일임을 안내",                                                                  "clobe-finance", "triggered",    "finance")],
  ["REPAYMENT_D-3_PROD",                                mk("회수일 D-3 안내",                    "회수일 3일 전 안내",                                                                      "clobe-finance", "triggered",    "finance")],
  ["CERTIFICATE_EXPIRED_D-N_PROD",                      mk("인증서 만료 D-N 안내",               "인증서 만료 N일 전 안내",                                                                 "clobe-finance", "triggered",    "finance",     "EMAIL", { frequency: "once", scheduled_time: "9:00", scheduled_days: "daily", send_condition: "인증서 만료 예정", send_target: "클로브금융 이용 회사" })],
  ["CERTIFICATE_EXPIRED_PROD",                          mk("인증서 사용불가 안내",               "인증서가 사용불가 상태일 때 발송",                                                        "clobe-finance", "triggered",    "finance",     "EMAIL", { frequency: "once", scheduled_time: "9:00", scheduled_days: "daily", send_condition: "인증서 만료됨", send_target: "클로브금융 이용 회사" })],
  ["TERM_OFFER_APPROVE_PROD",                           mk("판매조건 수락 안내",                 "판매조건 요청이 수락되었을 때 발송",                                                      "clobe-finance", "user_ping",    "finance")],
  ["TERM_OFFER_REJECT_NO_REVENUE_PROD",                 mk("판매조건 거절 (매출 없음)",           null,                                                                                      "clobe-finance", "user_ping",    "finance")],
  ["TERM_OFFER_REJECT_UC_FAIL_PROD",                    mk("판매조건 거절 (UC 실패)",             null,                                                                                      "clobe-finance", "user_ping",    "finance")],
  ["TERM_OFFER_REJECT_MINIMUM_TERM_PROD",               mk("판매조건 거절 (최소 이용 조건)",       null,                                                                                      "clobe-finance", "user_ping",    "finance")],
  ["REVENUE_REPLACEMENT_PROD",                          mk("매출채권 교체 안내",                 "판매한 매출채권이 교체되었을 때 발송",                                                    "clobe-finance", "triggered",    "finance")],

  // --- alimtalk (active) ---
  ["payroll_notice",                                    mk("급여대장 전달",                       "세무대리인이 수임처 담당자에게 급여대장 전달",                                            "clobe-connect", "user_ping",    "activation", "ALIMTALK")],
  ["payroll_notice_0224",                               mk("급여대장 전달 + 클로브AI 안내",        "급여대장 전달 및 클로브AI 조회 안내 포함 버전",                                           "clobe-connect", "user_ping",    "activation", "ALIMTALK")],
  ["report-scrape-fail-1",                              mk("자금일보 수집 실패 안내 A",           "자금일보 수집 실패 안내 (A안)",                                                           "clobe-ai",      "triggered",    "retention",  "ALIMTALK")],
  ["report-scrape-fail-2",                              mk("자금일보 수집 실패 안내 B",           "자금일보 수집 실패 안내 (B안)",                                                           "clobe-ai",      "triggered",    "retention",  "ALIMTALK")],
  ["report_keep_error2",                                mk("자금일보 3일 연속 수집 실패 안내 B",  "3일 연속 자금일보 수집 실패 안내 (B안)",                                                   "clobe-ai",      "triggered",    "retention",  "ALIMTALK")],
  ["report_aft_error1",                                 mk("자금일보 오류 후 정상화 안내",        "자금일보 수집 오류 발생 후 정상화되었음을 안내",                                          "clobe-ai",      "triggered",    "retention",  "ALIMTALK")],
  ["report_n5d-1",                                      mk("자금일보 (회사 5일 미접속)",          "회사 5일 미접속 상태에서 발송되는 자금일보",                                              "clobe-ai",      "user_setting", "retention",  "ALIMTALK")],
  ["report_n7d-1",                                      mk("자금일보 (회사 7일 미접속)",          "회사 7일 미접속 상태에서 발송되는 자금일보",                                              "clobe-ai",      "user_setting", "retention",  "ALIMTALK")],
  ["off-notice-1st-t2",                                 mk("미접속 수집 중단 안내 1차 A",         "미접속 수집 중단 1차 (A안)",                                                              "clobe-ai",      "triggered",    "retention",  "ALIMTALK")],
  ["off-notice-1st-t3",                                 mk("미접속 수집 중단 안내 1차 B",         "미접속 수집 중단 1차 (B안)",                                                              "clobe-ai",      "triggered",    "retention",  "ALIMTALK")],
  ["off-notice-2nd-t2",                                 mk("미접속 수집 중단 안내 2차 A",         "미접속 수집 중단 2차 (A안)",                                                              "clobe-ai",      "triggered",    "offboarding","ALIMTALK")],
  ["off-notice-2nd-t3",                                 mk("미접속 수집 중단 안내 2차 B",         "미접속 수집 중단 2차 (B안)",                                                              "clobe-ai",      "triggered",    "offboarding","ALIMTALK")],
  ["off-notice-3rd-t2",                                 mk("미접속 수집 중단 안내 3차 A",         "미접속 수집 중단 3차 (A안)",                                                              "clobe-ai",      "triggered",    "offboarding","ALIMTALK")],
  ["off-notice-3rd-t3",                                 mk("미접속 수집 중단 안내 3차 B",         "미접속 수집 중단 3차 (B안)",                                                              "clobe-ai",      "triggered",    "offboarding","ALIMTALK")],
  ["off-notice-4th-t2",                                 mk("미접속 수집 중단 안내 4차 A",         "미접속 수집 중단 4차 (A안)",                                                              "clobe-ai",      "triggered",    "offboarding","ALIMTALK")],
  ["off-notice-4th-t3",                                 mk("미접속 수집 중단 안내 4차 B",         "미접속 수집 중단 4차 (B안)",                                                              "clobe-ai",      "triggered",    "offboarding","ALIMTALK")],
  ["first_scraping_alim6",                              mk("최초 수집 완료 안내 (실험 6)",        "최초 수집 완료 안내 실험 변형 6",                                                         "clobe-ai",      "user_ping",    "onboarding", "ALIMTALK")],
  ["first_scraping_alim7",                              mk("최초 수집 완료 안내 (실험 7)",        "최초 수집 완료 안내 실험 변형 7",                                                         "clobe-ai",      "user_ping",    "onboarding", "ALIMTALK")],
  ["first_scraping_alim8",                              mk("최초 수집 완료 안내 (실험 8)",        "최초 수집 완료 안내 실험 변형 8 (현재 사용)",                                              "clobe-ai",      "user_ping",    "onboarding", "ALIMTALK")],
  ["first_scraping_alim9",                              mk("최초 수집 완료 안내 (실험 9)",        "최초 수집 완료 안내 실험 변형 9",                                                         "clobe-ai",      "user_ping",    "onboarding", "ALIMTALK")],
  ["data_connection_01",                                mk("데이터 연동 안내 A",                  "데이터 연동 유도 알림 (A안)",                                                             "clobe-ai",      "triggered",    "onboarding", "ALIMTALK")],
  ["data_connection_02",                                mk("데이터 연동 안내 B",                  "데이터 연동 유도 알림 (B안)",                                                             "clobe-ai",      "triggered",    "onboarding", "ALIMTALK")],
  ["first_fail",                                        mk("초기 분석 실패 안내",                 "최초 연동 후 분석 실패 시 발송",                                                           "clobe-ai",      "triggered",    "onboarding", "ALIMTALK")],
  ["ta_off-notice-1st",                                 mk("세무대리인 수집 중단 안내 1차 (15일)", "세무대리인 15일 미접속, 수집 중단 예정 안내",                                             "clobe-connect", "triggered",    "offboarding","ALIMTALK")],
  ["ta_off-notice-2nd",                                 mk("세무대리인 수집 중단 안내 2차 (30일)", "세무대리인 30일 미접속, 수집 중단 안내",                                                  "clobe-connect", "triggered",    "offboarding","ALIMTALK")],

  // --- alimtalk (비활성) · 코드에 정의만 있고 발송 기록 없음 ---
  ["first_scraping_alim",                               mkInactive("최초 수집 완료 안내",                  "현재 first_scraping_alim8로 대체됨")],
  ["first_success",                                     mkInactive("초기 설정 완료",                       "코드에만 정의됨, 발송 기록 없음")],
  ["limit_update",                                      mkInactive("클로브 금융 신규 한도 안내",            "코드에만 정의됨, 발송 기록 없음")],

  // --- alimtalk (출처 미확인) · NHN/DB/코드 어디에도 없음 ---
  ["com_new_thread",                                    mkInactive("새 스레드 확인 요청",                  "출처 미확인: NHN/DB/코드 어디에도 확인되지 않음")],
  ["com_reply_thread",                                  mkInactive("스레드 답변 알림",                     "출처 미확인: NHN/DB/코드 어디에도 확인되지 않음")],
  ["first_scraping",                                    mkInactive("first_scraping",                       "출처 미확인: NHN/DB/코드 어디에도 확인되지 않음")],
  ["tax_client_none_yet",                               mkInactive("세무대리인 미연동 안내",               "출처 미확인: NHN/DB/코드 어디에도 확인되지 않음")],
  ["user_signup_welcome",                               mkInactive("클로브 가입 환영",                     "출처 미확인: NHN/DB/코드 어디에도 확인되지 않음")],
  ["workspace_created",                                 mkInactive("워크스페이스 생성 완료",               "출처 미확인: NHN/DB/코드 어디에도 확인되지 않음")],
  ["tax_info_reque_0226",                               mkInactive("세무 데이터 연동 요청",                "코드엔 있으나 발송 기록 없음")],
];

export const TEMPLATE_META: Record<string, CampaignMapEntry> = Object.fromEntries(
  RAW.map(([rawId, partial]) => {
    const key = normalizeTemplateId(rawId);
    return [key, { ...partial, template_id: key, updated_at: EPOCH }];
  })
);
