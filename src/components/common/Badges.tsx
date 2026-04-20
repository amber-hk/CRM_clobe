import { skuMeta, chartColor, type Sku } from "@/lib/dashboard-data";

export function ChannelBadge({ ch }: { ch: "email" | "alimtalk" }) {
  const s =
    ch === "email"
      ? { bg: "#E6F1FB", fg: "#185FA5", label: "이메일" }
      : { bg: "#E1F5EE", fg: "#0F6E56", label: "알림톡" };
  return (
    <span
      className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

export function SkuTag({ sku }: { sku: Sku }) {
  const m = skuMeta[sku];
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ background: m.tagBg, color: m.tagText }}
    >
      <span
        className="inline-block h-3 w-3 rounded-full"
        style={{ background: chartColor[sku] }}
      />
      {m.label}
    </span>
  );
}
