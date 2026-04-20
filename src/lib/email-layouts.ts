/**
 * Email layout (header/footer) mapping per SKU.
 *
 * Layouts themselves are NHN email templates whose `templateId` starts with
 * `layout_` (see `isEmailLayout()`). They're hidden from the normal send
 * picker and edited separately from the Settings page.
 *
 * Persisted in `localStorage` for now — permission-controlled backend storage
 * will come later.
 */

export type LayoutSku = "clobe-ai" | "clobe-finance" | "clobe-connect";

export type EmailLayoutMapping = {
  skuId: LayoutSku;
  name: string;
  primaryColor: string;
  headerTemplateId: string;
  footerTemplateId: string;
};

export const DEFAULT_EMAIL_LAYOUTS: EmailLayoutMapping[] = [
  {
    skuId: "clobe-ai",
    name: "클로브AI",
    primaryColor: "#08B1A9",
    headerTemplateId: "layout_header_clobe_ai_prod",
    footerTemplateId: "layout_footer_clobe_ai_prod",
  },
  {
    skuId: "clobe-finance",
    name: "클로브금융",
    primaryColor: "#378ADD",
    headerTemplateId: "layout_header_clobe_finance_prod",
    footerTemplateId: "layout_footer_clobe_finance_prod",
  },
  {
    skuId: "clobe-connect",
    name: "클로브커넥트",
    primaryColor: "#7F77DD",
    headerTemplateId: "layout_header_clobe_connect_prod",
    footerTemplateId: "layout_footer_clobe_connect_prod",
  },
];

/** Detect a layout template purely by naming convention. */
export function isEmailLayout(templateId: string | undefined | null): boolean {
  return !!templateId && templateId.startsWith("layout_");
}

const STORAGE_KEY = "clobe.email-layouts.v1";

export function loadLayouts(): EmailLayoutMapping[] {
  if (typeof window === "undefined") return DEFAULT_EMAIL_LAYOUTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_EMAIL_LAYOUTS;
    const parsed = JSON.parse(raw) as EmailLayoutMapping[];
    return Array.isArray(parsed) && parsed.length === 3 ? parsed : DEFAULT_EMAIL_LAYOUTS;
  } catch {
    return DEFAULT_EMAIL_LAYOUTS;
  }
}

export function saveLayouts(layouts: EmailLayoutMapping[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
}

export const NHN_CONSOLE_URL =
  "https://console.nhncloud.com/email/appKey/G0k0Qmd24ZjEWftL/template";
