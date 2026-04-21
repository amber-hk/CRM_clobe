"use client";

import { useEffect, useMemo, useState } from "react";
import { ChannelBadge } from "@/components/common/Badges";
import { SendTypeBadge } from "@/components/common/SendTypeBadge";
import {
  SEND_TYPES,
  loadCampaignMap,
  type CampaignMapEntry,
  type SendType,
} from "@/lib/campaign-map";
import { normalizeTemplateId } from "@/lib/template-id";
import { TemplateName } from "@/lib/template-meta";
import { listAutomations } from "@/lib/nhn";
import { mockEmailTemplates } from "@/lib/mock-data";
import type { AutomationItem } from "@/types/crm";

type Channel = "all" | "email" | "alimtalk";
type FunnelFilter = "all" | "onboarding" | "retention";

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const HOURS = ["8:00", "9:00", "10:00", "15:00"];

const FUNNEL_STYLE: Record<string, { label: string; bg: string; fg: string }> = {
  onboarding: { label: "ON", bg: "#E1F5EE", fg: "#0F6E56" },
  activation: { label: "AC", bg: "#E6F1FB", fg: "#185FA5" },
  retention:  { label: "RE", bg: "#EEEDFE", fg: "#534AB7" },
  offboarding:{ label: "OF", bg: "#FCEBEB", fg: "#A32D2D" },
  finance:    { label: "FI", bg: "#FAEEDA", fg: "#854F0B" },
};

function dayMatchesSchedule(
  dayIdx: number,
  days?: string
): boolean {
  if (!days) return false;
  if (days === "daily") return true;
  if (days === "weekday") return dayIdx < 5;
  if (days === "weekday_no_fri") return dayIdx < 4;
  if (days === "monday") return dayIdx === 0;
  return false;
}

