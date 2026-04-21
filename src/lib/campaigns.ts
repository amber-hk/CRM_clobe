/**
 * Campaigns storage layer. Supabase when configured, in-memory + localStorage
 * mock otherwise. One row per executed send.
 */

"use client";

import { createClient } from "@/lib/supabase/client";
import type { SendType } from "./campaign-map";

export type CampaignChannel = "email" | "alimtalk";
export type CampaignStatus = "pending" | "sending" | "done" | "failed";
export type CampaignSendType = SendType | "adhoc";
export type CampaignSkuId = "clobe-ai" | "clobe-finance" | "clobe-connect";

export type BounceBreakdown = {
  hard: number;
  soft: number;
  spam: number;
};

export type Campaign = {
  id: string;
  name: string;
  template_id: string | null;
  channel: CampaignChannel;
  send_type: CampaignSendType;
  sku_id: CampaignSkuId | null;
  sent_at: string | null;
  /** 발송 요청 수 (회사 수) */
  recipient_count: number;
  /** 발송 성공 수 */
  delivered_count: number;
  /** 수신 성공 수 (메일함/카카오에 도달) */
  received_count: number;
  /** 이메일만: bounce 상세. 알림톡은 null */
  bounce: BounceBreakdown | null;
  open_rate: number | null;
  conversion_rate: number | null;
  status: CampaignStatus;
  created_at: string;
  created_by: string | null;
};

const TABLE = "campaigns";
const LOCAL_KEY = "crm_campaigns_mock";

const supabaseConfigured =
  typeof process !== "undefined" &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ---------------- Mock seed ----------------

const FIXTURE_SEED: Omit<Campaign, "id" | "created_at">[] = [
  // --- email (with bounce breakdown) ---
  { name: "4월 부가세 안내",                 template_id: null,                 channel: "email",    send_type: "adhoc",        sku_id: "clobe-ai",      sent_at: daysAgo(2),  recipient_count: 3200, delivered_count: 3200, received_count: 2880, bounce: { hard: 58, soft: 0, spam: 262 },  open_rate: 0.38, conversion_rate: 0.22, status: "done", created_by: "앰버" },
  { name: "Pre-Series A 투자 유치 공지",     template_id: null,                 channel: "email",    send_type: "adhoc",        sku_id: "clobe-finance", sent_at: daysAgo(5),  recipient_count: 1250, delivered_count: 1250, received_count: 1218, bounce: { hard: 8, soft: 12, spam: 12 },   open_rate: 0.52, conversion_rate: 0.18, status: "done", created_by: "앰버" },
  { name: "5월 제품 업데이트 소식",          template_id: null,                 channel: "email",    send_type: "adhoc",        sku_id: "clobe-ai",      sent_at: daysAgo(7),  recipient_count: 4120, delivered_count: 4120, received_count: 3914, bounce: { hard: 34, soft: 62, spam: 110 }, open_rate: 0.29, conversion_rate: 0.11, status: "done", created_by: "앰버" },
  { name: "세무대리인 정기 리포트 (수동)",    template_id: null,                 channel: "email",    send_type: "adhoc",        sku_id: "clobe-connect", sent_at: daysAgo(11), recipient_count: 820,  delivered_count: 820,  received_count: 804,  bounce: { hard: 4, soft: 6, spam: 6 },     open_rate: 0.44, conversion_rate: 0.19, status: "done", created_by: "앰버" },
  { name: "자금일보",                        template_id: "daily_report",       channel: "email",    send_type: "user_setting", sku_id: "clobe-ai",      sent_at: daysAgo(1),  recipient_count: 4820, delivered_count: 4820, received_count: 4650, bounce: { hard: 42, soft: 89, spam: 39 },  open_rate: 0.41, conversion_rate: 0.25, status: "done", created_by: "자동화" },
  { name: "워크스페이스 연동 D+1 리마인더",  template_id: "data_connection_d1", channel: "email",    send_type: "triggered",    sku_id: "clobe-ai",      sent_at: daysAgo(3),  recipient_count: 520,  delivered_count: 520,  received_count: 508,  bounce: { hard: 2, soft: 6, spam: 4 },     open_rate: 0.41, conversion_rate: 0.21, status: "done", created_by: "자동화" },
  { name: "신규 가입 환영",                  template_id: "welcome_company",    channel: "email",    send_type: "user_ping",    sku_id: "clobe-ai",      sent_at: daysAgo(4),  recipient_count: 284,  delivered_count: 284,  received_count: 278,  bounce: { hard: 1, soft: 3, spam: 2 },     open_rate: 0.58, conversion_rate: 0.31, status: "done", created_by: "자동화" },
  { name: "1년 미접속 회사 안내",            template_id: "user_1_year_expired",channel: "email",    send_type: "triggered",    sku_id: "clobe-ai",      sent_at: daysAgo(8),  recipient_count: 340,  delivered_count: 340,  received_count: 310,  bounce: { hard: 12, soft: 4, spam: 14 },   open_rate: 0.26, conversion_rate: 0.09, status: "done", created_by: "자동화" },
  // --- alimtalk (no bounce breakdown) ---
  { name: "자금일보 알림",                   template_id: "daily_report",       channel: "alimtalk", send_type: "user_setting", sku_id: "clobe-ai",      sent_at: daysAgo(1),  recipient_count: 4820, delivered_count: 4820, received_count: 4790, bounce: null, open_rate: null, conversion_rate: 0.25, status: "done", created_by: "자동화" },
  { name: "첫 스크레이핑 완료 알림",         template_id: "first_scraping",     channel: "alimtalk", send_type: "user_ping",    sku_id: "clobe-ai",      sent_at: daysAgo(1),  recipient_count: 310,  delivered_count: 310,  received_count: 306,  bounce: null, open_rate: null, conversion_rate: 0.42, status: "done", created_by: "자동화" },
  { name: "미접속 넛징",                     template_id: "off-notice-1st",     channel: "alimtalk", send_type: "triggered",    sku_id: "clobe-ai",      sent_at: daysAgo(2),  recipient_count: 1240, delivered_count: 1240, received_count: 1198, bounce: null, open_rate: null, conversion_rate: 0.12, status: "done", created_by: "자동화" },
  { name: "자금일보 중단 예정 안내",         template_id: "report-off-notice",  channel: "alimtalk", send_type: "triggered",    sku_id: "clobe-ai",      sent_at: daysAgo(6),  recipient_count: 140,  delivered_count: 140,  received_count: 138,  bounce: null, open_rate: null, conversion_rate: 0.08, status: "done", created_by: "자동화" },
  { name: "새 스레드 알림",                  template_id: "com_new_thread",     channel: "alimtalk", send_type: "user_ping",    sku_id: "clobe-connect", sent_at: daysAgo(1),  recipient_count: 1240, delivered_count: 1240, received_count: 1228, bounce: null, open_rate: null, conversion_rate: 0.55, status: "done", created_by: "자동화" },
  { name: "스레드 답변 알림",                template_id: "com_reply_thread",   channel: "alimtalk", send_type: "user_ping",    sku_id: "clobe-connect", sent_at: daysAgo(2),  recipient_count: 630,  delivered_count: 630,  received_count: 624,  bounce: null, open_rate: null, conversion_rate: 0.48, status: "done", created_by: "자동화" },
  { name: "월급 알림 (매월 1일)",            template_id: "payroll_notice",     channel: "alimtalk", send_type: "user_setting", sku_id: "clobe-ai",      sent_at: daysAgo(14), recipient_count: 290,  delivered_count: 290,  received_count: 286,  bounce: null, open_rate: null, conversion_rate: 0.33, status: "done", created_by: "자동화" },
];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function seedMock(): Campaign[] {
  return FIXTURE_SEED.map((c, i) => ({
    ...c,
    id: `mock-${i + 1}`,
    created_at: c.sent_at ?? new Date().toISOString(),
  }));
}

