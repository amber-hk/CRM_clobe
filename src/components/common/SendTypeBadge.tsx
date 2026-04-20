import { SEND_TYPE_STYLE, type CampaignSendType } from "@/lib/campaigns";

export function SendTypeBadge({ type }: { type: CampaignSendType }) {
  const s = SEND_TYPE_STYLE[type];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}
