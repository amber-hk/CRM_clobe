/**
 * `crm_campaign_map` storage layer.
 *
 * Backed by Supabase when `NEXT_PUBLIC_SUPABASE_URL` + anon key are present;
 * falls back to `localStorage` for solo dev. Either way the API is the same
 * map keyed by the dbt-normalized template id.
 */

"use client";

import { createClient } from "@/lib/supabase/client";
import { normalizeTemplateId } from "./template-id";
import { TEMPLATE_META } from "./template-defaults";

export type CampaignChannel = "ALIMTALK" | "EMAIL";
export type CampaignSku = "clobe-ai" | "clobe-finance" | "clobe-connect";
export type FunnelStage =
  | "onboarding"
  | "activation"
  | "retention"
  | "offboarding"
  | "finance";
/** How the message gets triggered. */
export type SendType = "triggered" | "user_setting" | "user_ping";

export type CampaignMapEntry = {
  template_id: string;
  channel: CampaignChannel;
  display_name: string;
  description: string | null;
  sku: CampaignSku | null;
  funnel_stage: FunnelStage | null;
  send_type: SendType | null;
  /** Deactivated templates are hidden from send + automation surfaces. */
  is_active?: boolean;
  /** 'once' = 계정당 1회, 'recurring' = 반복 */
  frequency?: "once" | "recurring";
  /** 발송 시간 e.g. "8:00", "10:00", "변동" */
  scheduled_time?: string;
  /** 발송 요일 패턴 */
  scheduled_days?: "daily" | "weekday" | "weekday_no_fri" | "monday" | "variable";
  /** 발송 조건 설명 */
  send_condition?: string;
  /** 발송 대상 설명 */
  send_target?: string;
  /** 현재 CTR (null = N/A) */
  ctr?: number | null;
  /** 목표 CTR (default 0.1) */
  ctr_target?: number;
  updated_at: string;
};

const LOCAL_KEY = "crm_campaign_map";
const TABLE = "crm_campaign_map";

const supabaseConfigured =
  typeof process !== "undefined" &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function loadLocal(): Record<string, CampaignMapEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as Record<string, CampaignMapEntry>) : {};
  } catch {
    return {};
  }
}

function saveLocal(map: Record<string, CampaignMapEntry>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(map));
}

export async function loadCampaignMap(): Promise<Record<string, CampaignMapEntry>> {
  // Defaults ship with inferred metadata; any user-saved row wins.
  const withDefaults = (rows: Record<string, CampaignMapEntry>) => ({
    ...TEMPLATE_META,
    ...rows,
  });

  if (!supabaseConfigured) return withDefaults(loadLocal());
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from(TABLE).select("*");
    if (error) throw error;
    const rows = Object.fromEntries(
      (data ?? []).map((r) => [r.template_id, r as CampaignMapEntry])
    );
    return withDefaults(rows);
  } catch (e) {
    console.warn("[campaign-map] Supabase load failed, using local", e);
    return withDefaults(loadLocal());
  }
}

export async function upsertCampaignMap(
  partial: Omit<CampaignMapEntry, "updated_at"> & { updated_at?: string }
): Promise<CampaignMapEntry> {
  const entry: CampaignMapEntry = {
    ...partial,
    template_id: normalizeTemplateId(partial.template_id),
    updated_at: new Date().toISOString(),
  };

  if (supabaseConfigured) {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from(TABLE)
        .upsert(entry, { onConflict: "template_id" });
      if (error) throw error;
      return entry;
    } catch (e) {
      console.warn("[campaign-map] Supabase upsert failed, using local", e);
    }
  }

  const map = loadLocal();
  map[entry.template_id] = entry;
  saveLocal(map);
  return entry;
}

export async function deleteCampaignMap(templateId: string): Promise<void> {
  const id = normalizeTemplateId(templateId);
  if (supabaseConfigured) {
    try {
      const supabase = createClient();
      const { error } = await supabase.from(TABLE).delete().eq("template_id", id);
      if (error) throw error;
      return;
    } catch (e) {
      console.warn("[campaign-map] Supabase delete failed", e);
    }
  }
  const map = loadLocal();
  delete map[id];
  saveLocal(map);
}

export const FUNNEL_STAGES: { value: FunnelStage; label: string }[] = [
  { value: "onboarding", label: "온보딩" },
  { value: "activation", label: "활성화" },
  { value: "retention", label: "리텐션" },
  { value: "offboarding", label: "오프보딩" },
  { value: "finance", label: "금융" },
];

export const CAMPAIGN_SKUS: { value: CampaignSku; label: string; color: string }[] = [
  { value: "clobe-ai", label: "Clobe AI", color: "#08B1A9" },
  { value: "clobe-finance", label: "Clobe Finance", color: "#378ADD" },
  { value: "clobe-connect", label: "Clobe Connect", color: "#7F77DD" },
];

export const SEND_TYPES: {
  value: SendType;
  label: string;
  desc: string;
  color: string;
  bg: string;
}[] = [
  {
    value: "triggered",
    label: "자동 트리거",
    desc: "조건 만족 시 자동 발송 (미접속, 오류 감지 등)",
    color: "#185FA5",
    bg: "#E6F1FB",
  },
  {
    value: "user_setting",
    label: "유저 수신 설정",
    desc: "유저가 켜둔 정보성 알림 (자금일보, 한도 업데이트 등)",
    color: "#0F6E56",
    bg: "#E1F5EE",
  },
  {
    value: "user_ping",
    label: "즉시 발송",
    desc: "유저 액션 직후 즉시 발송 (스레드 생성, 가입 환영 등)",
    color: "#534AB7",
    bg: "#EEEDFE",
  },
];
