/**
 * Transforms raw NHN Cloud AlimTalk responses into CRM domain types.
 *
 * The adapter is the only place that understands NHN's wire format (status
 * codes, template grouping rules, etc). Consumers upstream work purely with
 * `AutomationItem` / `Template` from `@/types/crm`.
 */

import type {
  AlimTemplate,
  AutomationItem,
  AutomationKind,
  Channel,
  Sku,
  Template,
  TemplateStatus,
} from "@/types/crm";
import type { NhnRawTemplate } from "@/lib/nhn";

/** CRM-side per-template overrides, keyed by NHN `templateName`. */
export type NhnTemplateMetadata = {
  displayName: string;
  kind: AutomationKind;
  trigger: string;
  channels: Channel[];
  sku: Sku;
  status: "on" | "off";
  lastSentAt?: string;
  sentCount?: number;
  todayCount?: number;
  triggerTag?: string;
};

// ---------------- Status normalization ----------------

/**
 * NHN uses short inspection codes. Map to the CRM-facing state.
 * Unknown codes fall back to "draft" so they are visible but non-actionable.
 */
export function normalizeTemplateStatus(code: string): TemplateStatus {
  switch (code?.toUpperCase()) {
    case "APR":
    case "ARS":
    case "APPROVED":
      return "approved";
    case "REQ":
    case "REG":
    case "REVIEWING":
      return "pending";
    case "REJ":
    case "REJECTED":
      return "rejected";
    default:
      return "draft";
  }
}

// ---------------- Channel normalization ----------------

/**
 * NHN returns AlimTalk-only template records (they're AlimTalk templates), but
 * CRM-side metadata can flag an automation as email-only, alimtalk-only, or
 * both. This helper sanitizes free-form strings just in case.
 */
export function normalizeChannel(value: string): Channel {
  const v = value?.toLowerCase().replace(/[-_\s]/g, "");
  if (v === "email" || v === "mail") return "email";
  return "alimtalk";
}

// ---------------- Template grouping ----------------

/**
 * NHN surfaces every code version of a template. CRM wants one row per
 * logical campaign: pick the most-recently-approved code and fold older
 * versions into `legacyCodes`.
 *
 * Grouping key is `templateName` (NHN's human-readable source name), since
 * `templateCode` changes every time a template is re-registered for approval.
 */
export function groupTemplatesByName(
  templates: NhnRawTemplate[]
): { primary: NhnRawTemplate; legacy: NhnRawTemplate[] }[] {
  const byName = new Map<string, NhnRawTemplate[]>();
  for (const t of templates) {
    const list = byName.get(t.templateName) ?? [];
    list.push(t);
    byName.set(t.templateName, list);
  }

  const groups: { primary: NhnRawTemplate; legacy: NhnRawTemplate[] }[] = [];
  for (const list of byName.values()) {
    // Prefer the newest approved; fall back to the newest regardless of status.
    const sorted = [...list].sort((a, b) => cmpDate(b.createDate, a.createDate));
    const approved = sorted.find(
      (t) => normalizeTemplateStatus(t.inspectionStatus) === "approved"
    );
    const primary = approved ?? sorted[0];
    const legacy = sorted.filter((t) => t.templateCode !== primary.templateCode);
    groups.push({ primary, legacy });
  }
  return groups;
}

function cmpDate(a: string | undefined, b: string | undefined): number {
  return (a ?? "").localeCompare(b ?? "");
}

// ---------------- Adapters ----------------

/**
 * Build a single `AutomationItem` from a grouped NHN template + CRM overrides.
 * If no metadata exists (e.g. newly imported template), the NHN fields serve
 * as sensible defaults — the operator can then edit display name / SKU in UI.
 */
export function toAutomationItem(
  primary: NhnRawTemplate,
  legacy: NhnRawTemplate[],
  meta?: NhnTemplateMetadata
): AutomationItem {
  return {
    id: primary.templateName,
    nhnName: primary.templateName,
    displayName: meta?.displayName ?? primary.templateName,
    kind: meta?.kind ?? "time",
    trigger: meta?.trigger ?? "—",
    channels: meta?.channels ?? ["alimtalk"],
    templateCode: primary.templateCode,
    sku: meta?.sku ?? "ai",
    status: meta?.status ?? "on",
    lastSentAt: meta?.lastSentAt,
    sentCount: meta?.sentCount,
    todayCount: meta?.todayCount,
    triggerTag: meta?.triggerTag,
    legacyCodes: legacy.map((t) => t.templateCode),
  };
}

export function adaptAutomations(
  raw: NhnRawTemplate[],
  metadata: Record<string, NhnTemplateMetadata>
): AutomationItem[] {
  return groupTemplatesByName(raw).map(({ primary, legacy }) =>
    toAutomationItem(primary, legacy, metadata[primary.templateName])
  );
}

/**
 * Flatten a raw NHN template into the rich CRM `AlimTemplate` row.
 * `AlimTemplate` extends `Template`, so anything expecting a Template still
 * works.
 */
export function toTemplate(raw: NhnRawTemplate, supersededBy?: string): AlimTemplate {
  return {
    id: raw.templateCode,
    code: raw.templateCode,
    name: raw.templateName,
    channel: "alimtalk",
    status: normalizeTemplateStatus(raw.inspectionStatus),
    category: raw.categoryCode,
    content: raw.templateContent,
    createdAt: raw.createDate,
    supersededBy,
    hidden: raw.hidden,
    templateEmphasizeType: raw.templateEmphasizeType,
    templateMessageType: raw.templateMessageType,
    templateImageUrl: raw.templateImageUrl,
    templateImageName: raw.templateImageName,
    templateHeader: raw.templateHeader,
    templateItem: raw.templateItem,
    templateItemHighlight: raw.templateItemHighlight,
    templateTitle: raw.templateTitle,
    templateSubtitle: raw.templateSubtitle,
    templateExtra: raw.templateExtra,
    templateAd: raw.templateAd,
    buttons: raw.buttons ?? [],
    categoryCode: raw.categoryCode,
  };
}

export function adaptTemplates(raw: NhnRawTemplate[]): AlimTemplate[] {
  const groups = groupTemplatesByName(raw);
  return groups.flatMap(({ primary, legacy }) => [
    toTemplate(primary),
    ...legacy.map((t) => toTemplate(t, primary.templateCode)),
  ]);
}
