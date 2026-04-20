/**
 * NHN Cloud Biz Message (AlimTalk) API.
 *
 * This module only knows about the raw NHN wire format. All normalization
 * into CRM types lives in `src/lib/adapters/nhn-adapter.ts`.
 *
 * Real endpoint:
 *   GET {NHN_BASE}/alimtalk/v2.3/appkeys/{appkey}/senders/{senderKey}/templates
 *
 * Until live credentials are configured, fetchers return mock fixtures that
 * mirror the real payload shape.
 */

import type { AutomationItem } from "@/types/crm";
import {
  adaptAutomations,
  type NhnTemplateMetadata,
} from "./adapters/nhn-adapter";
import { mockNhnTemplates, mockNhnMetadata } from "./mock-data";

const APPKEY = process.env.NHN_APPKEY;
const SENDER_KEY = process.env.NHN_SENDER_KEY;
const SECRET = process.env.NHN_SECRET_KEY;
const USE_MOCK = !APPKEY || !SENDER_KEY || !SECRET;

const NHN_BASE =
  "https://kakaotalk-bizmessage.api.nhncloudservice.com/alimtalk/v2.3";

/** Minimal shape of a template row as returned by NHN. */
import type {
  AlimButton,
  AlimEmphasizeType,
  AlimMessageType,
  AlimTemplateItem,
  AlimTemplateItemHighlight,
} from "@/types/crm";

export type NhnRawTemplate = {
  senderKey: string;
  templateCode: string;
  templateName: string;
  templateContent: string;
  templateMessageType: AlimMessageType;
  templateEmphasizeType: AlimEmphasizeType;
  /** Raw NHN inspection state, e.g. "REG" | "REQ" | "APR" | "REJ" | "ARS". */
  inspectionStatus: string;
  status?: string;
  categoryCode: string;
  createDate?: string;
  templateImageUrl: string | null;
  templateImageName: string | null;
  templateHeader: string | null;
  templateItem: AlimTemplateItem | null;
  templateItemHighlight: AlimTemplateItemHighlight | null;
  templateTitle: string | null;
  templateSubtitle: string | null;
  templateExtra: string | null;
  templateAd: string | null;
  buttons: AlimButton[];
  /** Dev/test template — `_dev` suffix in the NHN code. */
  hidden?: boolean;
};

export type NhnTemplatesResponse = {
  header: { isSuccessful: boolean; resultCode: number; resultMessage: string };
  templates: NhnRawTemplate[];
};

// ---------------- Raw fetchers ----------------

export async function fetchTemplates(): Promise<NhnRawTemplate[]> {
  if (USE_MOCK) return mockNhnTemplates;

  const url = `${NHN_BASE}/appkeys/${APPKEY}/senders/${SENDER_KEY}/templates`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      "X-Secret-Key": SECRET!,
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`NHN API ${res.status}`);
  const body = (await res.json()) as NhnTemplatesResponse;
  if (!body.header?.isSuccessful) {
    throw new Error(`NHN: ${body.header?.resultMessage ?? "unknown error"}`);
  }
  return body.templates ?? [];
}

// ---------------- High-level façade ----------------

/**
 * Canonical entry point for the automation page.
 *
 * 1. Fetches raw templates from NHN (or mock).
 * 2. Loads CRM-side metadata overrides (display name, SKU, kind, trigger text)
 *    from Supabase — stubbed while Supabase is unconfigured.
 * 3. Runs the adapter to produce `AutomationItem[]` consumable by the UI.
 */
export async function listAutomations(): Promise<AutomationItem[]> {
  const [raw, metadata] = await Promise.all([
    fetchTemplates(),
    loadCrmMetadata(),
  ]);
  return adaptAutomations(raw, metadata);
}

/**
 * Load per-template CRM overrides (display name, SKU, kind, etc).
 * TODO: replace with a Supabase query once the `automation_overrides` table exists.
 */
async function loadCrmMetadata(): Promise<Record<string, NhnTemplateMetadata>> {
  return mockNhnMetadata;
}

