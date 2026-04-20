"use client";

/**
 * Template-level performance charts. All data is mock — swap the fixture
 * generators below for BigQuery aggregations when the send log is wired.
 */

import { useEffect, useMemo, useRef } from "react";
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
import { getTemplateDisplayName } from "@/lib/template-meta";

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
type Props = { from: Date; to: Date; channel: Channel };

const ALIM_COLOR = "#FEE500";
const EMAIL_COLOR = "#3C89F9";

function daysBetween(from: Date, to: Date) {
  return Math.max(
    1,
    Math.round((to.getTime() - from.getTime()) / 86400000) + 1
  );
}

function dateRangeLabels(from: Date, to: Date) {
  const days = daysBetween(from, to);
  const out: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    out.push(`${d.getMonth() + 1}/${d.getDate()}`);
  }
  return out;
}

// ---------------- Charts container ----------------

export function TemplatePerformanceCharts({ from, to, channel }: Props) {
  return (
    <div className="mt-6 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-[14px] font-semibold tracking-tight">템플릿별 성과</h2>
        <MockBadge />
      </div>

      <ChartCard title="템플릿별 발송량 Top 10">
        <TopTemplatesChart channel={channel} />
      </ChartCard>

      <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <ChartCard title="채널별 CTR 추이">
          <CtrTrendChart from={from} to={to} />
        </ChartCard>
        <ChartCard title="수신 실패율 추이" note="임계치 5% 초과 시 빨간 강조">
          <FailureRateChart from={from} to={to} channel={channel} />
        </ChartCard>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <ChartCard title="수신 거부율 추이" note="임계치 0.5%">
          <BounceRateChart from={from} to={to} channel={channel} />
        </ChartCard>
        <ChartCard title="직전 대비 발송 증감" note="전주 대비 %">
          <WoWDeltaChart channel={channel} />
        </ChartCard>
      </div>
    </div>
  );
}

function MockBadge() {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{ background: "#FAEEDA", color: "#854F0B" }}
      title="차트 데이터는 mock입니다. 실제 발송 로그 연동 전입니다."
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
        {note && <span className="text-[11px] text-[#9A9994]">{note}</span>}
      </div>
      <div className="relative h-[220px]">{children}</div>
    </div>
  );
}

// ---------------- 1) Top 10 sends (horizontal bar) ----------------

const TOP_TEMPLATES: { id: string; sends: { email: number; alim: number } }[] = [
  { id: "daily_report",          sends: { email: 0,    alim: 48200 } },
  { id: "first_scraping",        sends: { email: 2100, alim: 21300 } },
  { id: "welcome_company",       sends: { email: 6840, alim: 0    } },
  { id: "com_new_thread",        sends: { email: 0,    alim: 12400 } },
  { id: "data_connection_d1",    sends: { email: 5200, alim: 0    } },
  { id: "off-notice-1st",        sends: { email: 0,    alim: 8800  } },
  { id: "com_reply_thread",      sends: { email: 0,    alim: 6300  } },
  { id: "user_1_year_expired",   sends: { email: 3400, alim: 0    } },
  { id: "payroll_notice",        sends: { email: 0,    alim: 2900  } },
  { id: "report_monday1",        sends: { email: 0,    alim: 2180  } },
];

function TopTemplatesChart({ channel }: { channel: Channel }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const rows = TOP_TEMPLATES.map((r) => ({
      id: r.id,
      email: r.sends.email,
      alim: r.sends.alim,
      total:
        channel === "email" ? r.sends.email :
        channel === "alim" ? r.sends.alim :
        r.sends.email + r.sends.alim,
    }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const chart = new Chart(ref.current, {
      type: "bar",
      data: {
        labels: rows.map((r) => getTemplateDisplayName(r.id)),
        datasets: [
          ...(channel !== "alim"
            ? [{ label: "이메일", data: rows.map((r) => r.email), backgroundColor: EMAIL_COLOR, borderRadius: 2 }]
            : []),
          ...(channel !== "email"
            ? [{ label: "알림톡", data: rows.map((r) => r.alim), backgroundColor: ALIM_COLOR, borderRadius: 2 }]
            : []),
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { font: { size: 10 }, boxWidth: 10 } } },
        scales: {
          x: { stacked: true, grid: { color: "rgba(0,0,0,0.05)" }, ticks: { font: { size: 10 }, color: "#9A9994" } },
          y: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 }, color: "#5F5E5A" } },
        },
      },
    });
    return () => chart.destroy();
  }, [channel]);
  return <canvas ref={ref} />;
}

// ---------------- 2) CTR trend ----------------

function CtrTrendChart({ from, to }: { from: Date; to: Date }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const labels = dateRangeLabels(from, to);
    const n = labels.length;
    const email = labels.map((_, i) => +(7 + Math.sin(i / 4) * 2.5 + Math.random() * 1.2).toFixed(1));
    const alim = labels.map((_, i) => +(22 + Math.cos(i / 5) * 3 + Math.random() * 1.5).toFixed(1));

    const chart = new Chart(ref.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "이메일", data: email, borderColor: EMAIL_COLOR, backgroundColor: EMAIL_COLOR + "33", tension: 0.3, pointRadius: n > 30 ? 0 : 2 },
          { label: "알림톡", data: alim, borderColor: "#E0B800", backgroundColor: ALIM_COLOR + "55", tension: 0.3, pointRadius: n > 30 ? 0 : 2 },
        ],
      },
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
  }, [from, to]);
  return <canvas ref={ref} />;
}

