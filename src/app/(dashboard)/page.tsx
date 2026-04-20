"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { Timetable } from "@/components/dashboard/Timetable";
import { CampaignPerformanceCharts } from "@/components/dashboard/CampaignPerformanceCharts";
import { getCampaigns, type Campaign } from "@/lib/campaigns";
import { SkuTag, ChannelBadge as ChBadge } from "@/components/common/Badges";
import { DateRangePicker, type DateRange } from "@/components/common/DateRangePicker";
import { TemplateName } from "@/lib/template-meta";
import {
  DASHBOARD_TODAY,
  PERIOD_DAYS,
  dashDataByPeriod,
  getTrendRange,
  pickPeriodSnapshot,
  skuMeta,
  chartColor,
  type Channel,
  type PeriodKey,
  type Sku,
} from "@/lib/dashboard-data";

const CHANNELS: { key: Channel; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "email", label: "이메일" },
  { key: "alim", label: "알림톡" },
];
const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "7d", label: "7일" },
  { key: "30d", label: "30일" },
  { key: "90d", label: "90일" },
];

const ChannelBadge = ({ ch }: { ch: "email" | "alim" }) => (
  <ChBadge ch={ch === "alim" ? "alimtalk" : "email"} />
);

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export default function DashboardPage() {
  const [channel, setChannel] = useState<Channel>("all");
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [range, setRange] = useState<DateRange | undefined>();
  const [skuFilter, setSkuFilter] = useState<Record<Sku, boolean>>({
    ai: true,
    fin: true,
    con: true,
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    void getCampaigns().then(setCampaigns);
  }, []);

  /** Resolved [from, to] — either from preset period or custom picker. */
  const { from, to, days, activeKey } = useMemo(() => {
    if (range?.from && range?.to) {
      const f = range.from;
      const t = range.to;
      const dd = Math.round((t.getTime() - f.getTime()) / 86400000) + 1;
      return { from: f, to: t, days: dd, activeKey: null as PeriodKey | null };
    }
    const dd = PERIOD_DAYS[period];
    return {
      from: addDays(DASHBOARD_TODAY, -(dd - 1)),
      to: DASHBOARD_TODAY,
      days: dd,
      activeKey: period,
    };
  }, [period, range]);

  const snapshotKey = activeKey ?? pickPeriodSnapshot(days);
  const base = dashDataByPeriod[snapshotKey][channel];
  const trend = useMemo(() => getTrendRange(from, to), [from, to]);
  const toggleSku = (s: Sku) => setSkuFilter((f) => ({ ...f, [s]: !f[s] }));

  /**
   * SKU-filtered derived data. Uses trendDaily totals in range as weights so
   * metrics, trend, openRates and campaigns all move together when the chips
   * toggle. When all three SKUs are on, everything falls back to `base`.
   */
  const d = useMemo(() => {
    const activeSkus = (["ai", "fin", "con"] as Sku[]).filter((s) => skuFilter[s]);
    const allOn = activeSkus.length === 3;

    // Weights from the current trend window.
    const totals: Record<Sku, number> = { ai: 0, fin: 0, con: 0 };
    for (const p of trend) {
      totals.ai += p.ai;
      totals.fin += p.fin;
      totals.con += p.con;
    }
    const grand = totals.ai + totals.fin + totals.con || 1;
    const activeSum = activeSkus.reduce((s, k) => s + totals[k], 0);
    const share = activeSum / grand;

    // Metrics
    const sendsNum = parseInt(base.sends.replace(/,/g, ""), 10) || 0;
    const scaledSends = Math.round(sendsNum * share).toLocaleString();

    // Weighted openRate + ctr from filtered openRates using trend-total weights.
    const filteredRates = base.openRates.filter((r) => activeSkus.includes(r.sku));
    const wSum = filteredRates.reduce((s, r) => s + totals[r.sku], 0) || 1;
    const weightedOpen =
      filteredRates.reduce((s, r) => s + r.pct * totals[r.sku], 0) / wSum;

    const openRates = filteredRates;
    const campaigns = base.campaigns.filter((c) => activeSkus.includes(c.sku));

    // Conversion (유입률) — alim has no conversion aggregation; empty selection → "—".
    const conversion =
      channel === "alim"
        ? "—"
        : activeSkus.length === 0
        ? "—"
        : base.ctr;

    // 추적 미수집 scales with selected SKU share so the filter visibly affects it.
    const trackingMissing =
      activeSkus.length === 0
        ? "0건"
        : allOn
        ? "3건"
        : `${Math.max(1, Math.round(3 * share))}건`;

    return {
      ...base,
      sends: allOn ? base.sends : activeSkus.length === 0 ? "0" : scaledSends,
      open: allOn
        ? base.open
        : activeSkus.length === 0
        ? "—"
        : `${weightedOpen.toFixed(1)}%`,
      ctr: conversion,
      trackingMissing,
      openRates,
      campaigns,
    };
  }, [base, skuFilter, trend, channel]);

  /** Trend chart: zero out series for deselected SKUs. */
  const filteredTrend = useMemo(
    () =>
      trend.map((p) => ({
        date: p.date,
        ai: skuFilter.ai ? p.ai : 0,
        fin: skuFilter.fin ? p.fin : 0,
        con: skuFilter.con ? p.con : 0,
      })),
    [trend, skuFilter]
  );

  const upCls = "text-[#1D9E75]";
  const downCls = "text-[#E24B4A]";

  return (
    <section>
      {/* Page header */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-[18px] font-semibold tracking-tight">대시보드</h1>
        <div className="flex items-center gap-2">
          {/* Channel filter */}
          <div className="flex overflow-hidden rounded-lg border border-black/15">
            {CHANNELS.map((c) => {
              const on = channel === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setChannel(c.key)}
                  className={`px-3.5 py-[5px] text-[12px] transition ${
                    on ? "bg-[#08B1A9] font-medium text-white" : "bg-white text-[#5F5E5A] hover:text-[#1A1A18]"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          <div className="h-4 w-px bg-black/10" />
          {PERIODS.map((p) => {
            const on = !range?.from && period === p.key;
            return (
              <button
                key={p.key}
                onClick={() => {
                  setRange(undefined);
                  setPeriod(p.key);
                }}
                className={`rounded-lg border px-3.5 py-1.5 text-[12px] transition ${
                  on
                    ? "border-[#08B1A9] bg-[#08B1A9] font-medium text-white"
                    : "border-black/15 bg-transparent text-[#5F5E5A] hover:bg-[#F7F7F5]"
                }`}
              >
                {p.label}
              </button>
            );
          })}
          <DateRangePicker
            value={range}
            onChange={setRange}
            anchor={DASHBOARD_TODAY}
          />
        </div>
      </div>

      {/* Metrics */}
      <div className="mb-5 grid grid-cols-4 gap-3">
        <Metric label="이번 달 총 발송" value={d.sends} sub={d.sendsSub} cls={d.sendsDir === "up" ? upCls : downCls} />
        <Metric label={d.openLabel} value={d.open} sub={d.openSub} cls={d.openDir === "up" ? upCls : downCls} />
        <Metric
          label="평균 유입률"
          value={d.ctr}
          sub={channel === "alim" ? "알림톡은 별도 집계" : d.ctrSub}
          cls={channel === "alim" ? "text-[#9A9994]" : d.ctrDir === "up" ? upCls : downCls}
        />
        <Link href="/warnings" className="block">
          <Metric
            label="추적 미수집"
            value={d.trackingMissing}
            valueCls="text-[#E24B4A]"
            sub="→ 워닝 확인"
            cls="text-[#E24B4A] cursor-pointer"
          />
        </Link>
      </div>

      {/* Channel hint */}
      {channel !== "all" && (
        <div className="mb-3 flex items-center gap-2">
          <ChannelBadge ch={channel} />
          <span className="text-[12px] text-[#9A9994]">
            {channel === "email"
              ? "오픈율 기준: 이메일 업계 평균 25~35%"
              : "수신율 기준: 알림톡 업계 평균 85~95% · CTR 기준: 20% 이상 양호"}
          </span>
        </div>
      )}

      {/* SKU filter chips */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {(["ai", "fin", "con"] as Sku[]).map((s) => {
          const m = skuMeta[s];
          const on = skuFilter[s];
          return (
            <button
              key={s}
              onClick={() => toggleSku(s)}
              className="flex items-center gap-1.5 rounded-full border px-3 py-[5px] text-[12px] transition"
              style={
                on
                  ? { background: m.tagBg, color: m.tagText, borderColor: m.tagBorder, fontWeight: 500 }
                  : { background: "#fff", color: "#5F5E5A", borderColor: "rgba(0,0,0,0.15)" }
              }
            >
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ background: chartColor[s] }}
              />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Timetable */}
      <Timetable />

      {/* Trend chart */}
      <div className="mb-3 rounded-xl border border-black/10 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#9A9994]">
            일별 발송량 추이
          </div>
          <div className="flex gap-4 text-[12px] text-[#5F5E5A]">
            {(["ai", "fin", "con"] as Sku[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: chartColor[s] }} />
                {skuMeta[s].label}
              </span>
            ))}
          </div>
        </div>
        <TrendChart data={filteredTrend} />
      </div>


      <CampaignPerformanceCharts
        campaigns={campaigns}
        from={from}
        to={to}
        channel={channel}
      />
    </section>
  );
}

function Metric({
  label,
  value,
  valueCls,
  sub,
  cls,
}: {
  label: string;
  value: string;
  valueCls?: string;
  sub: string;
  cls: string;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white px-5 py-4">
      <div className="mb-1.5 text-[12px] text-[#9A9994]">{label}</div>
      <div className={`text-[26px] font-semibold tracking-tight ${valueCls ?? "text-[#1A1A18]"}`}>
        {value}
      </div>
      <div className={`mt-1 text-[12px] ${cls}`}>{sub}</div>
    </div>
  );
}
