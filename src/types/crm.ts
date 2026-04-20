/**
 * CRM domain types. Used across pages, adapters, and API boundaries.
 * Keep this file free of runtime dependencies.
 */

export type Sku = "ai" | "fin" | "con";

/** Messaging channel — canonical across the app. */
export type Channel = "email" | "alimtalk";

export type AutomationKind = "time" | "condition";

/** Normalized inspection/approval state for a template. */
export type TemplateStatus = "approved" | "pending" | "rejected" | "draft";

export type AutomationItem = {
  id: string;
  /** Immutable NHN source name — never edited on CRM side. */
  nhnName: string;
  /** CRM display alias (from Supabase `automation_overrides.display_name`). */
  displayName: string;
  kind: AutomationKind;
  trigger: string;
  channels: Channel[];
  templateCode: string | null;
  sku: Sku;
  status: "on" | "off";
  /** time-kind */
  lastSentAt?: string;
  sentCount?: number;
  /** condition-kind */
  todayCount?: number;
  triggerTag?: string;
  /** Older templateCodes merged under this automation (see adapter grouping). */
  legacyCodes?: string[];
};

export type Template = {
  id: string;
  code: string;
  name: string;
  channel: Channel;
  status: TemplateStatus;
  sku?: Sku;
  category?: string;
  content?: string;
  createdAt?: string;
  /** If this template was merged as a legacy version, the active code it rolled into. */
  supersededBy?: string;
  /** Dev/test template — hidden from the UI by default. */
  hidden?: boolean;
  /** Layout template (`layout_*`) — shown in Settings, not in the send picker. */
  isLayout?: boolean;
};

// ---------------- AlimTalk-specific ----------------

export type AlimEmphasizeType = "NONE" | "TEXT" | "IMAGE" | "ITEM_LIST";
/** BA=기본, EX=강조, MI=채널추가, AL=Ad. */
export type AlimMessageType = "BA" | "EX" | "MI" | "AL";
/** WL=웹링크, AC=채널추가, BK=봇키워드, MD=메시지전달, AL=앱링크, BC=상담톡, BT=비즈챗. */
export type AlimButtonType = "WL" | "AC" | "BK" | "MD" | "AL" | "BC" | "BT";

export type AlimButton = {
  ordering: number;
  type: AlimButtonType;
  name: string;
  linkMo: string | null;
  linkPc: string | null;
};

export type AlimItemRow = { title: string; description: string };

export type AlimTemplateItem = {
  list: AlimItemRow[];
  summary: AlimItemRow;
};

export type AlimTemplateItemHighlight = {
  title: string;
  description: string;
  imageUrl: string | null;
};

/** Rich AlimTalk template — superset of `Template` with all NHN render fields. */
export type AlimTemplate = Template & {
  templateEmphasizeType: AlimEmphasizeType;
  templateMessageType: AlimMessageType;
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
  categoryCode: string;
};

export type CampaignStatus = "running" | "ended";

export type Campaign = {
  id: string;
  name: string;
  channel: Channel;
  sku: Sku;
  openRate: string;
  openTrend: "up" | "down" | "flat";
  status: CampaignStatus;
};

export type WarningKind = "ctr-below" | "tracking-missing";

export type Warning = {
  id: string;
  kind: WarningKind;
  title: string;
  sku: Sku;
  description: string;
  /** For ctr-below */
  automationName?: string;
  sends?: number;
  ctr?: number;
  /** For tracking-missing */
  pill?: string;
};

export type SendStatus = "success" | "failed" | "partial";

export type SendHistoryItem = {
  id: string;
  sentAt: string;
  campaignName: string;
  channel: Channel;
  sku: Sku;
  sentCount: number;
  openRate?: number;
  ctr?: number;
  status: SendStatus;
};
