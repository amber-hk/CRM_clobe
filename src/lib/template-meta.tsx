/**
 * Shared client-side accessor for CRM template metadata.
 *
 * Reads synchronously from `localStorage` so it can be called directly from
 * render paths (chart labels, table cells) without waiting for a Supabase
 * round-trip. On the server it safely returns the raw templateId.
 */

"use client";

import { normalizeTemplateId } from "./template-id";
import type { CampaignMapEntry } from "./campaign-map";
import { TEMPLATE_META } from "./template-defaults";

export { TEMPLATE_META };

const STORAGE_KEY = "crm_campaign_map";

function readMap(): Record<string, CampaignMapEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getTemplateMeta(templateId: string): CampaignMapEntry | undefined {
  const key = normalizeTemplateId(templateId);
  // User-saved row wins over inferred defaults.
  return readMap()[key] ?? TEMPLATE_META[key];
}

export function getTemplateDisplayName(templateId: string): string {
  return getTemplateMeta(templateId)?.display_name || templateId;
}

export function hasTemplateDisplayName(templateId: string): boolean {
  return !!getTemplateMeta(templateId)?.display_name?.trim();
}

/** Templates are active unless explicitly set `is_active: false`. */
export function isTemplateActive(templateId: string): boolean {
  return getTemplateMeta(templateId)?.is_active !== false;
}

/**
 * Unified rendering: alias if present, otherwise the raw templateId shown in
 * italic gray. Use everywhere a template name appears in the UI.
 */
export function TemplateName({
  id,
  className = "",
}: {
  id: string;
  className?: string;
}) {
  const alias = hasTemplateDisplayName(id);
  return (
    <span
      className={`${className} ${alias ? "" : "italic text-[#9A9994]"}`.trim()}
    >
      {alias ? getTemplateDisplayName(id) : id}
    </span>
  );
}
