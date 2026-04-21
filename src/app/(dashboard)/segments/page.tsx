"use client";

import { useEffect, useState } from "react";
import {
  SEGMENT_TYPES,
  addSegment,
  buildSegmentLabel,
  completeSegment,
  getSegments,
  type ConsentFilter,
  type Segment,
  type SegmentType,
} from "@/lib/segments";

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  useEffect(() => setSegments(getSegments()), []);

  // Form state
  const [type, setType] = useState<SegmentType>("no_data_connection");
  const [monthMode, setMonthMode] = useState<"all" | "month">("month");
  const [month, setMonth] = useState("2026-03");
  const [consent, setConsent] = useState<ConsentFilter>("all");
  const [creating, setCreating] = useState(false);

  const meta = SEGMENT_TYPES.find((s) => s.value === type)!;

  const handleCreate = () => {
    const refMonth = monthMode === "all" ? null : month;
    const label = buildSegmentLabel(type, refMonth, consent);
    const id = `seg-${Date.now()}`;
    const seg: Segment = {
      id,
      type,
      referenceMonth: refMonth,
      consent,
      companyCount: 0,
      userCount: 0,
      status: "pending",
      createdAt: new Date().toISOString(),
      label,
    };
    addSegment(seg);
    setSegments(getSegments());
    setCreating(true);

    setTimeout(() => {
      const mockCompany = Math.floor(Math.random() * 2000) + 50;
      const mockUser = Math.floor(mockCompany * (1.4 + Math.random() * 1.2));
      completeSegment(id, mockCompany, mockUser);
      setSegments(getSegments());
      setCreating(false);
    }, 3000);
  };

  return (
    <section>
      <h1 className="mb-5 text-[18px] font-semibold tracking-tight">세그먼트</h1>

      {/* Create form */}
      <div className="mb-6 rounded-xl border border-black/10 bg-white p-5">
        <div className="mb-4 text-[11px] font-medium uppercase tracking-wider text-[#9A9994]">
          세그먼트 생성
        </div>

        <div className="grid items-start gap-5" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {/* Left */}
          <div>
            <Field label="세그먼트 유형">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as SegmentType)}
                className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-[13px] outline-none focus:border-[#08B1A9]"
              >
                {SEGMENT_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <div className="mt-2 rounded-lg bg-[#F7F7F5] px-3 py-2 text-[12px] leading-relaxed text-[#5F5E5A]">
                <div className="font-medium text-[#1A1A18]">{meta.currentBasis}</div>
                <div className="mt-0.5 text-[11px] text-[#9A9994]">
                  기준 시점 변수: {meta.timeLabel}
                </div>
              </div>
            </Field>

            <Field label="마케팅 수신동의">
              <div className="flex gap-3">
                {(["all", "agreed"] as ConsentFilter[]).map((c) => (
                  <label key={c} className="flex cursor-pointer items-center gap-1.5 text-[13px]">
                    <input
                      type="radio"
                      name="consent"
                      checked={consent === c}
                      onChange={() => setConsent(c)}
                      className="accent-[#08B1A9]"
                    />
                    {c === "all" ? "전체 (동의+미동의)" : "동의만"}
                  </label>
                ))}
              </div>
            </Field>
          </div>

          {/* Right */}
          <div>
            <Field label={meta.timeLabel}>
              <div className="flex flex-col gap-2">
                <label className="flex cursor-pointer items-center gap-1.5 text-[13px]">
                  <input
                    type="radio"
                    name="monthMode"
                    checked={monthMode === "all"}
                    onChange={() => setMonthMode("all")}
                    className="accent-[#08B1A9]"
                  />
                  전체 기간
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-[13px]">
                  <input
                    type="radio"
                    name="monthMode"
                    checked={monthMode === "month"}
                    onChange={() => setMonthMode("month")}
                    className="accent-[#08B1A9]"
                  />
                  특정 월 선택
                  <input
                    type="month"
                    value={month}
                    onChange={(e) => {
                      setMonth(e.target.value);
                      setMonthMode("month");
                    }}
                    className="rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-[#08B1A9]"
                  />
                </label>
                <div className="mt-1 text-[11px] text-[#9A9994]">
                  선택한 월에 해당 시점을 완료한 대상으로 모수를 좁힙니다.
                </div>
              </div>
            </Field>

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex items-center gap-2 rounded-lg border border-[#08B1A9] bg-[#08B1A9] px-5 py-2 text-[13px] font-medium text-white hover:bg-[#0F6E56] disabled:opacity-50"
              >
                {creating && <Spinner />}
                {creating ? "쿼리 실행 중..." : "세그먼트 생성"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Segment list */}
      <div className="rounded-xl border border-black/10 bg-white p-5">
        <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-[#9A9994]">
          생성된 세그먼트 ({segments.length}개)
        </div>
        <div
          className="grid items-center border-b border-black/10 pb-2.5 text-[11px] text-[#9A9994]"
          style={{ gridTemplateColumns: "1fr 100px 90px 90px 90px 80px" }}
        >
          <div>세그먼트</div>
          <div className="text-center">수신동의</div>
          <div className="text-right">회사 수</div>
          <div className="text-right">유저 수</div>
          <div className="text-right">생성일시</div>
          <div className="text-center">상태</div>
        </div>
        {segments.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-[#9A9994]">
            생성된 세그먼트가 없습니다.
          </div>
        ) : (
          segments.map((seg) => {
            const typeMeta = SEGMENT_TYPES.find((s) => s.value === seg.type);
            return (
              <div
                key={seg.id}
                className="grid items-center border-b border-black/10 py-3 text-[13px] last:border-b-0"
                style={{ gridTemplateColumns: "1fr 100px 90px 90px 90px 80px" }}
              >
                <div>
                  <div className="font-medium">{seg.label}</div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span
                      className="rounded-full px-2 py-px text-[10px] font-medium"
                      style={{ background: "#E6F1FB", color: "#185FA5" }}
                    >
                      {typeMeta?.label}
                    </span>
                    {seg.referenceMonth && (
                      <span className="text-[11px] text-[#9A9994]">
                        {seg.referenceMonth} {typeMeta?.timeLabel} 기준
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-center text-[12px]">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={
                      seg.consent === "agreed"
                        ? { background: "#E1F5EE", color: "#0F6E56" }
                        : { background: "#F7F7F5", color: "#5F5E5A" }
                    }
                  >
                    {seg.consent === "agreed" ? "동의만" : "전체"}
                  </span>
                </div>
                <div className="text-right font-medium">
                  {seg.status === "done" ? `${(seg.companyCount ?? 0).toLocaleString()}개사` : "—"}
                </div>
                <div className="text-right text-[12px] text-[#5F5E5A]">
                  {seg.status === "done" ? `${(seg.userCount ?? 0).toLocaleString()}명` : "—"}
                </div>
                <div className="text-right text-[11px] text-[#9A9994]">
                  {seg.createdAt.slice(5, 10).replace("-", ".")}
                </div>
                <div className="flex justify-center">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={
                      seg.status === "done"
                        ? { background: "#E1F5EE", color: "#0F6E56" }
                        : { background: "#FAEEDA", color: "#854F0B" }
                    }
                  >
                    {seg.status === "done" ? "완료" : "생성중"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3.5">
      <div className="mb-1.5 text-[12px] font-medium text-[#5F5E5A]">{label}</div>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
  );
}
