"use client";

import { useEffect, useState } from "react";
import { mockHolidays2026, type Holiday } from "@/lib/mock-data";
import {
  DEFAULT_EMAIL_LAYOUTS,
  NHN_CONSOLE_URL,
  loadLayouts,
  saveLayouts,
  type EmailLayoutMapping,
} from "@/lib/email-layouts";

export default function SettingsPage() {
  const [cap, setCap] = useState(3);
  const [weekendBlock, setWeekendBlock] = useState(true);
  const [holidayBlock, setHolidayBlock] = useState(true);
  const [holidays, setHolidays] = useState<Holiday[]>(mockHolidays2026);
  const [newDate, setNewDate] = useState("");
  const [newName, setNewName] = useState("");
  const [layouts, setLayouts] = useState<EmailLayoutMapping[]>(DEFAULT_EMAIL_LAYOUTS);
  useEffect(() => setLayouts(loadLayouts()), []);
  const updateLayout = (skuId: string, field: "headerTemplateId" | "footerTemplateId", value: string) => {
    setLayouts((ls) => {
      const next = ls.map((l) => (l.skuId === skuId ? { ...l, [field]: value } : l));
      saveLayouts(next);
      return next;
    });
  };

  const addHoliday = () => {
    if (!newDate || !newName.trim()) {
      alert("날짜와 공휴일명을 모두 입력하세요.");
      return;
    }
    if (holidays.find((h) => h.date === newDate)) {
      alert("이미 등록된 날짜입니다.");
      return;
    }
    setHolidays((hs) =>
      [...hs, { date: newDate, name: newName.trim() }].sort((a, b) =>
        a.date.localeCompare(b.date)
      )
    );
    setNewDate("");
    setNewName("");
  };

  return (
    <section>
      <div className="mb-5">
        <h1 className="text-[18px] font-semibold tracking-tight">설정</h1>
      </div>

      {/* 발송 정책 */}
      <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-[#9A9994]">
        발송 정책
      </div>
      <div className="mb-5 rounded-xl border border-black/10 bg-white p-5">
        <PolicyRow
          title="유저당 일 발송 상한 (Daily Cap)"
          desc={
            <>
              한 명의 수신자가 하루에 받을 수 있는 이메일 최대 수를 제한합니다.
              <br />
              상한 초과 시 해당 발송은 <strong>다음 영업일</strong>로 자동 지연됩니다.
            </>
          }
          control={
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] text-[#5F5E5A]">하루 최대</span>
              <div className="flex items-center overflow-hidden rounded-lg border border-black/15 bg-white">
                <button
                  onClick={() => setCap((v) => Math.max(1, v - 1))}
                  className="h-9 w-8 text-[16px] text-[#5F5E5A] hover:bg-[#F7F7F5]"
                >
                  −
                </button>
                <span className="min-w-7 text-center text-[18px] font-semibold">
                  {cap}
                </span>
                <button
                  onClick={() => setCap((v) => Math.min(10, v + 1))}
                  className="h-9 w-8 text-[16px] text-[#5F5E5A] hover:bg-[#F7F7F5]"
                >
                  +
                </button>
              </div>
              <span className="text-[13px] text-[#5F5E5A]">통</span>
            </div>
          }
        />

        <div className="my-5 border-t border-black/10" />

        <PolicyRow
          title="주말 발송 금지"
          desc={
            <>
              토요일·일요일에는 이메일을 발송하지 않습니다.
              <br />
              주말에 예약되거나 트리거된 발송은 <strong>다음 영업일(월요일)</strong>로 자동
              지연됩니다.
            </>
          }
          control={<Toggle on={weekendBlock} onToggle={() => setWeekendBlock((v) => !v)} />}
        />

        <div className="my-5 border-t border-black/10" />

        <PolicyRow
          title="공휴일 발송 금지"
          desc={
            <>
              등록된 공휴일에는 이메일을 발송하지 않습니다.
              <br />
              공휴일에 예약되거나 트리거된 발송은 <strong>다음 영업일</strong>로 자동 지연됩니다.
            </>
          }
          control={<Toggle on={holidayBlock} onToggle={() => setHolidayBlock((v) => !v)} />}
        />
      </div>

      {/* 정책 요약 */}
      <div
        className="mb-5 rounded-xl border px-5 py-3.5 text-[13px] leading-relaxed"
        style={{ background: "#E1F5EE", borderColor: "#5DCAA5", color: "#0F6E56" }}
      >
        <strong>현재 적용 정책</strong>
        <br />· 유저당 하루 최대 <strong>{cap}통</strong> 발송
        <br />
        {weekendBlock
          ? "· 토·일 발송 금지 — 초과 시 다음 평일로 지연"
          : "· 주말 발송 허용"}
        <br />
        {holidayBlock
          ? "· 공휴일 발송 금지 — 초과 시 다음 영업일로 지연"
          : "· 공휴일 발송 허용"}
      </div>

      {/* 공휴일 관리 */}
      <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-[#9A9994]">
        공휴일 관리
      </div>
      <div className="rounded-xl border border-black/10 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-[13px] text-[#5F5E5A]">
            2026년 등록된 공휴일 ·{" "}
            <span className="font-medium text-[#1A1A18]">{holidays.length}</span>일
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-40 rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-[#08B1A9]"
            />
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="공휴일명 (예: 대체공휴일)"
              className="w-44 rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-[#08B1A9]"
            />
            <button
              onClick={addHoliday}
              className="rounded-lg border border-[#08B1A9] bg-[#08B1A9] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#0F6E56]"
            >
              + 추가
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {holidays.map((h, i) => (
            <div
              key={h.date}
              className="flex items-center justify-between rounded-lg border border-black/10 bg-white px-3 py-2"
            >
              <div>
                <div className="text-[12px] font-medium">{h.name}</div>
                <div className="mt-0.5 text-[11px] text-[#9A9994]">{h.date}</div>
              </div>
              <button
                onClick={() => setHolidays((hs) => hs.filter((_, idx) => idx !== i))}
                className="rounded px-1.5 text-[13px] text-[#9A9994] hover:text-[#E24B4A]"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 이메일 레이아웃 관리 */}
      <div className="mt-6 mb-3 text-[11px] font-medium uppercase tracking-wider text-[#9A9994]">
        이메일 레이아웃 관리
      </div>
      <div className="rounded-xl border border-black/10 bg-white p-5">
        <div className="mb-4 text-[12px] leading-relaxed text-[#5F5E5A]">
          스큐별 이메일 헤더·푸터 템플릿 ID입니다. 실제 HTML은{" "}
          <a
            href={NHN_CONSOLE_URL}
            target="_blank"
            rel="noreferrer"
            className="text-[#08B1A9] underline"
          >
            NHN 콘솔
          </a>
          에서 수정하세요. 여기서는 매핑만 관리합니다.
        </div>
        <div className="flex flex-col gap-3">
          {layouts.map((l) => (
            <div
              key={l.skuId}
              className="rounded-lg border border-black/10 p-4"
              style={{ borderLeft: `3px solid ${l.primaryColor}` }}
            >
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ background: l.primaryColor }}
                />
                <span className="text-[13px] font-medium">{l.name}</span>
                <span className="font-mono text-[10px] text-[#9A9994]">({l.skuId})</span>
              </div>
              <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div>
                  <div className="mb-1 text-[11px] text-[#9A9994]">headerTemplateId</div>
                  <input
                    value={l.headerTemplateId}
                    onChange={(e) =>
                      updateLayout(l.skuId, "headerTemplateId", e.target.value)
                    }
                    className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 font-mono text-[12px] outline-none focus:border-[#08B1A9]"
                  />
                </div>
                <div>
                  <div className="mb-1 text-[11px] text-[#9A9994]">footerTemplateId</div>
                  <input
                    value={l.footerTemplateId}
                    onChange={(e) =>
                      updateLayout(l.skuId, "footerTemplateId", e.target.value)
                    }
                    className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 font-mono text-[12px] outline-none focus:border-[#08B1A9]"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PolicyRow({
  title,
  desc,
  control,
}: {
  title: string;
  desc: React.ReactNode;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="mb-1 text-[14px] font-semibold">{title}</div>
        <div className="text-[12px] leading-relaxed text-[#5F5E5A]">{desc}</div>
      </div>
      <div className="ml-10">{control}</div>
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative h-5 w-[34px] rounded-full transition"
      style={{ background: on ? "#08B1A9" : "#D3D1C7" }}
    >
      <span
        className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
        style={{ left: on ? 16 : 2 }}
      />
    </button>
  );
}
