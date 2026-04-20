"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from "chart.js";
import { chartColor, type TrendPoint } from "@/lib/dashboard-data";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    chartRef.current?.destroy();
    const labels = data.map((p) => {
      const [, m, d] = p.date.split("-");
      return `${Number(m)}/${Number(d)}`;
    });
    chartRef.current = new Chart(ref.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "클로브AI",    data: data.map((p) => p.ai),  backgroundColor: chartColor.ai,  borderRadius: 2, barPercentage: 0.7 },
          { label: "클로브금융",  data: data.map((p) => p.fin), backgroundColor: chartColor.fin, borderRadius: 2, barPercentage: 0.7 },
          { label: "클로브커넥트", data: data.map((p) => p.con), backgroundColor: chartColor.con, borderRadius: 2, barPercentage: 0.7 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 12, color: "#9A9994" } },
          y: {
            stacked: true,
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: { font: { size: 10 }, color: "#9A9994", callback: (v) => Math.round(Number(v) / 1000) + "k" },
          },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [data]);

  return (
    <div className="relative h-[180px]">
      <canvas ref={ref} />
    </div>
  );
}
