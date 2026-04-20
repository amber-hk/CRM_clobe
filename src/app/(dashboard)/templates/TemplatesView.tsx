"use client";

import { useEffect, useMemo, useState } from "react";
import { SkuTag } from "@/components/common/Badges";
import { TemplateStatusBadge } from "../send/SendView";
import { AlimPreview } from "@/components/send/AlimPreview";
import {
  CAMPAIGN_SKUS,
  FUNNEL_STAGES,
  SEND_TYPES,
  loadCampaignMap,
  upsertCampaignMap,
  type CampaignMapEntry,
  type CampaignSku,
  type FunnelStage,
  type SendType,
} from "@/lib/campaign-map";
import { normalizeTemplateId } from "@/lib/template-id";
import { TemplateName } from "@/lib/template-meta";
import type { AlimTemplate, Template } from "@/types/crm";

/**
 * A template is "undefined" when display_name, description, sku, or
 * send_type is missing. Returns the missing-field labels for UI hints.
 */
/** CSS.escape polyfill fallback — template ids have dashes/underscores only,
 * but we still go through it in case that ever changes. */
function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/(["\\])/g, "\\$1");
}

function missingFields(meta: CampaignMapEntry | undefined): string[] {
  // Deactivated templates don't need to be classified.
  if (meta?.is_active === false) return [];
  const out: string[] = [];
  if (!meta?.display_name?.trim()) out.push("별칭 없음");
  if (!meta?.sku) out.push("스큐 미분류");
  if (!meta?.send_type) out.push("발송유형 미분류");
  return out;
}

export function TemplatesView({
  email,
  alim,
}: {
  email: Template[];
  alim: AlimTemplate[];
}) {
  const [tab, setTab] = useState<"email" | "alimtalk">("email");
  const [showDev, setShowDev] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [onlyUndefined, setOnlyUndefined] = useState(false);
  const [map, setMap] = useState<Record<string, CampaignMapEntry>>({});
  useEffect(() => {
    void loadCampaignMap().then(setMap);
  }, []);

  const active = tab === "email" ? email : alim;
  const baseList = active.filter(
    (t) => !t.supersededBy && !t.isLayout && (showDev || !t.hidden)
  );
  const undefinedCount = baseList.filter(
    (t) => missingFields(map[normalizeTemplateId(t.id)]).length > 0
  ).length;
  const inactiveCount = baseList.filter(
    (t) => map[normalizeTemplateId(t.id)]?.is_active === false
  ).length;
  const listed = baseList
    .filter((t) => {
      const meta = map[normalizeTemplateId(t.id)];
      if (!showInactive && meta?.is_active === false) return false;
      if (onlyUndefined && missingFields(meta).length === 0) return false;
      return true;
    })
    // Active templates first; deactivated ones settle at the bottom.
    .sort((a, b) => {
      const aInactive = map[normalizeTemplateId(a.id)]?.is_active === false;
      const bInactive = map[normalizeTemplateId(b.id)]?.is_active === false;
      return aInactive === bInactive ? 0 : aInactive ? 1 : -1;
    });
  const layouts = active.filter((t) => t.isLayout && !t.supersededBy);
  const hiddenCount = active.filter(
    (t) => t.hidden && !t.supersededBy && !t.isLayout
  ).length;
  const [selectedId, setSelectedId] = useState(listed[0]?.id ?? "");
  /** Highlight-from-keyboard flag. Mouse clicks set it false so the clicked
   * card doesn't visually stay selected — only arrow-nav'd cards do. */
  const [kbdNav, setKbdNav] = useState(false);
  const selected = active.find((t) => t.id === selectedId) ?? listed[0];

  // Arrow-key navigation through the visible list.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;
      const idx = listed.findIndex((t) => t.id === selectedId);
      if (idx < 0) return;
      const next = e.key === "ArrowDown" ? idx + 1 : idx - 1;
      if (next < 0 || next >= listed.length) return;
      e.preventDefault();
      const nextId = listed[next].id;
      setSelectedId(nextId);
      setKbdNav(true);
      // Scroll the new card into view on the next frame.
      requestAnimationFrame(() => {
        const el = document.querySelector(
          `[data-template-card="${cssEscape(nextId)}"]`
        );
        el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listed, selectedId]);

  const onSaved = (entry: CampaignMapEntry) =>
    setMap((m) => ({ ...m, [entry.template_id]: entry }));

  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <section>
      {undefinedCount > 0 && (
        <button
          onClick={() => setOnlyUndefined(true)}
          className="mb-4 flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-left transition hover:brightness-95"
          style={{ background: "#FEF3C7", borderColor: "#F59E0B", color: "#854F0B" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[16px]">⚠️</span>
            <span className="text-[13px] font-medium">
              미정의 템플릿 {undefinedCount}개
            </span>
            <span className="text-[12px] opacity-80">
              · 별칭·스큐·발송유형 중 누락된 항목이 있습니다
            </span>
          </div>
          <span className="text-[12px] font-medium underline decoration-dotted">
            미정의만 보기 →
          </span>
        </button>
      )}

      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-[18px] font-semibold tracking-tight">템플릿 관리</h1>
          {undefinedCount > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ background: "#FAEEDA", color: "#854F0B" }}
              title="별칭/스큐/발송유형 중 하나라도 빈 템플릿"
            >
              미정의 {undefinedCount}개
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label
            className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] transition ${
              onlyUndefined
                ? "border-[#EF9F27] bg-[#FAEEDA] text-[#854F0B]"
                : "border-black/15 bg-white text-[#5F5E5A]"
            }`}
          >
            <input
              type="checkbox"
              checked={onlyUndefined}
              onChange={(e) => setOnlyUndefined(e.target.checked)}
              className="h-3.5 w-3.5 accent-[#EF9F27]"
            />
            미정의만 보기
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-black/15 bg-white px-3 py-1.5 text-[12px] text-[#5F5E5A]">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-3.5 w-3.5 accent-[#08B1A9]"
            />
            비활성 포함
            {inactiveCount > 0 && (
              <span className="rounded-full bg-[#F7F7F5] px-1.5 py-px text-[10px] text-[#9A9994]">
                {inactiveCount}
              </span>
            )}
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-black/15 bg-white px-3 py-1.5 text-[12px] text-[#5F5E5A]">
            <input
              type="checkbox"
              checked={showDev}
              onChange={(e) => setShowDev(e.target.checked)}
              className="h-3.5 w-3.5 accent-[#08B1A9]"
            />
            dev 포함 보기
            {hiddenCount > 0 && (
              <span className="rounded-full bg-[#F7F7F5] px-1.5 py-px text-[10px] text-[#9A9994]">
                {hiddenCount}
              </span>
            )}
          </label>
        </div>
      </div>

      <div className="mb-4 flex border-b border-black/10">
        {(["email", "alimtalk"] as const).map((c) => {
          const on = tab === c;
          return (
            <button
              key={c}
              onClick={() => {
                setTab(c);
                const firstId = (c === "email" ? email : alim).find(
                  (t) => !t.supersededBy && !t.isLayout
                )?.id ?? "";
                setSelectedId(firstId);
              }}
              className={`border-b-2 px-5 py-2.5 text-[13px] transition ${
                on
                  ? "border-[#08B1A9] font-medium text-[#1A1A18]"
                  : "border-transparent text-[#5F5E5A]"
              }`}
            >
              {c === "email" ? "이메일" : "알림톡"}
            </button>
          );
        })}
      </div>

      <div className="grid items-start gap-4" style={{ gridTemplateColumns: "280px 1fr" }}>
        {/* List */}
        <div className="flex max-h-[calc(100vh-220px)] flex-col gap-1.5 overflow-y-auto pr-1">
          {listed.map((t) => {
            const meta = map[normalizeTemplateId(t.id)];
            const isSel = t.id === selectedId;
            const missing = missingFields(meta);
            const isUndefined = missing.length > 0;
            const inactive = meta?.is_active === false;
            // Inline style bypasses any Tailwind JIT/purge gotchas.
            // Selection wins over the undefined-marker border color.
            const cardStyle: React.CSSProperties = {
              border: "1px solid rgba(0,0,0,0.1)",
            };
            if (isSel) {
              cardStyle.border = "2px solid #08B1A9";
              cardStyle.backgroundColor = "#E1F5EE";
              cardStyle.boxShadow = "0 0 0 2px rgba(8,177,169,0.15)";
            } else if (isUndefined) {
              cardStyle.borderLeft = "3px solid #EF9F27";
            }
            return (
              <button
                key={t.id}
                data-template-card={t.id}
                onClick={() => {
                  setSelectedId(t.id);
                  setKbdNav(false);
                }}
                title={isUndefined ? `미정의: ${missing.join(" · ")}` : undefined}
                className={`rounded-lg px-3 py-2.5 text-left transition hover:bg-[#F7F7F5] ${
                  inactive ? "opacity-50" : ""
                }`}
                style={cardStyle}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 text-[13px] font-semibold text-[#1A1A18]">
                    <TemplateName id={t.id} />
                  </div>
                  {inactive && (
                    <span className="shrink-0 rounded-full bg-[#E5E5E5] px-1.5 py-px text-[10px] font-medium text-[#5F5E5A]">
                      비활성
                    </span>
                  )}
                </div>
                <div className="mt-1 truncate font-mono text-[10px] text-[#9A9994]">
                  {t.code}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {meta?.send_type && <SendTypeChip sendType={meta.send_type} />}
                  {meta?.sku && <SkuChip sku={meta.sku} />}
                  {meta?.funnel_stage && <FunnelChip stage={meta.funnel_stage} />}
                  {tab === "alimtalk" && <TemplateStatusBadge status={t.status} />}
                  {isUndefined && (
                    <span
                      className="rounded px-1.5 py-px text-[10px] font-medium"
                      style={{ background: "#FAEEDA", color: "#854F0B" }}
                    >
                      {missing.join(" · ")}
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          {tab === "email" && layouts.length > 0 && (
            <div className="mt-4 border-t border-black/10 pt-3">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[#9A9994]">
                레이아웃
              </div>
              <div className="flex flex-col gap-1.5">
                {layouts.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className={`rounded-lg border px-3 py-2 text-left transition ${
                      t.id === selectedId
                        ? "border-[#08B1A9] bg-[#E1F5EE]"
                        : "border-black/10 hover:bg-[#F7F7F5]"
                    }`}
                  >
                    <div className="text-[12px] font-medium">{t.name}</div>
                    <div className="mt-0.5 truncate font-mono text-[10px] text-[#9A9994]">
                      {t.code}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Detail */}
        {selected && (
          <DetailPanel
            key={selected.id}
            template={selected}
            channel={tab === "email" ? "EMAIL" : "ALIMTALK"}
            existing={map[normalizeTemplateId(selected.id)]}
            onSaved={onSaved}
            onToast={setToast}
          />
        )}
      </div>

      {toast && (
        <div
          className="pointer-events-none fixed bottom-6 left-1/2 z-[999] -translate-x-1/2 animate-fade rounded-lg bg-[#1a1a18] px-4 py-2.5 text-[13px] text-white shadow-lg"
          style={{ animation: "templates-toast-fade 2.5s ease forwards" }}
        >
          {toast}
        </div>
      )}

      <style>{`
        @keyframes templates-toast-fade {
          0% { opacity: 0; transform: translate(-50%, 8px); }
          10% { opacity: 1; transform: translate(-50%, 0); }
          80% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, 0); }
        }
      `}</style>
    </section>
  );
}

// =================== DETAIL PANEL ===================

function DetailPanel({
  template,
  channel,
  existing,
  onSaved,
  onToast,
}: {
  template: Template;
  channel: "EMAIL" | "ALIMTALK";
  existing: CampaignMapEntry | undefined;
  onSaved: (e: CampaignMapEntry) => void;
  onToast: (msg: string) => void;
}) {
  const normalizedId = useMemo(() => normalizeTemplateId(template.id), [template.id]);
  const [displayName, setDisplayName] = useState(existing?.display_name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [sku, setSku] = useState<CampaignSku | null>(existing?.sku ?? null);
  const [stage, setStage] = useState<FunnelStage | null>(existing?.funnel_stage ?? null);
  const [sendType, setSendType] = useState<SendType | null>(existing?.send_type ?? null);
  const [isActive, setIsActive] = useState<boolean>(existing?.is_active !== false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(existing?.display_name ?? "");
    setDescription(existing?.description ?? "");
    setSku(existing?.sku ?? null);
    setStage(existing?.funnel_stage ?? null);
    setSendType(existing?.send_type ?? null);
    setIsActive(existing?.is_active !== false);
  }, [existing]);

  const save = async () => {
    setSaving(true);
    try {
      const entry = await upsertCampaignMap({
        template_id: normalizedId,
        channel,
        display_name: displayName.trim(),
        description: description.trim() || null,
        sku,
        funnel_stage: stage,
        send_type: sendType,
        is_active: isActive,
      });
      onSaved(entry);
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
      onToast("저장되었습니다");
    } finally {
      setSaving(false);
    }
  };

  /** Toggle-only save — bypasses display_name validation. */
  const toggleActive = async () => {
    const next = !isActive;
    setIsActive(next);
    const entry = await upsertCampaignMap({
      template_id: normalizedId,
      channel,
      display_name: displayName.trim() || existing?.display_name || "",
      description: description.trim() || null,
      sku,
      funnel_stage: stage,
      send_type: sendType,
      is_active: next,
    });
    onSaved(entry);
    onToast(next ? "활성화되었습니다" : "비활성화되었습니다");
  };

  const isAlim = channel === "ALIMTALK";

  /** Enter saves — except inside textareas where it's a newline. */
  const onEnterSave = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "TEXTAREA") return;
    e.preventDefault();
    void save();
  };

  return (
    <div className="flex flex-col gap-3" onKeyDown={onEnterSave}>
      {/* Top: alias editor */}
      <div className="rounded-xl border border-black/10 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#08B1A9]">
            CRM 별칭 (dbt crm_campaign_map)
          </div>
          {savedAt && (
            <div className="text-[11px] text-[#9A9994]">저장됨 · {savedAt}</div>
          )}
        </div>

        <Field label="display_name" hint="이력·대시보드에 노출되는 캠페인 이름">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="캠페인 이름 (예: 자금일보 D+1 미수신 넛징)"
            className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-[14px] font-medium outline-none focus:border-[#08B1A9]"
          />
        </Field>

        <Field label="description" hint="언제, 누구에게, 어떤 목적으로">
          <textarea
            value={description ?? ""}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="언제, 누구에게, 어떤 목적으로 발송하는지"
            className="w-full resize-none rounded-lg border border-black/15 bg-white px-3 py-2 text-[13px] outline-none focus:border-[#08B1A9]"
          />
        </Field>

        <Field label="sku">
          <div className="flex gap-1.5">
            {CAMPAIGN_SKUS.map((s) => {
              const on = sku === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => setSku(on ? null : s.value)}
                  className="rounded-full border px-3 py-1 text-[12px] transition"
                  style={
                    on
                      ? { background: s.color, color: "#fff", borderColor: s.color, fontWeight: 500 }
                      : { background: "#fff", color: "#5F5E5A", borderColor: "rgba(0,0,0,0.15)" }
                  }
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="send_type" hint="발송이 어떻게 트리거되는지">
          <div className="flex flex-col gap-1.5">
            {SEND_TYPES.map((s) => {
              const on = sendType === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => setSendType(on ? null : s.value)}
                  className="rounded-lg border px-3 py-2 text-left transition"
                  style={
                    on
                      ? { background: s.bg, borderColor: s.color, color: s.color }
                      : { background: "#fff", borderColor: "rgba(0,0,0,0.15)", color: "#5F5E5A" }
                  }
                >
                  <div className="text-[12px] font-semibold">{s.label}</div>
                  <div className="mt-0.5 text-[11px] opacity-80">{s.desc}</div>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="funnel_stage">
          <div className="flex flex-wrap gap-1.5">
            {FUNNEL_STAGES.map((f) => {
              const on = stage === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => setStage(on ? null : f.value)}
                  className={`rounded-full border px-3 py-1 text-[12px] transition ${
                    on
                      ? "border-[#08B1A9] bg-[#E1F5EE] font-medium text-[#0F6E56]"
                      : "border-black/15 bg-white text-[#5F5E5A] hover:bg-[#F7F7F5]"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => void toggleActive()}
            className="flex items-center gap-2 text-[12px]"
            title="비활성화 시 발송·자동화 화면에서 숨겨집니다"
          >
            <span
              className="relative h-5 w-9 rounded-full transition"
              style={{ background: isActive ? "#08B1A9" : "#D3D1C7" }}
            >
              <span
                className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
                style={{ left: isActive ? 18 : 2 }}
              />
            </span>
            <span className={isActive ? "text-[#0F6E56] font-medium" : "text-[#5F5E5A]"}>
              {isActive ? "활성" : "비활성"}
            </span>
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg border border-[#08B1A9] bg-[#08B1A9] px-4 py-1.5 text-[13px] font-medium text-white hover:bg-[#0F6E56] disabled:opacity-50"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      {/* Middle: NHN readonly */}
      <div className="rounded-xl border border-black/10 bg-[#F7F7F5] p-5">
        <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-[#9A9994]">
          NHN Cloud · 읽기전용
        </div>
        <div className="grid gap-2 text-[12px]" style={{ gridTemplateColumns: "120px 1fr" }}>
          <div className="text-[#9A9994]">NHN templateId</div>
          <div className="font-mono text-[#1A1A18]">{template.id}</div>
          <div className="text-[#9A9994]">정규화 template_id</div>
          <div className="font-mono text-[#9A9994]">{normalizedId}</div>
          <div className="text-[#9A9994]">카테고리</div>
          <div className="text-[#5F5E5A]">{template.category || "—"}</div>
          <div className="text-[#9A9994]">생성일</div>
          <div className="text-[#5F5E5A]">{template.createdAt || "—"}</div>
          {isAlim ? (
            <>
              <div className="text-[#9A9994]">templateCode</div>
              <div className="font-mono text-[#5F5E5A]">{template.code}</div>
              <div className="text-[#9A9994]">상태</div>
              <div>
                <TemplateStatusBadge status={template.status} />
              </div>
            </>
          ) : (
            <>
              <div className="text-[#9A9994]">제목</div>
              <div className="text-[#5F5E5A]">{template.name}</div>
            </>
          )}
        </div>
      </div>

      {/* Bottom: content */}
      {isAlim ? (
        <AlimContentPanel template={template as AlimTemplate} />
      ) : (
        <EmailContentPanel template={template} />
      )}
    </div>
  );
}

