"use client";

import { useEffect, useMemo, useState } from "react";
import { ChannelBadge, SkuTag } from "@/components/common/Badges";
import {
  SEND_TYPES,
  loadCampaignMap,
  type CampaignMapEntry,
  type SendType,
} from "@/lib/campaign-map";
import { normalizeTemplateId } from "@/lib/template-id";
import { TemplateName } from "@/lib/template-meta";
import type { AutomationItem } from "@/types/crm";

const EMAIL_TEMPLATES = [
  "신기능 출시 안내",
  "세금 신고 리마인더",
  "월간 뉴스레터",
  "팩토링 만기 안내",
];

export function AutomationView({ initial }: { initial: AutomationItem[] }) {
  const [rows, setRows] = useState(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const toggle = (id: string) =>
    setRows((rs) =>
      rs.map((r) => (r.id === id ? { ...r, status: r.status === "on" ? "off" : "on" } : r))
    );

  const [campaignMap, setCampaignMap] = useState<Record<string, CampaignMapEntry>>({});
  useEffect(() => {
    void loadCampaignMap().then(setCampaignMap);
  }, []);

  const sendTypeOf = (item: AutomationItem): SendType | null => {
    const key = item.nhnName || item.id || "";
    if (!key) return null;
    return campaignMap[normalizeTemplateId(key)]?.send_type ?? null;
  };

  const grouped = useMemo(() => {
    const buckets: Record<SendType | "unset", AutomationItem[]> = {
      triggered: [],
      user_setting: [],
      user_ping: [],
      unset: [],
    };
    for (const r of rows) {
      // Deactivated templates are hidden from the automation surface.
      const entry = campaignMap[normalizeTemplateId(r.nhnName || r.id)];
      if (entry?.is_active === false) continue;
      const t = sendTypeOf(r);
      buckets[t ?? "unset"].push(r);
    }
    return buckets;
  }, [rows, campaignMap]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-[18px] font-semibold tracking-tight">자동화</h1>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#9A9994]">
            NHN Cloud에서 불러온 자동화 목록
          </span>
          <button
            onClick={() => alert("NHN Cloud API에서 최신 목록을 불러왔습니다.")}
            className="rounded-lg border border-black/15 bg-transparent px-3.5 py-1.5 text-[12px] text-[#5F5E5A] transition hover:bg-[#F7F7F5]"
          >
            ↻ 새로고침
          </button>
        </div>
      </div>

      <div className="grid items-start gap-4" style={{ gridTemplateColumns: "1fr 360px" }}>
        <div className="flex flex-col gap-3">
          {SEND_TYPES.map((meta) => (
            <SendTypeAccordion
              key={meta.value}
              meta={meta}
              rows={grouped[meta.value]}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onToggle={toggle}
            />
          ))}
          <SendTypeAccordion
            meta={{
              value: "unset" as const,
              label: "미분류",
              desc: "템플릿 관리 페이지에서 send_type을 지정하세요",
              color: "#854F0B",
              bg: "#FAEEDA",
            }}
            rows={grouped.unset}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onToggle={toggle}
          />
        </div>

        {selected && (
          <div className="sticky top-6">
            <SidePanel
              automation={selected}
              onClose={() => setSelectedId(null)}
              onDisplayNameChange={(name) =>
                setRows((rs) => rs.map((r) => (r.id === selected.id ? { ...r, displayName: name } : r)))
              }
              onTemplateCodeChange={(code) =>
                setRows((rs) => rs.map((r) => (r.id === selected.id ? { ...r, templateCode: code || null } : r)))
              }
            />
          </div>
        )}
      </div>
    </section>
  );
}

type AccordionMeta = {
  value: SendType | "unset";
  label: string;
  desc: string;
  color: string;
  bg: string;
};

function SendTypeAccordion({
  meta,
  rows,
  selectedId,
  onSelect,
  onToggle,
}: {
  meta: AccordionMeta;
  rows: AutomationItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#F7F7F5]"
      >
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{ background: meta.bg, color: meta.color }}
          >
            {meta.label}
          </span>
          <span className="text-[12px] text-[#9A9994]">{meta.desc}</span>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-[#5F5E5A]">
          <span>{rows.length}개</span>
          <span className="text-[#9A9994]">{open ? "▾" : "▸"}</span>
        </div>
      </button>
      {open && rows.length === 0 && (
        <div className="border-t border-black/10 px-4 py-6 text-center text-[12px] text-[#9A9994]">
          이 발송유형으로 분류된 자동화가 없습니다.
        </div>
      )}
      {open && rows.length > 0 && <SimpleAutomationRows rows={rows} selectedId={selectedId} onSelect={onSelect} onToggle={onToggle} />}
    </div>
  );
}

function SimpleAutomationRows({
  rows,
  selectedId,
  onSelect,
  onToggle,
}: {
  rows: AutomationItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const cols = "1fr 110px 1fr 70px 60px";
  return (
    <div>
      <div
        className="grid border-y border-black/10 bg-[#F7F7F5] px-4 py-2 text-[11px] text-[#9A9994]"
        style={{ gridTemplateColumns: cols }}
      >
        <div>표시 이름 / NHN 원본명</div>
        <div className="text-center">채널</div>
        <div>트리거</div>
        <div className="text-center">발송</div>
        <div className="text-center">상태</div>
      </div>
      {rows.map((r) => {
        const isSel = r.id === selectedId;
        return (
          <div
            key={r.id}
            onClick={() => onSelect(r.id)}
            className={`grid cursor-pointer items-center border-b border-black/10 px-4 py-3 transition last:border-b-0 ${
              isSel ? "bg-[#E1F5EE]" : "hover:bg-[#F7F7F5]"
            }`}
            style={{ gridTemplateColumns: cols }}
          >
            <div>
              <div className="text-[13px] font-medium"><TemplateName id={r.nhnName || r.id} /></div>
              <div className="mt-0.5 truncate font-mono text-[11px] text-[#9A9994]">
                {r.nhnName}
              </div>
            </div>
            <div className="flex justify-center gap-1">
              {r.channels.map((c) => (
                <ChannelBadge key={c} ch={c} />
              ))}
            </div>
            <div className="text-[12px] text-[#5F5E5A]">{r.trigger}</div>
            <div className="text-center text-[12px] text-[#5F5E5A]">
              {r.kind === "time"
                ? r.sentCount?.toLocaleString() ?? "—"
                : r.todayCount != null
                ? `${r.todayCount}명`
                : "—"}
            </div>
            <div className="flex justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(r.id);
                }}
                className="relative h-5 w-[34px] rounded-full transition"
                style={{ background: r.status === "on" ? "#08B1A9" : "#D3D1C7" }}
              >
                <span
                  className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
                  style={{ left: r.status === "on" ? 16 : 2 }}
                />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function _AutomationTableUnused({
  rows,
  kind,
  selectedId,
  onSelect,
  onToggle,
}: {
  rows: AutomationItem[];
  kind: "time" | "condition";
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const cols =
    kind === "time"
      ? "1fr 110px 90px 80px 60px"
      : "1fr 110px 120px 90px 60px";

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
      <div
        className="grid border-b border-black/10 bg-[#F7F7F5] px-4 py-2.5 text-[11px] text-[#9A9994]"
        style={{ gridTemplateColumns: cols }}
      >
        <div>표시 이름 / NHN 원본명</div>
        <div className="text-center">채널</div>
        <div className="text-center">
          {kind === "time" ? "마지막 발송" : "트리거 조건"}
        </div>
        <div className="text-center">
          {kind === "time" ? "발송 수" : "오늘 발송"}
        </div>
        <div className="text-center">상태</div>
      </div>
      {rows.map((r) => {
        const isSelected = r.id === selectedId;
        return (
          <div
            key={r.id}
            onClick={() => onSelect(r.id)}
            className={`grid cursor-pointer items-center border-b border-black/10 px-4 py-3 transition last:border-b-0 ${
              isSelected ? "bg-[#E1F5EE]" : "hover:bg-[#F7F7F5]"
            }`}
            style={{ gridTemplateColumns: cols }}
          >
            <div>
              <div className="text-[13px] font-medium"><TemplateName id={r.nhnName || r.id} /></div>
              <div className="mt-0.5 text-[11px] text-[#9A9994]">
                NHN: {r.nhnName} · {r.trigger}
              </div>
            </div>
            <div className="flex justify-center gap-1">
              {r.channels.map((c) => (
                <ChannelBadge key={c} ch={c} />
              ))}
            </div>
            <div className="text-center text-[12px] text-[#5F5E5A]">
              {kind === "time" ? (
                r.lastSentAt
              ) : (
                <span
                  className="rounded-full px-2 py-0.5 text-[11px]"
                  style={{ background: "#E1F5EE", color: "#0F6E56" }}
                >
                  {r.triggerTag}
                </span>
              )}
            </div>
            <div
              className={`text-center text-[13px] ${
                kind === "condition" ? "font-medium" : ""
              } ${r.todayCount === 0 ? "text-[#9A9994]" : ""}`}
            >
              {kind === "time"
                ? r.sentCount?.toLocaleString()
                : `${r.todayCount}명`}
            </div>
            <div className="flex justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(r.id);
                }}
                className="relative h-5 w-[34px] rounded-full transition"
                style={{ background: r.status === "on" ? "#08B1A9" : "#D3D1C7" }}
              >
                <span
                  className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
                  style={{ left: r.status === "on" ? 16 : 2 }}
                />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SidePanel({
  automation: a,
  onClose,
  onDisplayNameChange,
  onTemplateCodeChange,
}: {
  automation: AutomationItem;
  onClose: () => void;
  onDisplayNameChange: (name: string) => void;
  onTemplateCodeChange: (code: string) => void;
}) {
  const [emailTpl, setEmailTpl] = useState(EMAIL_TEMPLATES[1]);

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
      <div className="flex items-center justify-between border-b border-black/10 px-4 py-3.5">
        <div className="text-[13px] font-semibold">{a.displayName}</div>
        <button
          onClick={onClose}
          className="px-1 text-[16px] text-[#9A9994] hover:text-[#1A1A18]"
        >
          ✕
        </button>
      </div>

      {/* NHN readonly */}
      <div className="border-b border-black/10 bg-[#F7F7F5] px-4 py-3.5">
        <div className="mb-2.5 text-[10px] font-medium uppercase tracking-wider text-[#9A9994]">
          NHN Cloud · 읽기전용
        </div>
        <div className="grid gap-1.5 text-[12px]" style={{ gridTemplateColumns: "80px 1fr" }}>
          <div className="text-[#9A9994]">원본명</div>
          <div className="font-mono text-[#5F5E5A]">{a.nhnName}</div>
          <div className="text-[#9A9994]">트리거</div>
          <div className="text-[#5F5E5A]">{a.trigger}</div>
          <div className="text-[#9A9994]">채널</div>
          <div className="flex gap-1">
            {a.channels.map((c) => (
              <ChannelBadge key={c} ch={c} />
            ))}
          </div>
          <div className="text-[#9A9994]">알림톡 코드</div>
          <div className="font-mono text-[#5F5E5A]">
            {a.templateCode ?? "없음 (이메일 전용)"}
          </div>
        </div>
      </div>

      {/* CRM editable */}
      <div className="px-4 py-3.5">
        <div className="mb-3 text-[10px] font-medium uppercase tracking-wider text-[#08B1A9]">
          CRM 설정
        </div>

        <Field label="표시 이름" hint="CRM에서 보이는 별칭">
          <input
            value={a.displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-[13px] outline-none focus:border-[#08B1A9]"
          />
        </Field>

        <Field label="제품 스큐">
          <div className="pt-1">
            <SkuTag sku={a.sku} />
          </div>
        </Field>

        {a.channels.includes("email") && (
          <Field label="연결 이메일 템플릿">
            <select
              value={emailTpl}
              onChange={(e) => setEmailTpl(e.target.value)}
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-[13px] outline-none focus:border-[#08B1A9]"
            >
              {EMAIL_TEMPLATES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
        )}

        {a.channels.includes("alimtalk") && (
          <Field label="알림톡 templateCode" hint="카카오 승인 코드">
            <input
              value={a.templateCode ?? ""}
              onChange={(e) => onTemplateCodeChange(e.target.value)}
              placeholder="예: AT_VAT_001"
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 font-mono text-[13px] outline-none focus:border-[#08B1A9]"
            />
            <div className="mt-1 text-[11px] text-[#9A9994]">
              NHN Cloud에서 불러온 값 · 필요 시 수정 가능
            </div>
          </Field>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-black/15 bg-transparent px-3.5 py-1.5 text-[12px] text-[#5F5E5A] hover:bg-[#F7F7F5]"
          >
            취소
          </button>
          <button
            onClick={() => alert("저장되었습니다.")}
            className="rounded-lg border border-[#08B1A9] bg-[#08B1A9] px-3.5 py-1.5 text-[12px] font-medium text-white hover:bg-[#0F6E56]"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3.5">
      <div className="mb-1.5 text-[12px] text-[#5F5E5A]">
        {label}
        {hint && <small className="ml-1 text-[11px] text-[#9A9994]">{hint}</small>}
      </div>
      {children}
    </div>
  );
}
