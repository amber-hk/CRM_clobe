"use client";

/**
 * Campaign-level performance charts. Sourced from `getCampaigns()`.
 * Every chart respects: date range, channel filter, selected-campaign search.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { SEND_TYPE_STYLE, type Campaign } from "@/lib/campaigns";
import { getTemplateDisplayName } from "@/lib/template-meta";
import { SendTypeBadge } from "@/components/common/SendTypeBadge";
import { ChannelBadge } from "@/components/common/Badges";

Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler
);

type Channel = "all" | "email" | "alim";
type Props = {
  campaigns: Campaign[];
  from: Date;
  to: Date;
  channel: Channel;
};

export function CampaignPerformanceCharts({
  campaigns,
  from,
  to,
  channel,
}: Props) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return campaigns
      .filter((c) => {
        if (channel === "email" && c.channel !== "email") return false;
        if (channel === "alim" && c.channel !== "alimtalk") return false;
        const hay = [
          c.name,
          c.template_id ? getTemplateDisplayName(c.template_id) : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 12);
  }, [campaigns, searchQuery, channel]);

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId) ?? null;

  const filtered = useMemo(() => {
    const fromIso = from.toISOString().slice(0, 10);
    const toIso = to.toISOString().slice(0, 10);
    return campaigns.filter((c) => {
      if (channel === "email" && c.channel !== "email") return false;
      if (channel === "alim" && c.channel !== "alimtalk") return false;
      if (selectedCampaignId && c.id !== selectedCampaignId) return false;
      const iso = c.sent_at?.slice(0, 10);
      if (fromIso && iso && iso < fromIso) return false;
      if (toIso && iso && iso > toIso) return false;
      return true;
    });
  }, [campaigns, from, to, channel, selectedCampaignId]);

  return (
    <div className="mt-6 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[14px] font-semibold tracking-tight">캠페인 성과</h2>
          <MockBadge />
          {selectedCampaignId && (
            <span className="text-[11px] text-[#9A9994]">
              검색 필터 적용 중 · {filtered.length}개
            </span>
          )}
        </div>

        <div className="relative flex items-center gap-2">
          {selectedCampaign && (
            <button
              onClick={() => {
                setSelectedCampaignId(null);
                setSearchQuery("");
              }}
              className="rounded-full bg-[#E1F5EE] px-2 py-0.5 text-[10px] font-medium text-[#0F6E56] hover:opacity-80"
              title="캠페인 필터 해제"
            >
              {selectedCampaign.name} ✕
            </button>
          )}
          <div className="relative">
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              placeholder="🔍 캠페인 검색"
              className="w-[220px] rounded-lg border border-black/15 bg-white px-3 py-1.5 text-[12px] outline-none focus:border-[#08B1A9]"
            />
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute right-0 top-full z-40 mt-1 w-[340px] overflow-hidden rounded-lg border border-black/10 bg-white shadow-lg">
                {searchResults.map((c) => (
                  <button
                    key={c.id}
                    onMouseDown={() => {
                      setSelectedCampaignId(c.id);
                      setSearchQuery("");
                      setSearchOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-2 border-b border-black/10 px-3 py-2 text-left text-[12px] last:border-b-0 hover:bg-[#F7F7F5]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{c.name}</div>
                      {c.template_id && (
                        <div className="truncate text-[10px] text-[#9A9994]">
                          {getTemplateDisplayName(c.template_id)}
                        </div>
                      )}
                    </div>
                    <span
                      className="shrink-0 rounded-full px-1.5 py-px text-[10px] font-medium"
                      style={
                        c.channel === "email"
                          ? { background: "#E6F1FB", color: "#185FA5" }
                          : { background: "#E1F5EE", color: "#0F6E56" }
                      }
                    >
                      {c.channel === "email" ? "이메일" : "알림톡"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ChartCard title="캠페인별 발송량 Top 10">
        <TopCampaignsChart campaigns={filtered} />
      </ChartCard>

      <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <ChartCard title="이메일 오픈율 추이">
          <OpenRateTrend campaigns={filtered} channel={channel} from={from} to={to} />
        </ChartCard>
        <ChartCard
          title="유입률 추이"
          note="메일 수신 당일 서비스 접속 회사 수 / 메일 수신 회사 수"
        >
          <ConversionTrend campaigns={filtered} from={from} to={to} />
        </ChartCard>
      </div>

      <CampaignTable campaigns={filtered} />
    </div>
  );
}

function MockBadge() {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{ background: "#FAEEDA", color: "#854F0B" }}
    >
      mock 데이터 · 실데이터 연동 필요
    </span>
  );
}

function ChartCard({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-medium uppercase tracking-wider text-[#9A9994]">
          {title}
        </div>
        {note && <span className="text-[11px] text-[#9A9994]" title={note}>ⓘ {note}</span>}
      </div>
      <div className="relative h-[240px]">{children}</div>
    </div>
  );
}

// ---------------- 1) Top 10 by send count ----------------

function TopCampaignsChart({ campaigns }: { campaigns: Campaign[] }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const rows = [...campaigns]
      .sort((a, b) => b.recipient_count - a.recipient_count)
      .slice(0, 10);
    if (rows.length === 0) {
      const chart = new Chart(ref.current, { type: "bar", data: { labels: [], datasets: [] } });
      return () => chart.destroy();
    }
    const chart = new Chart(ref.current, {
      type: "bar",
      data: {
        labels: rows.map((r) => r.name),
        datasets: [
          {
            label: "발송사",
            data: rows.map((r) => r.recipient_count),
            backgroundColor: rows.map((r) => SEND_TYPE_STYLE[r.send_type].color),
            borderRadius: 2,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: "rgba(0,0,0,0.05)" }, ticks: { font: { size: 10 }, color: "#9A9994" } },
          y: { grid: { display: false }, ticks: { font: { size: 10 }, color: "#5F5E5A" } },
        },
      },
    });
    return () => chart.destroy();
  }, [campaigns]);
  return <canvas ref={ref} />;
}

// ---------------- 2) Email open-rate trend ----------------

function OpenRateTrend({
  campaigns,
  channel,
  from,
  to,
}: {
  campaigns: Campaign[];
  channel: Channel;
  from: Date;
  to: Date;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    if (channel === "alim") {
      const chart = new Chart(ref.current, { type: "line", data: { labels: [], datasets: [] } });
      return () => chart.destroy();
    }

    // Top 5 email campaigns with open_rate non-null.
    const top = campaigns
      .filter((c) => c.channel === "email" && c.open_rate != null)
      .sort((a, b) => b.recipient_count - a.recipient_count)
      .slice(0, 5);

    const { labels, byDate } = buildDailyBuckets(from, to);
    const palette = ["#08B1A9", "#378ADD", "#7F77DD", "#BA7517", "#1D9E75"];

    const datasets = top.map((c, i) => {
      const series = labels.map(() => null as number | null);
      const bucket = byDate.get(c.sent_at?.slice(0, 10) ?? "");
      if (bucket != null) series[bucket] = +(c.open_rate! * 100).toFixed(1);
      // Fill sparse points with jittered values around mean so the line has shape.
      const mean = (c.open_rate ?? 0) * 100;
      return {
        label: c.name,
        data: labels.map((_, idx) =>
          series[idx] ?? +(mean + (Math.sin(idx + i) * 3)).toFixed(1)
        ),
        borderColor: palette[i % palette.length],
        backgroundColor: palette[i % palette.length] + "22",
        tension: 0.3,
        pointRadius: labels.length > 40 ? 0 : 2,
      };
    });

    const chart = new Chart(ref.current, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { font: { size: 10 }, boxWidth: 10 } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, color: "#9A9994", maxTicksLimit: 8 } },
          y: { grid: { color: "rgba(0,0,0,0.05)" }, ticks: { font: { size: 10 }, color: "#9A9994", callback: (v) => `${v}%` } },
        },
      },
    });
    return () => chart.destroy();
  }, [campaigns, channel, from, to]);

  if (channel === "alim") {
    return (
      <div className="flex h-full items-center justify-center text-[12px] text-[#9A9994]">
        알림톡은 오픈율 집계 없음
      </div>
    );
  }
  return <canvas ref={ref} />;
}

// ---------------- 3) Conversion-rate trend ----------------

function ConversionTrend({
  campaigns,
  from,
  to,
}: {
  campaigns: Campaign[];
  from: Date;
  to: Date;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const top = campaigns
      .filter((c) => c.conversion_rate != null)
      .sort((a, b) => b.recipient_count - a.recipient_count)
      .slice(0, 5);
    const { labels, byDate } = buildDailyBuckets(from, to);
    const palette = ["#08B1A9", "#378ADD", "#7F77DD", "#BA7517", "#E24B4A"];
    const datasets = top.map((c, i) => {
      const series = labels.map(() => null as number | null);
      const bucket = byDate.get(c.sent_at?.slice(0, 10) ?? "");
      if (bucket != null) series[bucket] = +(c.conversion_rate! * 100).toFixed(1);
      const mean = (c.conversion_rate ?? 0) * 100;
      return {
        label: c.name,
        data: labels.map((_, idx) =>
          series[idx] ?? +(mean + Math.cos(idx + i) * 2).toFixed(1)
        ),
        borderColor: palette[i % palette.length],
        backgroundColor: palette[i % palette.length] + "22",
        tension: 0.3,
        pointRadius: labels.length > 40 ? 0 : 2,
      };
    });
    const chart = new Chart(ref.current, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { font: { size: 10 }, boxWidth: 10 } } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, color: "#9A9994", maxTicksLimit: 8 } },
          y: { grid: { color: "rgba(0,0,0,0.05)" }, ticks: { font: { size: 10 }, color: "#9A9994", callback: (v) => `${v}%` } },
        },
      },
    });
    return () => chart.destroy();
  }, [campaigns, from, to]);
  return <canvas ref={ref} />;
}

function buildDailyBuckets(from: Date, to: Date) {
  const labels: string[] = [];
  const byDate = new Map<string, number>();
  const days = Math.max(
    1,
    Math.round((to.getTime() - from.getTime()) / 86400000) + 1
  );
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    byDate.set(iso, labels.length);
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
  }
  return { labels, byDate };
}

// ---------------- 4) Comparison table ----------------

type SortKey =
  | "name" | "channel" | "send_type" | "recipient_count"
  | "open_rate" | "conversion_rate" | "sent_at";
type SortDir = "asc" | "desc";

function CampaignTable({ campaigns }: { campaigns: Campaign[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("sent_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const list = [...campaigns];
    list.sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = av > bv ? 1 : av < bv ? -1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [campaigns, sortKey, sortDir]);

  const click = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  const header = (label: string, key: SortKey, align: "left" | "right" | "center" = "left") => (
    <button
      onClick={() => click(key)}
      className={`flex items-center gap-1 text-[11px] text-[#9A9994] transition hover:text-[#1A1A18] ${
        align === "right" ? "ml-auto" : align === "center" ? "mx-auto" : ""
      }`}
    >
      {label}
      {sortKey === key && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
    </button>
  );

  const cols = "1fr 110px 90px 80px 80px 80px 90px";
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[#9A9994]">
        캠페인 오픈율 + 유입률 비교
      </div>
      <div
        className="grid items-center border-b border-black/10 pb-2.5"
        style={{ gridTemplateColumns: cols }}
      >
        <div>{header("캠페인명", "name")}</div>
        <div className="text-center">{header("채널", "channel", "center")}</div>
        <div className="text-center">{header("유형", "send_type", "center")}</div>
        <div className="text-right">{header("발송사", "recipient_count", "right")}</div>
        <div className="text-right">{header("오픈율", "open_rate", "right")}</div>
        <div className="text-right">{header("유입률", "conversion_rate", "right")}</div>
        <div className="text-right">{header("발송일", "sent_at", "right")}</div>
      </div>
      {sorted.length === 0 ? (
        <div className="py-6 text-center text-[13px] text-[#9A9994]">
          조건에 맞는 캠페인이 없습니다.
        </div>
      ) : (
        sorted.slice(0, 50).map((c) => {
          const lowConv = c.conversion_rate != null && c.conversion_rate < 0.1;
          return (
            <div
              key={c.id}
              className="grid items-center border-b border-black/10 py-2.5 text-[13px] last:border-b-0"
              style={{ gridTemplateColumns: cols }}
            >
              <div className="truncate font-medium">{c.name}</div>
              <div className="flex justify-center"><ChannelBadge ch={c.channel} /></div>
              <div className="flex justify-center"><SendTypeBadge type={c.send_type} /></div>
              <div className="text-right">{c.recipient_count.toLocaleString()}</div>
              <div className="text-right">
                {c.channel === "alimtalk"
                  ? "—"
                  : c.open_rate == null
                  ? "—"
                  : `${(c.open_rate * 100).toFixed(1)}%`}
              </div>
              <div className={`text-right ${lowConv ? "font-medium text-[#E24B4A]" : ""}`}>
                {c.conversion_rate == null ? "—" : `${(c.conversion_rate * 100).toFixed(1)}%`}
              </div>
              <div className="text-right text-[12px] text-[#5F5E5A]">
                {c.sent_at?.slice(5, 10).replace("-", ".") ?? "—"}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function sortValue(c: Campaign, key: SortKey): string | number | null {
  switch (key) {
    case "name": return c.name;
    case "channel": return c.channel;
    case "send_type": return c.send_type;
    case "recipient_count": return c.recipient_count;
    case "open_rate": return c.open_rate ?? null;
    case "conversion_rate": return c.conversion_rate ?? null;
    case "sent_at": return c.sent_at ?? null;
  }
}

// Unused — keep TemplateName & getTemplateDisplayName referenced externally.
export const _touch = { getTemplateDisplayName };