function loadLocal(): Campaign[] {
  if (typeof window === "undefined") return seedMock();
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) {
      const seed = seedMock();
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as Campaign[];
  } catch {
    return seedMock();
  }
}

function saveLocal(list: Campaign[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
}

// ---------------- Public API ----------------

export async function getCampaigns(): Promise<Campaign[]> {
  if (!supabaseConfigured) return loadLocal();
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data ?? []) as Campaign[];
  } catch (e) {
    console.warn("[campaigns] Supabase load failed, using local", e);
    return loadLocal();
  }
}

export async function createCampaign(
  input: Omit<Campaign, "id" | "created_at" | "status"> & { status?: CampaignStatus }
): Promise<Campaign> {
  const row: Campaign = {
    ...input,
    id: crypto.randomUUID(),
    status: input.status ?? "done",
    created_at: new Date().toISOString(),
  };

  if (supabaseConfigured) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from(TABLE)
        .insert(row)
        .select("*")
        .single();
      if (error) throw error;
      return data as Campaign;
    } catch (e) {
      console.warn("[campaigns] Supabase insert failed, using local", e);
    }
  }
  const list = loadLocal();
  list.unshift(row);
  saveLocal(list);
  return row;
}

export const SEND_TYPE_STYLE: Record<
  CampaignSendType,
  { label: string; bg: string; fg: string; color: string }
> = {
  triggered:    { label: "자동 트리거",     bg: "#E6F1FB", fg: "#185FA5", color: "#185FA5" },
  user_setting: { label: "유저 수신 설정",  bg: "#E1F5EE", fg: "#0F6E56", color: "#0F6E56" },
  user_ping:    { label: "즉시 발송",       bg: "#EEEDFE", fg: "#534AB7", color: "#534AB7" },
  adhoc:        { label: "수동 발송",       bg: "#F7F7F5", fg: "#5F5E5A", color: "#9A9994" },
};
