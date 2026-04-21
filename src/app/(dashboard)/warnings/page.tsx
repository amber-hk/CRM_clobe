"use client";

import { useMemo, useState } from "react";
import { ChannelBadge, SkuTag } from "@/components/common/Badges";
import { TemplateName } from "@/lib/template-meta";
import {
  mockAlimErrors,
  mockCtrWarnings,
  mockDormantTemplates,
  mockTrackingWarnings,
  type AlimError,
  type AlimErrorKind,
} from "@/lib/mock-data";

export default function WarningsPage() {
  const [threshold, setThreshold] = useState(10);
  const [appliedThreshold, setApplied] = useState(10);
  const [ctrRows, setCtrRows] = useState(mockCtrWarnings);
  const [pendingOff, setPendingOff] = useState<number | null>(null);

  const failing = useMemo(
    () =>
      ctrRows
        .map((r, idx) => ({ r, idx }))
        .filter(({ r }) => r.sends > 0 && r.ctr < appliedThreshold),
    [ctrRows, appliedThreshold]
  );

  const dormant = mockDormantTemplates.filter((t) => t.sends7d / 7 < 3);
  const alimErrors = mockAlimErrors;
  const totalWarnings =
    failing.length +
    mockTrackingWarnings.length +
    dormant.length +
    alimErrors.length;
  const pendingRow = pendingOff !== null ? ctrRows[pendingOff] : null;

  return (
    <section>
      <div className="mb-5 flex items-center">
        <h1 className="flex items-center gap-2 text-[18px] font-semibold tracking-tight">
          워닝
          <span className="rounded-full bg-[#E24B4A] px-2 py-0.5 text-[13px] font-semibold text-white">
            {totalWarnings}
          </span>
        </h1>
      </div>

      {/* CTR 미달 */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#9A9994]">
            CTR 미달 자동화
          </div>
          <span className="rounded-full bg-[#E24B4A] px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {failing.length}
          </span>
          <span className="text-[11px] text-[#9A9994]">
            · 지난 1주일 기준 · 기준 CTR {appliedThreshold}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#5F5E5A]">기준 CTR</span>
          <div className="flex overflow-hidden rounded-lg border border-black/15 bg-white">
            <input
              type="number"
              min={1}
              max={100}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value) || 0)}
              className="w-[52px] bg-transparent px-2 py-1 text-center text-[13px] outline-none"
            />
            <span className="pr-2 py-1 text-[12px] text-[#5F5E5A]">%</span>
          </div>
          <button
            onClick={() => setApplied(threshold)}
            className="rounded-lg border border-black/15 bg-transparent px-3.5 py-1.5 text-[12px] text-[#5F5E5A] hover:bg-[#F7F7F5]"
          >
            적용
          </button>
        </div>
      </div>

      <div className="mb-6 overflow-hidden rounded-xl border border-black/10 bg-white">
        <div
          className="grid border-b border-black/10 bg-[#F7F7F5] px-5 py-2.5 text-[11px] text-[#9A9994]"
          style={{ gridTemplateColumns: "1fr 100px 80px 80px 80px 110px" }}
        >
          <div>자동화명</div>
          <div className="text-center">제품</div>
          <div className="text-right">발송</div>
          <div className="text-right">CTR</div>
          <div className="text-right">기준 대비</div>
          <div className="text-center">조치</div>
        </div>

        {failing.length === 0 ? (
          <div className="px-5 py-6 text-center text-[13px] text-[#9A9994]">
            CTR {appliedThreshold}% 미달 자동화가 없습니다.
          </div>
        ) : (
          failing.map(({ r, idx }) => {
            const diff = (r.ctr - appliedThreshold).toFixed(1);
            const isOff = r.status === "off";
            return (
              <div
                key={idx}
                className={`grid items-center border-b border-black/10 px-5 py-3 last:border-b-0 ${
                  isOff ? "opacity-50" : ""
                }`}
                style={{ gridTemplateColumns: "1fr 100px 80px 80px 80px 110px" }}
              >
                <div>
                  <div className="text-[13px] font-medium">{r.name}</div>
                  <div className="mt-0.5 text-[11px] text-[#9A9994]">
                    {r.kind === "time" ? "시간 기반" : "조건 기반"}
                  </div>
                </div>
                <div className="flex justify-center">
                  <SkuTag sku={r.sku} />
                </div>
                <div className="text-right text-[13px] text-[#5F5E5A]">
                  {r.sends.toLocaleString()}
                </div>
                <div className="text-right text-[13px] font-medium text-[#E24B4A]">
                  {r.ctr}%
                </div>
                <div className="text-right text-[13px] text-[#E24B4A]">{diff}%p</div>
                <div className="flex justify-center">
                  {isOff ? (
                    <span className="text-[12px] font-medium text-[#9A9994]">
                      OFF 완료
                    </span>
                  ) : (
                    <button
                      onClick={() => setPendingOff(idx)}
                      className="rounded-lg border border-[#E24B4A] bg-[#E24B4A] px-3 py-1 text-[12px] font-medium text-white hover:opacity-90"
                    >
                      OFF 요청
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 추적 미수집 */}
      <div className="mb-3 flex items-center gap-2">
        <div className="text-[11px] font-medium uppercase tracking-wider text-[#9A9994]">
          추적 미수집
        </div>
        <span className="rounded-full bg-[#E24B4A] px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {mockTrackingWarnings.length}
        </span>
        <span className="text-[11px] text-[#9A9994]">
          · 발송 완료됐지만 오픈/클릭 데이터 없음
        </span>
      </div>

      {mockTrackingWarnings.map((w, i) => (
        <div
          key={i}
          className="mb-2.5 rounded-xl border p-4"
          style={{ background: "#FAEEDA", borderColor: "#EF9F27" }}
        >
          <div className="mb-1 flex flex-wrap items-center gap-2 text-[13px] font-medium text-[#412402]">
            {w.title}
            <SkuTag sku={w.sku} />
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ background: "#EF9F27", color: "#412402" }}
            >
              {w.pill}
            </span>
          </div>
          <div className="text-[12px] leading-relaxed text-[#633806]">{w.description}</div>
          <div className="mt-2.5 flex gap-1.5">
            <button className="rounded-lg border border-black/15 bg-transparent px-3 py-1 text-[12px] text-[#5F5E5A] hover:bg-black/5">
              원인 확인
            </button>
            <button className="rounded-lg border border-black/15 bg-transparent px-3 py-1 text-[12px] text-[#5F5E5A] hover:bg-black/5">
              무시
            </button>
          </div>
        </div>
      ))}

      {/* 휴면 템플릿 */}
      <div className="mt-6 mb-3 flex items-center gap-2">
        <div className="text-[11px] font-medium uppercase tracking-wider text-[#9A9994]">
          휴면 템플릿
        </div>
        <span className="rounded-full bg-[#E24B4A] px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {dormant.length}
        </span>
        <span className="text-[11px] text-[#9A9994]">
          · 최근 7일 일 평균 3건 미만 발송
        </span>
      </div>
      <div className="mb-3 rounded-lg bg-[#F7F7F5] px-3 py-2 text-[11px] text-[#9A9994]">
        ℹ️ 실제 발송 데이터 연동 전까지 mock 기반으로 표시됩니다.
      </div>
      {dormant.length === 0 ? (
        <div className="rounded-xl border border-black/10 bg-white px-4 py-6 text-center text-[13px] text-[#9A9994]">
          휴면 템플릿이 없습니다.
        </div>
      ) : (
        <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
          {dormant.map((d) => {
            const avg = (d.sends7d / 7).toFixed(1);
            return (
              <div
                key={d.id}
                className="rounded-xl border border-black/10 bg-white p-4"
                style={{ borderLeft: "3px solid #BA7517" }}
              >
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <div className="text-[13px] font-medium"><TemplateName id={d.name} /></div>
                  <ChannelBadge ch={d.channel} />
                  <SkuTag sku={d.sku} />
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{ background: "#FAEEDA", color: "#854F0B" }}
                  >
                    휴면 가능성
                  </span>
                </div>
                <div className="text-[12px] text-[#5F5E5A]">
                  최근 7일 발송{" "}
                  <strong className="text-[#1A1A18]">{d.sends7d}건</strong>
                  <span className="ml-2 text-[#9A9994]">(일 평균 {avg}건)</span>
                </div>
                <div className="mt-2.5 flex gap-1.5">
                  <button className="rounded-lg border border-black/15 bg-transparent px-3 py-1 text-[12px] text-[#5F5E5A] hover:bg-[#F7F7F5]">
                    템플릿 열기
                  </button>
                  <button className="rounded-lg border border-black/15 bg-transparent px-3 py-1 text-[12px] text-[#5F5E5A] hover:bg-[#F7F7F5]">
                    무시
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 알림톡 발송 오류 */}
      <div className="mt-6 mb-3 flex items-center gap-2">
        <div className="text-[11px] font-medium uppercase tracking-wider text-[#9A9994]">
          알림톡 발송 오류
        </div>
        <span className="rounded-full bg-[#E24B4A] px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {alimErrors.length}
        </span>
        <span className="text-[11px] text-[#9A9994]">
          · 발송 실패 / 수신 실패 / 열람률 저하
        </span>
      </div>
      <div className="mb-3 rounded-lg bg-[#F7F7F5] px-3 py-2 text-[11px] text-[#9A9994]">
        ℹ️ 실제 발송 데이터 연동 전까지 mock 기준으로 표시됩니다.
      </div>
      <div className="flex flex-col gap-2.5">
        {alimErrors.map((err) => (
          <AlimErrorCard key={err.id} error={err} />
        ))}
      </div>

      {/* OFF 확인 모달 */}
      {pendingRow && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40"
          onClick={() => setPendingOff(null)}
        >
          <div
            className="w-[90%] max-w-[400px] rounded-xl border border-black/10 bg-white p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 text-[16px] font-semibold">자동화 중단 요청</div>
            <div className="mb-1.5 text-[13px] text-[#5F5E5A]">
              다음 자동화를 OFF 하시겠습니까?
            </div>
            <div className="mb-5 rounded-lg bg-[#F7F7F5] px-3.5 py-2.5 text-[14px] font-medium">
              {pendingRow.name}
            </div>
            <div className="mb-5 text-[12px] text-[#BA7517]">
              ⚠️ OFF 이후 해당 자동화는 발송을 중단합니다. 자동화 탭에서 다시 ON 할 수 있습니다.
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPendingOff(null)}
                className="rounded-lg border border-black/15 bg-transparent px-4 py-2 text-[13px] text-[#5F5E5A] hover:bg-[#F7F7F5]"
              >
                취소
              </button>
              <button
                onClick={() => {
                  setCtrRows((rs) =>
                    rs.map((r, idx) => (idx === pendingOff ? { ...r, status: "off" } : r))
                  );
                  setPendingOff(null);
                }}
                className="rounded-lg border border-[#E24B4A] bg-[#E24B4A] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90"
              >
                OFF 요청
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const ALIM_ERROR_STYLE: Record<
  AlimErrorKind,
  { label: string; bg: string; fg: string; cardBorder: string }
> = {
  send_fail:    { label: "발송 실패",   bg: "#FCEBEB", fg: "#A32D2D", cardBorder: "#E24B4A" },
  receive_fail: { label: "수신 실패",   bg: "#FAEEDA", fg: "#854F0B", cardBorder: "#EF9F27" },
  low_read:     { label: "열람률 저하", bg: "#FEF9C3", fg: "#854F0B", cardBorder: "#FACC15" },
};

function AlimErrorCard({ error: e }: { error: AlimError }) {
  const s = ALIM_ERROR_STYLE[e.kind];
  return (
    <div
      className="rounded-xl border bg-white p-4"
      style={{ borderColor: "rgba(0,0,0,0.1)", borderLeft: `3px solid ${s.cardBorder}` }}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ background: s.bg, color: s.fg }}
        >
          {s.label}
        </span>
        <div className="text-[13px] font-medium">
          <TemplateName id={e.templateName} />
        </div>
        <SkuTag sku={e.sku} />
        <span className="font-mono text-[10px] text-[#9A9994]">{e.templateCode}</span>
      </div>

      <div className="mb-2 text-[12px] leading-relaxed text-[#5F5E5A]">
        {e.description}
      </div>

      <div className="mb-2.5 flex flex-wrap items-center gap-3 text-[12px] text-[#5F5E5A]">
        <span>{e.sentAt} 발송</span>
        <span>전체 {e.totalCount.toLocaleString()}건</span>
        {e.failCount > 0 && (
          <span className={e.failRate > 0.05 ? "font-medium text-[#E24B4A]" : ""}>
            실패 {e.failCount.toLocaleString()}건 ({(e.failRate * 100).toFixed(1)}%)
            {e.failRate > 0.05 && " · 임계치 5% 초과"}
          </span>
        )}
        {e.nhnResultCode && (
          <span className="font-mono text-[11px] text-[#9A9994]">
            NHN code: {e.nhnResultCode}
          </span>
        )}
      </div>

      <div className="flex gap-1.5">
        <button className="rounded-lg border border-black/15 bg-transparent px-3 py-1 text-[12px] text-[#5F5E5A] hover:bg-[#F7F7F5]">
          원인 확인
        </button>
        <button className="rounded-lg border border-black/15 bg-transparent px-3 py-1 text-[12px] text-[#5F5E5A] hover:bg-[#F7F7F5]">
          무시
        </button>
      </div>
    </div>
  );
}
