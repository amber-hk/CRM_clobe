"use client";

import { useEffect, useRef, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { ko } from "date-fns/locale";
import "react-day-picker/style.css";

export type { DateRange };

export function DateRangePicker({
  value,
  onChange,
  anchor = DASHBOARD_TODAY_DEFAULT,
}: {
  value: DateRange | undefined;
  onChange: (r: DateRange | undefined) => void;
  /** "Today" anchor; defaults to real today. */
  anchor?: Date;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const label =
    value?.from && value?.to
      ? `${fmt(value.from)} ~ ${fmt(value.to)}`
      : value?.from
      ? `${fmt(value.from)} ~`
      : "날짜 선택";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`rounded-lg border border-black/15 px-3.5 py-1.5 text-[12px] transition ${
          value?.from
            ? "bg-[#E1F5EE] font-medium text-[#0F6E56]"
            : "bg-transparent text-[#5F5E5A] hover:bg-[#F7F7F5]"
        }`}
      >
        📅 {label}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 rounded-xl border border-black/10 bg-white p-3 shadow-lg">
          <DayPicker
            mode="range"
            locale={ko}
            numberOfMonths={2}
            defaultMonth={value?.from ?? anchor}
            selected={value}
            onSelect={onChange}
            disabled={{ after: anchor }}
            captionLayout="dropdown"
          />
          <div className="mt-2 flex justify-between border-t border-black/10 pt-2">
            <button
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
              className="text-[12px] text-[#9A9994] hover:text-[#E24B4A]"
            >
              초기화
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg border border-[#08B1A9] bg-[#08B1A9] px-3.5 py-1 text-[12px] font-medium text-white hover:bg-[#0F6E56]"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const DASHBOARD_TODAY_DEFAULT = new Date();

function fmt(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}
