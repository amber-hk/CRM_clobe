"use client";

import { useEffect, useState } from "react";
import { ChannelBadge, SkuTag } from "@/components/common/Badges";
import { DateRangePicker, type DateRange } from "@/components/common/DateRangePicker";
import { SendTypeBadge } from "@/components/common/SendTypeBadge";
import { skuMeta, chartColor, DASHBOARD_TODAY, pendingReasonLabel } from "@/lib/dashboard-data";
import { mockPendingSends, type PendingSend } from "@/lib/mock-data";
import { getCampaigns, type Campaign } from "@/lib/campaigns";
import { TemplateName } from "@/lib/template-meta";
import type { Sku } from "@/types/crm";

type Tab = "done" | "pending";

export default function HistoryPage() {
  const [tab, setTab] = useState<Tab>("done");
  const [filters, setFilters] = useState<Record<Sku, boolean>>({ ai: true, fin: true, con: true });
  const [range, setRange] = useState<DateRange | undefined>();
  const [pending, setPending] = useState<PendingSend[]>(mockPendingSends);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    void getCampaigns().then(setCampaigns);
  }, []);

  const toggle = (s: Sku) => setFilters((f) => ({ ...f, [s]: !f[s] }));

  const skuOfCampaign = (c: Campaign): Sku | null => {
    if (c.sku_id === "clobe-ai") return "ai";
    if (c.sku_id === "clobe-finance") return "fin";
    if (c.sku_id === "clobe-connect") return "con";
    return null;
  };

  const from = range?.from?.toISOString().slice(0, 10);
  const to = range?.to?.toISOString().slice(0, 10);

  const doneRows = campaigns.filter((c) => {
    const s = skuOfCampaign(c);
    if (s && !filters[s]) return false;
    const iso = c.sent_at?.slice(0, 10);
    if (from && iso && iso < from) return false;
    if (to && iso && iso > to) return false;
    return true;
  });

  const pendingRows = pending.filter((r) => filters[r.sku]);
  const cancel = (id: string) => setPending((rs) => rs.filter((r) => r.id !== id));

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-[18px] font-semibold tracking-tight">발송이력</h1>
        <div className="flex items-center gap-2">
          <DateRangePicker value={range} onChange={setRange} anchor={DASHBOARD_TODAY} />
          <div className="h-4 w-px bg-black/10" />
          <div className="flex gap-1.5">
            {(["ai", "fin", "con"] as Sku[]).map((s) => {
              const m = skuMeta[s];
              const on = filters[s];
              return (
                <button
                  key={s}
                  onClick={() => toggle(s)}
                  className="flex items-center gap-1.5 rounded-full border px-3 py-[5px] text-[12px] transition"
                  style={
                    on
                      ? { background: m.tagBg, color: m.tagText, borderColor: m.tagBorder, fontWeight: 500 }
                      : { background: "#fff", color: "#5F5E5A", borderColor: "rgba(0,0,0,0.15)" }
                  }
                >
                  <span className="inline-block h-3 w-3 rounded-full" style={{ background: chartColor[s] }} />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mb-4 flex border-b border-black/10">
        <TabButton on={tab === "done"} onClick={() => setTab("done")} label="완료" count={doneRows.length} />
        <TabButton on={tab === "pending"} onClick={() => setTab("pending")} label="대기 중" count={pendingRows.length} />
      </div>

      {tab === "done" ? (
        <DoneTable rows={doneRows} skuOf={skuOfCampaign} />
      ) : (
        <PendingTable rows={pendingRows} onCancel={cancel} />
      )}
    </section>
  );
}

function TabButton({
  on,
  onClick,
  label,
  count,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 border-b-2 px-5 py-2.5 text-[13px] transition ${
        on ? "border-[#08B1A9] font-medium text-[#1A1A18]" : "border-transparent text-[#5F5E5A] hover:text-[#1A1A18]"
      }`}
    >
      {label}
      <span
        className="rounded-full px-1.5 py-px text-[10px] font-medium"
        style={
          on
            ? { background: "#E1F5EE", color: "#0F6E56" }
            : { background: "#F7F7F5", color: "#9A9994" }
        }
      >
        {count}
      </span>
    </button>
  );
}

function DoneTable({ rows, skuOf }: { rows: Campaign[]; skuOf: (c: Campaign) => Sku | null }) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = rows.find((c) => c.id === detailId) ?? null;
  const cols = "80px 1fr 60px 70px 70px 70px 65px 65px 65px";
  return (
    <div className="rounded-xl border border-black/10 bg-white p-5">
      <div
        className="grid items-center border-b border-black/10 pb-2.5 text-[11px] text-[#9A9994]"
        style={{ gridTemplateColumns: cols }}
      >
        <div>발송일</div>
        <div>캠페인</div>
        <div className="text-center">채널</div>
        <div className="text-right">발송</div>
        <div className="text-right">수신</div>
        <div className="text-right">수신실패율</div>
        <div className="text-right">오픈율</div>
        <div className="text-right">유입률</div>
        <div className="text-center">상세</div>
      </div>
      {rows.length === 0 ? (
        <div className="py-6 text-center text-[13px] text-[#9A9994]">
          해당 조건의 발송 기록이 없습니다.
        </div>
      ) : (
        rows.map((c) => {
          const failRate =
            c.delivered_count > 0
              ? (c.delivered_count - (c.received_count ?? c.delivered_count)) / c.delivered_count
              : 0;
          const failCls = failRate > 0.05 ? "text-[#E24B4A] font-medium" : "";
          const convCls =
            c.conversion_rate == null ? "" : c.conversion_rate < 0.1 ? "text-[#E24B4A]" : "";
          return (
            <div
              key={c.id}
              className="grid cursor-pointer items-center border-b border-black/10 py-3 text-[13px] last:border-b-0 hover:bg-[#F7F7F5]"
              style={{ gridTemplateColumns: cols }}
              onClick={() => setDetailId(c.id)}
            >
              <div className="text-[12px] text-[#5F5E5A]">
                {c.sent_at?.slice(5, 10).replace("-", ".") ?? "—"}
              </div>
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <SendTypeBadge type={c.send_type} />
                  <ChannelBadge ch={c.channel} />
                </div>
              </div>
              <div className="flex justify-center"><ChannelBadge ch={c.channel} /></div>
              <div className="text-right">{(c.recipient_count ?? 0).toLocaleString()}</div>
              <div className="text-right">{(c.received_count ?? 0).toLocaleString()}</div>
              <div className={`text-right ${failCls}`}>
                {failRate > 0 ? `${(failRate * 100).toFixed(1)}%` : "0%"}
                {c.bounce && failRate > 0 && (
                  <div className="flex justify-end gap-0.5 mt-0.5">
                    {c.bounce.hard > 0 && <span title="Hard Bounce" className="text-[9px] text-[#E24B4A]">H{c.bounce.hard}</span>}
                    {c.bounce.soft > 0 && <span title="Soft Bounce" className="text-[9px] text-[#BA7517]">S{c.bounce.soft}</span>}
                    {c.bounce.spam > 0 && <span title="스팸 차단" className="text-[9px] text-[#534AB7]">✉{c.bounce.spam}</span>}
                  </div>
                )}
              </div>
              <div className="text-right">
                {c.open_rate == null ? "—" : `${(c.open_rate * 100).toFixed(1)}%`}
              </div>
              <div className={`text-right ${convCls}`}>
                {c.conversion_rate == null ? "—" : `${(c.conversion_rate * 100).toFixed(1)}%`}
              </div>
              <div className="flex justify-center">
                <button className="text-[11px] text-[#08B1A9] hover:underline">상세</button>
              </div>
            </div>
          );
        })
      )}

      {detail && <CampaignDetailModal campaign={detail} onClose={() => setDetailId(null)} />}
    </div>
  );
}

function CampaignDetailModal({ campaign: c, onClose }: { campaign: Campaign; onClose: () => void }) {
  const failCount = (c.delivered_count ?? 0) - (c.received_count ?? 0);
  const failRate = c.delivered_count > 0 ? failCount / c.delivered_count : 0;
  const steps = [
    { label: "발송 요청", count: c.recipient_count ?? 0, color: "#5F5E5A" },
    { label: "발송 성공", count: c.delivered_count ?? 0, color: "#185FA5" },
    { label: "수신 성공", count: c.received_count ?? 0, color: "#0F6E56" },
  ];
  if (c.channel === "email" && c.open_rate != null) {
    steps.push({
      label: "열람",
      count: Math.round((c.received_count ?? 0) * c.open_rate),
      color: "#08B1A9",
    });
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-[90%] max-w-[520px] rounded-xl border border-black/10 bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="text-[16px] font-semibold">{c.name}</div>
          <button onClick={onClose} className="text-[#9A9994] hover:text-[#1A1A18]">✕</button>
        </div>

        <div className="mb-4 text-[11px] font-medium uppercase tracking-wider text-[#9A9994]">
          발송 → 수신 → 열람 퍼널
        </div>
        <div className="mb-4 flex items-end gap-1">
          {steps.map((s, i) => {
            const maxCount = steps[0].count || 1;
            const pct = Math.max(10, (s.count / maxCount) * 100);
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="text-[12px] font-semibold" style={{ color: s.color }}>
                  {s.count.toLocaleString()}
                </div>
                <div className="w-full rounded" style={{ height: pct * 1.5, background: s.color, opacity: 0.2 }} />
                <div className="w-full rounded" style={{ height: pct * 1.5, background: s.color, marginTop: -pct * 1.5 }} />
                <div className="text-[10px] text-[#9A9994]">{s.label}</div>
              </div>
            );
          })}
        </div>

        {c.channel === "email" && c.bounce && (
          <div className="mb-4">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[#9A9994]">
              수신 실패 상세 ({failCount}건 · {(failRate * 100).toFixed(1)}%)
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-black/10 px-3 py-2 text-center">
                <div className="text-[14px] font-semibold text-[#E24B4A]">{c.bounce.hard}</div>
                <div className="text-[10px] text-[#9A9994]">Hard Bounce</div>
                <div className="text-[9px] text-[#9A9994]">주소 없음</div>
              </div>
              <div className="rounded-lg border border-black/10 px-3 py-2 text-center">
                <div className="text-[14px] font-semibold text-[#BA7517]">{c.bounce.soft}</div>
                <div className="text-[10px] text-[#9A9994]">Soft Bounce</div>
                <div className="text-[9px] text-[#9A9994]">메일함 초과 등</div>
              </div>
              <div className="rounded-lg border border-black/10 px-3 py-2 text-center">
                <div className="text-[14px] font-semibold text-[#534AB7]">{c.bounce.spam}</div>
                <div className="text-[10px] text-[#9A9994]">스팸 차단</div>
                <div className="text-[9px] text-[#9A9994]">네이트/카카오 등</div>
              </div>
            </div>
          </div>
        )}

        {c.channel === "alimtalk" && failCount > 0 && (
          <div className="mb-4 rounded-lg bg-[#F7F7F5] px-3 py-2.5 text-[12px] text-[#5F5E5A]">
            알림톡 수신 실패 <strong className="text-[#E24B4A]">{failCount}건</strong> ({(failRate * 100).toFixed(1)}%)
            <div className="mt-0.5 text-[11px] text-[#9A9994]">카카오 미가입, 채널 차��� 등</div>
          </div>
        )}

        <div className="flex justify-end">
          <button onClick={onClose} className="rounded-lg border border-black/15 bg-transparent px-4 py-2 text-[13px] text-[#5F5E5A] hover:bg-[#F7F7F5]">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

function PendingTable({
  rows,
  onCancel,
}: {
  rows: PendingSend[];
  onCancel: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-5">
      <div
        className="grid items-center border-b border-black/10 pb-2.5 text-[11px] text-[#9A9994]"
        style={{ gridTemplateColumns: "130px 1fr 70px 130px 90px 110px 80px" }}
      >
        <div>발송 예정일시</div>
        <div>캠페인명</div>
        <div className="text-center">채널</div>
        <div>제품</div>
        <div className="text-right">예정 수</div>
        <div className="text-center">대기 사유</div>
        <div className="text-center">조치</div>
      </div>
      {rows.length === 0 ? (
        <div className="py-6 text-center text-[13px] text-[#9A9994]">대기 중인 발송이 없습니다.</div>
      ) : (
        rows.map((r) => {
          const reason = pendingReasonLabel[r.reason];
          return (
            <div
              key={r.id}
              className="grid items-center border-b border-black/10 py-3 text-[13px] last:border-b-0"
              style={{ gridTemplateColumns: "130px 1fr 70px 130px 90px 110px 80px" }}
            >
              <div className="text-[12px] text-[#5F5E5A]">{r.scheduledAt}</div>
              <div className="font-medium"><TemplateName id={r.campaignName} /></div>
              <div className="flex justify-center"><ChannelBadge ch={r.channel} /></div>
              <div><SkuTag sku={r.sku} /></div>
              <div className="text-right">~{r.expectedCount.toLocaleString()}</div>
              <div className="flex justify-center">
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{ background: reason.bg, color: reason.fg }}
                >
                  {reason.label}
                </span>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => onCancel(r.id)}
                  className="rounded-lg border border-black/15 bg-transparent px-3 py-1 text-[12px] text-[#E24B4A] transition hover:bg-[#FCEBEB]"
                >
                  취소
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