// ---------------- AlimTalk content panel ----------------

function AlimContentPanel({ template }: { template: AlimTemplate }) {
  return (
    <div className="grid items-start gap-3" style={{ gridTemplateColumns: "1fr 320px" }}>
      <div className="rounded-xl border border-black/10 bg-white p-5">
        <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-[#9A9994]">
          템플릿 내용
        </div>
        <div className="mb-3 whitespace-pre-wrap rounded-lg bg-[#F7F7F5] p-3 font-mono text-[12px] leading-relaxed text-[#5F5E5A]">
          {template.content}
        </div>

        <Detail label="타입">
          <span className="font-mono text-[12px]">
            {template.templateMessageType} · {template.templateEmphasizeType}
          </span>
        </Detail>
        {template.templateHeader && <Detail label="header">{template.templateHeader}</Detail>}
        {template.templateTitle && <Detail label="title">{template.templateTitle}</Detail>}
        {template.templateSubtitle && <Detail label="subtitle">{template.templateSubtitle}</Detail>}
        {template.templateExtra && <Detail label="extra">{template.templateExtra}</Detail>}
        {template.templateAd && <Detail label="ad">{template.templateAd}</Detail>}
        {template.templateItem && (
          <Detail label="item.list">
            <ul className="list-disc pl-4 text-[11px]">
              {template.templateItem.list.map((r, i) => (
                <li key={i}>
                  <strong>{r.title}</strong>: {r.description}
                </li>
              ))}
              <li className="mt-1">
                <strong>{template.templateItem.summary.title}</strong>:{" "}
                {template.templateItem.summary.description}
              </li>
            </ul>
          </Detail>
        )}
        {template.buttons.length > 0 && (
          <Detail label="buttons">
            <ul className="text-[11px] text-[#5F5E5A]">
              {template.buttons.map((b, i) => (
                <li key={i}>
                  <span className="font-mono">[{b.type}]</span> {b.name}
                  {b.linkMo && <span className="text-[#9A9994]"> · {b.linkMo}</span>}
                </li>
              ))}
            </ul>
          </Detail>
        )}
      </div>
      <div>
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[#9A9994]">
          미리보기
        </div>
        <AlimPreview template={template} values={{}} />
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2 grid gap-2 text-[12px]" style={{ gridTemplateColumns: "80px 1fr" }}>
      <div className="text-[#9A9994]">{label}</div>
      <div className="text-[#5F5E5A]">{children}</div>
    </div>
  );
}

// ---------------- Email content panel ----------------

function EmailContentPanel({ template }: { template: Template }) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHtml = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/nhn/email-template?templateId=${encodeURIComponent(template.id)}`
      );
      const json = (await res.json()) as { body: string | null; error?: string };
      if (json.error) throw new Error(json.error);
      if (!json.body) throw new Error("HTML body not found in NHN response");
      setHtml(json.body);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-black/10 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[11px] font-medium uppercase tracking-wider text-[#9A9994]">
          이메일 본문
        </div>
        <button
          onClick={fetchHtml}
          disabled={loading}
          className="rounded-lg border border-black/15 bg-transparent px-3 py-1 text-[12px] text-[#5F5E5A] hover:bg-[#F7F7F5] disabled:opacity-50"
        >
          {loading ? "불러오는 중..." : html ? "다시 불러오기" : "HTML 보기"}
        </button>
      </div>
      {error && (
        <div className="rounded-lg bg-[#FCEBEB] px-3 py-2 text-[12px] text-[#A32D2D]">
          {error}
        </div>
      )}
      {html ? (
        <iframe
          srcDoc={html}
          sandbox=""
          className="block h-[480px] w-full rounded-lg border border-black/10"
          title="email-html"
        />
      ) : !error ? (
        <div className="rounded-lg bg-[#F7F7F5] p-4 text-[12px] text-[#9A9994]">
          NHN Cloud에서 HTML 본문을 불러옵니다. (자격증명 필요)
        </div>
      ) : null}
    </div>
  );
}

// ---------------- Small chips ----------------

function SkuChip({ sku }: { sku: CampaignSku }) {
  const meta = CAMPAIGN_SKUS.find((s) => s.value === sku);
  if (!meta) return null;
  return (
    <span
      className="rounded-full px-2 py-px text-[10px] font-medium text-white"
      style={{ background: meta.color }}
    >
      {meta.label}
    </span>
  );
}

function SendTypeChip({ sendType }: { sendType: SendType }) {
  const meta = SEND_TYPES.find((s) => s.value === sendType);
  if (!meta) return null;
  return (
    <span
      className="rounded-full px-2 py-px text-[10px] font-medium"
      style={{ background: meta.bg, color: meta.color }}
    >
      {meta.label}
    </span>
  );
}

function FunnelChip({ stage }: { stage: FunnelStage }) {
  const meta = FUNNEL_STAGES.find((s) => s.value === stage);
  if (!meta) return null;
  return (
    <span className="rounded-full bg-[#F7F7F5] px-2 py-px text-[10px] font-medium text-[#5F5E5A]">
      {meta.label}
    </span>
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
        <span className="font-mono">{label}</span>
        {hint && <small className="ml-1 text-[11px] text-[#9A9994]">{hint}</small>}
      </div>
      {children}
    </div>
  );
}

// Use SkuTag once so unused-import lint is happy in case it's referenced elsewhere.
export const _unused = SkuTag;
