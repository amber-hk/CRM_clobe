"use client";

import { useMemo, useState } from "react";
import { SkuTag } from "@/components/common/Badges";
import {
  skuMeta,
  ttSchedules,
  weekDays,
  type Sku,
  type Timeslot,
} from "@/lib/dashboard-data";

const markerColor: Record<Sku, string> = {
  ai: "#1D9E75",
  fin: "#185FA5",
  con: "#534AB7",
};

type TipState = {
  slot: Timeslot;
  x: number;
  y: number;
};

export function Timetable() {
  const [filters, setFilters] = useState<Record<Sku, boolean>>({ ai: true, fin: true, con: true });
  const [tip, setTip] = useState<TipState | null>(null);

  const hours = useMemo(() => {
    const s = new Set<number>();
    ttSchedules.forEach((x) => s.add(x.hour));
    return [...s].sort((a, b) => a - b);
  }, []);

  const toggle = (sku: Sku) => setFilters((f) => ({ ...f, [sku]: !f[sku] }));

  return (
    <div className="mb-3 rounded-xl border border-black/10 bg-white p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <div className="text-[11px] font-medium uppercase tracking-wider text-[#9A9994]">
          이번 주 발송 타임테이블
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3.5 text-[11px] text-[#5F5E5A]">
            {(["ai", "fin", "con"] as Sku[]).map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: markerColor[s] }} />
                {skuMeta[s].label}
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border-2 border-dashed border-[#aaa]" />
              예정
            </div>
          </div>
          <div className="flex gap-1.5">
            {(["ai", "fin", "con"] as Sku[]).map((s) => {
              const m = skuMeta[s];
              const on = filters[s];
              return (
                <button
                  key={s}
                  onClick={() => toggle(s)}
                  className="rounded-full border px-2.5 py-1 text-[11px] font-medium transition"
                  style={
                    on
                      ? { background: m.tagBg, color: m.tagText, borderColor: m.tagBorder }
                      : { background: "#fff", color: "#5F5E5A", borderColor: "rgba(0,0,0,0.15)" }
                  }
                >
                  {s === "ai" ? "AI" : s === "fin" ? "Finance" : "Connect"}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-[54px] border-b border-black/10 pb-2.5 text-left text-[11px] font-normal text-[#9A9994]" />
              {weekDays.map((d) => (
                <th
                  key={d.date}
                  className={`border-b border-black/10 pb-2.5 text-center text-[11px] font-normal ${
                    d.today ? "font-semibold text-[#08B1A9]" : "text-[#9A9994]"
                  }`}
                >
                  {d.label} {d.date}
                  {d.today && (
                    <span className="ml-1 rounded bg-[#08B1A9] px-1.5 py-px text-[9px] font-medium text-white">
                      오늘
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((h) => (
              <tr key={h}>
                <td className="h-[42px] px-1 py-1 text-left font-mono text-[11px] text-[#ccc]">
                  {String(h).padStart(2, "0")}:00
                </td>
                {weekDays.map((d, dayIdx) => {
                  const items = ttSchedules.filter(
                    (s) => s.day === dayIdx && s.hour === h && filters[s.sku]
                  );
                  return (
                    <td
                      key={d.date}
                      className="h-[42px] px-1 py-1 text-center align-middle"
                      style={d.today ? { background: "rgba(8,177,169,0.04)" } : undefined}
                    >
                      {items.length > 0 && (
                        <div className="flex flex-col items-center gap-[3px]">
                          {items.map((s, i) => (
                            <span
                              key={i}
                              onMouseEnter={(e) =>
                                setTip({ slot: s, x: e.clientX, y: e.clientY })
                              }
                              onMouseMove={(e) =>
                                setTip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t))
                              }
                              onMouseLeave={() => setTip(null)}
                              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition hover:scale-110"
                              style={
                                s.type === "done"
                                  ? { background: markerColor[s.sku] }
                                  : {
                                      background: "transparent",
                                      border: `2px dashed ${markerColor[s.sku]}`,
                                    }
                              }
                            />
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tip && (
        <div
          className="pointer-events-none fixed z-[9999] min-w-[180px] rounded-lg bg-[#1a1a18] px-3 py-2.5 text-[11px] leading-relaxed text-white shadow-lg"
          style={{ left: tip.x + 14, top: tip.y - 12 }}
        >
          <div className="mb-1">
            <SkuTag sku={tip.slot.sku} />
          </div>
          <div className="mb-0.5 text-[12px] font-semibold">{tip.slot.name}</div>
          <div className="text-[#bbb]">
            {tip.slot.count} · {tip.slot.trigger} ·{" "}
            {tip.slot.type === "done" ? "완료" : "예정"}
          </div>
        </div>
      )}
    </div>
  );
}