export default function MapPage() {
  const [map, setMap] = useState<Record<string, CampaignMapEntry>>({});
  const [channelFilter, setChannelFilter] = useState<Channel>("all");
  const [funnelFilter, setFunnelFilter] = useState<FunnelFilter>("all");
  const [sendTypeFilter, setSendTypeFilter] = useState<SendType | "all">("all");

  useEffect(() => {
    void loadCampaignMap().then(setMap);
  }, []);

  const entries = useMemo(() => Object.values(map).filter((e) => {
    if (e.is_active === false) return false;
    if (!e.scheduled_time) return false;
    if (channelFilter !== "all" && e.channel?.toLowerCase() !== channelFilter) return false;
    if (funnelFilter !== "all") {
      if (funnelFilter === "onboarding" && e.funnel_stage !== "onboarding") return false;
      if (funnelFilter === "retention" && !["retention", "offboarding"].includes(e.funnel_stage ?? "")) return false;
    }
    if (sendTypeFilter !== "all" && e.send_type !== sendTypeFilter) return false;
    return true;
  }), [map, channelFilter, funnelFilter, sendTypeFilter]);

  return (
    <section>
      <h1 className="mb-5 text-[18px] font-semibold tracking-tight">지도</h1>

      {/* Matrix */}
      <div className="mb-6 overflow-x-auto rounded-xl border border-black/10 bg-white">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr>
              <th className="w-[60px] border-b border-r border-black/10 bg-[#F7F7F5] px-2 py-2 text-left font-medium text-[#9A9994]">시간</th>
              {DAYS.map((d, i) => (
                <th
                  key={d}
                  className={`border-b border-r border-black/10 px-2 py-2 text-center font-medium last:border-r-0 ${
                    i >= 5 ? "bg-[#FEF9C3] text-[#854F0B]" : "bg-[#F7F7F5] text-[#9A9994]"
                  }`}
                >
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour) => (
              <tr key={hour}>
                <td className="border-b border-r border-black/10 px-2 py-2 font-mono text-[11px] text-[#9A9994]">
                  {hour}
                </td>
                {DAYS.map((_, dayIdx) => {
                  const cellEntries = entries.filter(
                    (e) => e.scheduled_time === hour && dayMatchesSchedule(dayIdx, e.scheduled_days)
                  );
                  return (
                    <td
                      key={dayIdx}
                      className="border-b border-r border-black/10 p-1 align-top last:border-r-0"
                      style={dayIdx >= 5 ? { background: "#FFFEF5" } : undefined}
                    >
                      <div className="flex flex-col gap-1">
                        {cellEntries.map((e) => (
                          <MatrixCard key={e.template_id} entry={e} />
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterGroup label="채널" value={channelFilter} onChange={setChannelFilter as (v: string) => void}
          options={[{ value: "all", label: "전체" }, { value: "email", label: "이메일" }, { value: "alimtalk", label: "알림톡" }]}
        />
        <div className="h-4 w-px bg-black/10" />
        <FilterGroup label="유형" value={funnelFilter} onChange={setFunnelFilter as (v: string) => void}
          options={[{ value: "all", label: "전체" }, { value: "onboarding", label: "온보딩(ON)" }, { value: "retention", label: "리텐션(RE)" }]}
        />
        <div className="h-4 w-px bg-black/10" />
        <FilterGroup label="sendType" value={sendTypeFilter} onChange={setSendTypeFilter as (v: string) => void}
          options={[{ value: "all", label: "전체" }, ...SEND_TYPES.map((s) => ({ value: s.value, label: s.label }))]}
        />
      </div>

      {/* Detail list (from automation) */}
      <AutomationList map={map} channelFilter={channelFilter} />
    </section>
  );
}

function MatrixCard({ entry: e }: { entry: CampaignMapEntry }) {
  const funnel = FUNNEL_STYLE[e.funnel_stage ?? ""] ?? { label: "?", bg: "#F7F7F5", fg: "#5F5E5A" };
  const ctr = e.ctr ?? null;
  const target = e.ctr_target ?? 0.1;
  const belowTarget = ctr !== null && ctr < target;
  const channels: string[] = [];
  if (e.channel === "EMAIL" || e.channel === "ALIMTALK") {
    channels.push(e.channel === "EMAIL" ? "email" : "alimtalk");
  }

  return (
    <div
      className="rounded-md p-1.5 text-[10px]"
      style={{
        border: belowTarget ? "1.5px solid #E24B4A" : "1px solid rgba(0,0,0,0.08)",
        background: belowTarget ? "#FEF2F2" : "#fff",
      }}
    >
      <div className="mb-0.5 flex items-center gap-1">
        <span
          className="rounded px-1 py-px text-[8px] font-bold"
          style={{ background: funnel.bg, color: funnel.fg }}
        >
          {funnel.label}
        </span>
        {channels.map((ch) => (
          <span
            key={ch}
            className="rounded px-1 py-px text-[8px] font-medium"
            style={
              ch === "email"
                ? { background: "#E6F1FB", color: "#185FA5" }
                : { background: "#FEF9C3", color: "#854F0B" }
            }
          >
            {ch === "email" ? "이메일" : "알림톡"}
          </span>
        ))}
        {belowTarget && (
          <span className="rounded bg-[#E24B4A] px-1 py-px text-[8px] font-bold text-white">
            미달
          </span>
        )}
      </div>
      <div className="truncate font-medium text-[#1A1A18]">
        <TemplateName id={e.template_id} className="text-[10px]" />
      </div>
      {ctr !== null && (
        <div className="mt-0.5 text-[9px] text-[#9A9994]">
          CTR {(ctr * 100).toFixed(1)}% / 목표 {(target * 100).toFixed(0)}%
        </div>
      )}
    </div>
  );
}

function FilterGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-[#9A9994]">{label}</span>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
              on
                ? "border-[#08B1A9] bg-[#E1F5EE] font-medium text-[#0F6E56]"
                : "border-black/15 bg-white text-[#5F5E5A] hover:bg-[#F7F7F5]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function AutomationList({
  map,
  channelFilter,
}: {
  map: Record<string, CampaignMapEntry>;
  channelFilter: Channel;
}) {
  const [rows, setRows] = useState<AutomationItem[]>([]);
  useEffect(() => {
    void (async () => {
      const alim = await listAutomations();
      const email: AutomationItem[] = mockEmailTemplates
        .filter((t) => !t.supersededBy && !t.hidden && !t.isLayout)
        .map((t) => ({
          id: `email:${t.id}`,
          nhnName: t.id,
          displayName: t.name,
          kind: "time" as const,
          trigger: t.category ?? "—",
          channels: ["email" as const],
          templateCode: t.code,
          sku: (t.sku ?? "ai") as AutomationItem["sku"],
          status: "on" as const,
        }));
      setRows([...alim, ...email]);
    })();
  }, []);

  const grouped = useMemo(() => {
    const buckets: Record<string, AutomationItem[]> = {
      triggered: [], user_setting: [], user_ping: [], unset: [],
    };
    for (const r of rows) {
      const entry = map[normalizeTemplateId(r.nhnName || r.id)];
      if (entry?.is_active === false) continue;
      if (channelFilter === "email" && !r.channels.includes("email")) continue;
      if (channelFilter === "alimtalk" && !r.channels.includes("alimtalk")) continue;
      const t = entry?.send_type ?? null;
      buckets[t ?? "unset"].push(r);
    }
    return buckets;
  }, [rows, map, channelFilter]);

  const sections: { key: string; label: string; desc: string; color: string; bg: string }[] = [
    ...SEND_TYPES.map((s) => ({ key: s.value, label: s.label, desc: s.desc, color: s.color, bg: s.bg })),
    { key: "unset", label: "미분류", desc: "템플릿 관리 페이지에서 send_type을 지정하세요", color: "#854F0B", bg: "#FAEEDA" },
  ];

  return (
    <div className="flex flex-col gap-3">
      {sections.map((sec) => {
        const items = grouped[sec.key] ?? [];
        return <AccordionSection key={sec.key} meta={sec} items={items} map={map} />;
      })}
    </div>
  );
}

function AccordionSection({
  meta,
  items,
  map,
}: {
  meta: { key: string; label: string; desc: string; color: string; bg: string };
  items: AutomationItem[];
  map: Record<string, CampaignMapEntry>;
}) {
  const [open, setOpen] = useState(true);
  const cols = "1fr 70px 70px 80px 1fr 1fr 65px 65px 65px";
  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#F7F7F5]"
      >
        <div className="flex items-center gap-2">
          <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: meta.bg, color: meta.color }}>
            {meta.label}
          </span>
          <span className="text-[12px] text-[#9A9994]">{meta.desc}</span>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-[#5F5E5A]">
          <span>{items.length}개</span>
          <span className="text-[#9A9994]">{open ? "▾" : "▸"}</span>
        </div>
      </button>
      {open && items.length === 0 && (
        <div className="border-t border-black/10 px-4 py-6 text-center text-[12px] text-[#9A9994]">
          해당 항목 없음
        </div>
      )}
      {open && items.length > 0 && (
        <div>
          <div
            className="grid border-y border-black/10 bg-[#F7F7F5] px-4 py-2 text-[11px] text-[#9A9994]"
            style={{ gridTemplateColumns: cols }}
          >
            <div>표시이름</div>
            <div className="text-center">채널</div>
            <div className="text-center">성격</div>
            <div>발송 조건</div>
            <div>발송 대상</div>
            <div>발송 시간</div>
            <div className="text-right">CTR</div>
            <div className="text-right">목표</div>
            <div className="text-center">상태</div>
          </div>
          {items.map((r) => {
            const entry = map[normalizeTemplateId(r.nhnName || r.id)];
            const ctr = entry?.ctr ?? null;
            const target = entry?.ctr_target ?? 0.1;
            const below = ctr !== null && ctr < target;
            return (
              <div
                key={r.id}
                className="grid items-center border-b border-black/10 px-4 py-2.5 text-[12px] last:border-b-0"
                style={{ gridTemplateColumns: cols }}
              >
                <div>
                  <div className="text-[12px] font-medium"><TemplateName id={r.nhnName || r.id} /></div>
                  <div className="truncate font-mono text-[10px] text-[#9A9994]">{r.nhnName}</div>
                </div>
                <div className="flex justify-center gap-0.5">
                  {r.channels.map((c) => <ChannelBadge key={c} ch={c} />)}
                </div>
                <div className="text-center text-[11px] text-[#5F5E5A]">
                  {entry?.frequency === "once" ? "1회" : entry?.frequency === "recurring" ? "반복" : "—"}
                </div>
                <div className="text-[11px] text-[#5F5E5A]">{entry?.send_condition ?? "—"}</div>
                <div className="text-[11px] text-[#5F5E5A]">{entry?.send_target ?? "—"}</div>
                <div className="text-[11px] text-[#5F5E5A]">
                  {entry?.scheduled_time ?? "—"}{" "}
                  {entry?.scheduled_days === "daily" ? "매일" : entry?.scheduled_days === "weekday" ? "평일" : entry?.scheduled_days === "weekday_no_fri" ? "월~목" : entry?.scheduled_days === "monday" ? "월요일" : ""}
                </div>
                <div className={`text-right text-[12px] ${below ? "font-medium text-[#E24B4A]" : ""}`}>
                  {ctr !== null ? `${(ctr * 100).toFixed(1)}%` : "N/A"}
                </div>
                <div className="text-right text-[11px] text-[#9A9994]">{(target * 100).toFixed(0)}%</div>
                <div className="flex justify-center">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={
                      entry?.is_active === false
                        ? { background: "#E5E5E5", color: "#5F5E5A" }
                        : { background: "#E1F5EE", color: "#0F6E56" }
                    }
                  >
                    {entry?.is_active === false ? "OFF" : "ON"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