// ---------------- 3) Failure rate ----------------

function FailureRateChart({ from, to, channel }: { from: Date; to: Date; channel: Channel }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const labels = dateRangeLabels(from, to);
    const email = labels.map((_, i) => +(3 + Math.sin(i / 3) * 2 + Math.random()).toFixed(2));
    const alim = labels.map((_, i) => +(2 + Math.cos(i / 4) * 1.5 + Math.random()).toFixed(2));
    const threshold = 5;

    const make = (data: number[], color: string, label: string) => ({
      label,
      data,
      borderColor: color,
      backgroundColor: color + "22",
      pointBackgroundColor: data.map((v) => (v > threshold ? "#E24B4A" : color)),
      pointRadius: labels.length > 30 ? 0 : 3,
      tension: 0.3,
    });

    const datasets = [];
    if (channel !== "alim") datasets.push(make(email, EMAIL_COLOR, "이메일"));
    if (channel !== "email") datasets.push(make(alim, "#E0B800", "알림톡"));

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
          y: {
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: { font: { size: 10 }, color: "#9A9994", callback: (v) => `${v}%` },
          },
        },
      },
      plugins: [referenceLine(threshold, "#E24B4A")],
    });
    return () => chart.destroy();
  }, [from, to, channel]);
  return <canvas ref={ref} />;
}

// ---------------- 4) Bounce rate ----------------

function BounceRateChart({ from, to, channel }: { from: Date; to: Date; channel: Channel }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const labels = dateRangeLabels(from, to);
    const email = labels.map((_, i) => +(0.4 + Math.sin(i / 3) * 0.3 + Math.random() * 0.2).toFixed(3));
    const alim = labels.map((_, i) => +(0.2 + Math.cos(i / 4) * 0.15 + Math.random() * 0.1).toFixed(3));
    const threshold = 0.5;

    const datasets = [];
    if (channel !== "alim") datasets.push({ label: "이메일", data: email, borderColor: EMAIL_COLOR, backgroundColor: EMAIL_COLOR + "22", tension: 0.3, pointRadius: labels.length > 30 ? 0 : 2 });
    if (channel !== "email") datasets.push({ label: "알림톡", data: alim, borderColor: "#E0B800", backgroundColor: ALIM_COLOR + "55", tension: 0.3, pointRadius: labels.length > 30 ? 0 : 2 });

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
      plugins: [referenceLine(threshold, "#9A9994")],
    });
    return () => chart.destroy();
  }, [from, to, channel]);
  return <canvas ref={ref} />;
}

// ---------------- 5) Week-over-week delta ----------------

const WOW_TEMPLATES: { id: string; channel: "email" | "alim"; delta: number }[] = [
  { id: "daily_report",        channel: "alim",  delta:  18.2 },
  { id: "welcome_company",     channel: "email", delta:  34.1 },
  { id: "first_scraping",      channel: "alim",  delta:  -8.4 },
  { id: "off-notice-1st",      channel: "alim",  delta:  -22.7 },
  { id: "user_1_year_expired", channel: "email", delta:   5.3 },
  { id: "com_new_thread",      channel: "alim",  delta:  12.0 },
  { id: "data_connection_d1",  channel: "email", delta: -14.6 },
  { id: "payroll_notice",      channel: "alim",  delta:   2.1 },
];

function WoWDeltaChart({ channel }: { channel: Channel }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const rows = WOW_TEMPLATES.filter(
      (r) => channel === "all" || r.channel === (channel === "alim" ? "alim" : "email")
    ).sort((a, b) => b.delta - a.delta);

    const chart = new Chart(ref.current, {
      type: "bar",
      data: {
        labels: rows.map((r) => getTemplateDisplayName(r.id)),
        datasets: [
          {
            label: "전주 대비 %",
            data: rows.map((r) => r.delta),
            backgroundColor: rows.map((r) => (r.delta >= 0 ? "#1D9E75" : "#E24B4A")),
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
          x: {
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: { font: { size: 10 }, color: "#9A9994", callback: (v) => `${v}%` },
          },
          y: { grid: { display: false }, ticks: { font: { size: 10 }, color: "#5F5E5A" } },
        },
      },
    });
    return () => chart.destroy();
  }, [channel]);
  return <canvas ref={ref} />;
}

// ---------------- Reference-line plugin ----------------

function referenceLine(value: number, color: string) {
  return {
    id: `ref-line-${value}`,
    afterDraw(chart: Chart) {
      const y = chart.scales.y?.getPixelForValue(value);
      if (y == null) return;
      const { left, right } = chart.chartArea;
      const ctx = chart.ctx;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = "10px sans-serif";
      ctx.fillText(`${value}%`, right - 28, y - 4);
      ctx.restore();
    },
  };
}
