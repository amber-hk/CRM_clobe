"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  DEFAULT_EMAIL_LAYOUTS,
  loadLayouts,
  type EmailLayoutMapping,
  type LayoutSku,
} from "@/lib/email-layouts";
import {
  applyEmailVars,
  parseAlimVars,
  parseEmailVars,
  textToHtml,
} from "@/lib/variable-parser";
import { buildCsv, downloadCsv, parseCsv } from "@/lib/csv";
import { AlimPreview } from "@/components/send/AlimPreview";
import { createCampaign } from "@/lib/campaigns";
import {
  getTemplateDisplayName,
  isTemplateActive,
  TemplateName,
} from "@/lib/template-meta";
import { getSegments, SEGMENT_TYPES, type Segment } from "@/lib/segments";
import type { AlimTemplate, Template, TemplateStatus } from "@/types/crm";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type Channel = "email" | "alimtalk";
type Mode = "free" | "template";
type RecipientMode = "single" | "bulk" | "segment";
type CsvData = { headers: string[]; rows: string[][] };

export function SendView({
  emailTemplates,
  alimTemplates,
}: {
  emailTemplates: Template[];
  alimTemplates: AlimTemplate[];
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [toast, setToast] = useState<string | null>(null);

  // Step 1
  const [campaignName, setCampaignName] = useState("");
  const [channel, setChannel] = useState<Channel | null>(null);
  const [layouts, setLayouts] = useState<EmailLayoutMapping[]>(DEFAULT_EMAIL_LAYOUTS);
  useEffect(() => setLayouts(loadLayouts()), []);
  const [layoutSku, setLayoutSku] = useState<LayoutSku | "none">("none");
  const activeLayout = layouts.find((l) => l.skuId === layoutSku) ?? null;

  // Step 2
  const [mode, setMode] = useState<Mode>("free");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyMode, setBodyMode] = useState<"text" | "html">("text");
  const [textBody, setTextBody] = useState("");
  const [htmlBody, setHtmlBody] = useState("<p>본문을 입력하세요</p>");
  const [senderEmail, setSenderEmail] = useState("support@clobe.ai");
  const [templateBody, setTemplateBody] = useState<string | null>(null);
  const [templateBodyLoading, setTemplateBodyLoading] = useState(false);
  const [singleVars, setSingleVars] = useState<Record<string, string>>({});
  const [previewOpen, setPreviewOpen] = useState(true);

  // Step 3
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("single");
  const [singleAddr, setSingleAddr] = useState("");
  const [csvData, setCsvData] = useState<CsvData | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [availableSegments, setAvailableSegments] = useState<Segment[]>([]);
  useEffect(() => setAvailableSegments(getSegments().filter((s) => s.status === "done")), []);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showTest, setShowTest] = useState(false);

  // Alim is template-only.
  useEffect(() => {
    if (channel === "alimtalk") setMode("template");
  }, [channel]);

  // Auto-open preview when entering Step 2.
  useEffect(() => {
    if (step === 2) setPreviewOpen(true);
  }, [step]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Resolved template
  const selectedEmail = emailTemplates.find((t) => t.id === selectedTemplateId) ?? null;
  const selectedAlim = alimTemplates.find((t) => t.id === selectedTemplateId) ?? null;

  // When template changes, auto-fill campaign name.
  useEffect(() => {
    if (mode === "template" && selectedTemplateId) {
      setCampaignName((n) => n || getTemplateDisplayName(selectedTemplateId));
    }
  }, [selectedTemplateId, mode]);

  // Fetch email template body from NHN when the user picks a template.
  useEffect(() => {
    if (channel !== "email" || mode !== "template" || !selectedEmail) {
      setTemplateBody(null);
      return;
    }
    let cancelled = false;
    setTemplateBodyLoading(true);
    setTemplateBody(null);
    fetch(`/api/nhn/email-template?templateId=${encodeURIComponent(selectedEmail.id)}`)
      .then((r) => r.json())
      .then((json: { body: string | null; error?: string }) => {
        if (cancelled) return;
        setTemplateBody(json.body);
      })
      .catch(() => {
        if (cancelled) return;
        setTemplateBody(null);
      })
      .finally(() => {
        if (!cancelled) setTemplateBodyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [channel, mode, selectedEmail?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const body = bodyMode === "text" ? textBody : htmlBody;
  const variables = useMemo(() => {
    if (channel === "alimtalk" && selectedAlim) return parseAlimVars(selectedAlim.content ?? "");
    if (channel === "email" && mode === "free") return parseEmailVars(`${subject} ${body}`);
    if (channel === "email" && mode === "template" && selectedEmail)
      return parseEmailVars(`${selectedEmail.name} ${selectedEmail.content ?? ""}`);
    return [];
  }, [channel, mode, selectedAlim, selectedEmail, subject, body]);

  const selectedSegment = availableSegments.find((s) => s.id === selectedSegmentId) ?? null;
  const recipientCount =
    recipientMode === "single"
      ? singleAddr.trim() ? 1 : 0
      : recipientMode === "bulk"
      ? csvData?.rows.length ?? 0
      : selectedSegment?.userCount ?? 0;

  // ---------- Validation ----------
  const canGoToStep2 = campaignName.trim().length > 0 && !!channel;
  const canGoToStep3 = useMemo(() => {
    if (channel === "email") {
      if (mode === "free") return subject.trim().length > 0 && body.trim().length > 0;
      return !!selectedEmail;
    }
    return !!selectedAlim && selectedAlim.status === "approved";
  }, [channel, mode, subject, body, selectedEmail, selectedAlim]);

  const canSubmit = recipientCount > 0;

  // ---------- Send ----------
  const templateIdForRecord = () =>
    channel === "alimtalk"
      ? selectedAlim?.code ?? null
      : mode === "template"
      ? selectedEmail?.id ?? null
      : null;

  const handleSend = async () => {
    await createCampaign({
      name: campaignName.trim(),
      template_id: templateIdForRecord(),
      channel: channel as Channel,
      send_type: "adhoc",
      sku_id: activeLayout?.skuId ?? null,
      sent_at: new Date().toISOString(),
      recipient_count: recipientCount,
      delivered_count: recipientCount,
      received_count: recipientCount,
      bounce: null,
      open_rate: null,
      conversion_rate: null,
      created_by: "앰버",
    });
    setShowConfirm(false);
    setToast(`${recipientCount}명에게 발송 요청이 완료되었습니다.`);
  };

  // ---------- Render ----------
  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[18px] font-semibold tracking-tight">발송하기</h1>
      </div>

      <StepIndicator step={step} />

      <div className="mt-6">
        {step === 1 && (
          <Step1
            campaignName={campaignName}
            onCampaignName={setCampaignName}
            channel={channel}
            onChannel={setChannel}
            layouts={layouts}
            layoutSku={layoutSku}
            onLayoutSku={setLayoutSku}
            canNext={canGoToStep2}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && channel && (
          <Step2
            channel={channel}
            mode={mode}
            onMode={setMode}
            emailTemplates={emailTemplates}
            alimTemplates={alimTemplates}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={setSelectedTemplateId}
            selectedEmail={selectedEmail}
            selectedAlim={selectedAlim}
            subject={subject}
            onSubject={setSubject}
            bodyMode={bodyMode}
            onBodyMode={setBodyMode}
            textBody={textBody}
            onTextBody={setTextBody}
            htmlBody={htmlBody}
            onHtmlBody={setHtmlBody}
            senderEmail={senderEmail}
            onSenderEmail={setSenderEmail}
            templateBody={templateBody}
            templateBodyLoading={templateBodyLoading}
            variables={variables}
            singleVars={singleVars}
            onSingleVars={setSingleVars}
            activeLayout={activeLayout}
            onActiveLayoutSku={setLayoutSku}
            layouts={layouts}
            previewOpen={previewOpen}
            onTogglePreview={() => setPreviewOpen((o) => !o)}
            onPrev={() => setStep(1)}
            onNext={() => setStep(3)}
            canNext={canGoToStep3}
          />
        )}

        {step === 3 && channel && (
          <Step3
            channel={channel}
            recipientMode={recipientMode}
            onRecipientMode={setRecipientMode}
            singleAddr={singleAddr}
            onSingleAddr={setSingleAddr}
            csvData={csvData}
            onCsvData={setCsvData}
            variables={variables}
            singleVars={singleVars}
            onSingleVars={setSingleVars}
            recipientCount={recipientCount}
            segments={availableSegments}
            selectedSegmentId={selectedSegmentId}
            onSelectSegment={setSelectedSegmentId}
            onPrev={() => setStep(2)}
            onTest={() => setShowTest(true)}
            onSend={() => setShowConfirm(true)}
            canSubmit={canSubmit}
            templateCode={selectedAlim?.code}
            sampleBasis={selectedAlim?.code ?? selectedEmail?.id ?? "free"}
          />
        )}
      </div>

      {showConfirm && (
        <ConfirmModal
          summary={{
            campaignName,
            channel: channel as Channel,
            templateName:
              channel === "alimtalk"
                ? selectedAlim?.name ?? "—"
                : mode === "template"
                ? selectedEmail?.name ?? "—"
                : "자유 발송",
            count: recipientCount,
          }}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleSend}
        />
      )}

      {showTest && (
        <TestSendModal
          channel={channel as Channel}
          variables={variables}
          subject={subject || selectedEmail?.name}
          body={body || selectedEmail?.content}
          templateId={selectedEmail?.id}
          templateCode={selectedAlim?.code}
          layoutSkuId={activeLayout?.skuId}
          onClose={() => setShowTest(false)}
          onToast={setToast}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[999] -translate-x-1/2 rounded-lg bg-[#1a1a18] px-4 py-2.5 text-[13px] text-white shadow-lg">
          {toast}
        </div>
      )}
    </section>
  );
}

// =================== Step indicator ===================

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const items = [
    { num: 1, label: "캠페인 설정" },
    { num: 2, label: "콘텐츠 작성" },
    { num: 3, label: "수신자" },
  ];
  return (
    <div className="flex items-center">
      {items.map((it, i) => {
        const done = step > it.num;
        const active = step === it.num;
        return (
          <div key={it.num} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold transition ${
                  done
                    ? "bg-[#1D9E75] text-white"
                    : active
                    ? "bg-[#08B1A9] text-white"
                    : "bg-[#F7F7F5] text-[#9A9994]"
                }`}
              >
                {done ? "✓" : it.num}
              </div>
              <div
                className={`text-[13px] ${
                  active ? "font-semibold text-[#1A1A18]" : done ? "text-[#1D9E75]" : "text-[#9A9994]"
                }`}
              >
                {it.label}
              </div>
            </div>
            {i < items.length - 1 && (
              <div
                className="mx-4 h-px w-20 transition"
                style={{ background: done ? "#1D9E75" : "#E5E5E5" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// =================== Step 1 ===================

function Step1({
  campaignName,
  onCampaignName,
  channel,
  onChannel,
  layouts,
  layoutSku,
  onLayoutSku,
  canNext,
  onNext,
}: {
  campaignName: string;
  onCampaignName: (v: string) => void;
  channel: Channel | null;
  onChannel: (c: Channel) => void;
  layouts: EmailLayoutMapping[];
  layoutSku: LayoutSku | "none";
  onLayoutSku: (s: LayoutSku | "none") => void;
  canNext: boolean;
  onNext: () => void;
}) {
  return (
    <div className="mx-auto max-w-[680px]">
      <div className="rounded-xl border border-black/10 bg-white p-6">
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-[#1A1A18]">
            캠페인 이름
            <span className="text-[#E24B4A]">*</span>
          </div>
          <input
            id="campaign-name-input"
            value={campaignName}
            onChange={(e) => onCampaignName(e.target.value)}
            placeholder="예: 4월 부가세 안내, Pre-Series A 투자 유치 공지"
            className="w-full rounded-lg border border-black/15 bg-white px-3.5 py-2.5 text-[14px] outline-none focus:border-[#08B1A9]"
          />
        </div>

        <div className="mb-6">
          <div className="mb-2 text-[13px] font-semibold text-[#1A1A18]">
            채널 <span className="text-[#E24B4A]">*</span>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <ChannelCard
              on={channel === "email"}
              onClick={() => onChannel("email")}
              icon="📧"
              label="이메일"
              desc="이메일 템플릿 or 자유 발송"
            />
            <ChannelCard
              on={channel === "alimtalk"}
              onClick={() => onChannel("alimtalk")}
              icon="💬"
              label="알림톡"
              desc="승인된 템플릿 필수"
            />
          </div>
        </div>

        {channel && (
          <div className="mb-6">
            <div className="mb-2 text-[13px] font-semibold text-[#1A1A18]">
              스큐{" "}
              <small className="ml-1 text-[11px] font-normal text-[#9A9994]">
                선택 시 발송 레이아웃·추적 태깅
              </small>
            </div>
            <div className="flex flex-wrap gap-2">
              {layouts.map((l) => {
                const on = layoutSku === l.skuId;
                return (
                  <button
                    key={l.skuId}
                    onClick={() => onLayoutSku(l.skuId)}
                    className="flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] transition"
                    style={
                      on
                        ? { background: l.primaryColor, color: "#fff", borderColor: l.primaryColor, fontWeight: 500 }
                        : { background: "#fff", color: "#5F5E5A", borderColor: "rgba(0,0,0,0.15)" }
                    }
                  >
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: l.primaryColor }} />
                    {l.name}
                  </button>
                );
              })}
              <button
                onClick={() => onLayoutSku("none")}
                className={`rounded-full border px-3.5 py-1.5 text-[13px] transition ${
                  layoutSku === "none"
                    ? "border-black/30 bg-[#F7F7F5] font-medium text-[#1A1A18]"
                    : "border-black/15 bg-white text-[#5F5E5A]"
                }`}
              >
                없음
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={onNext}
          disabled={!canNext}
          className="rounded-lg border border-[#08B1A9] bg-[#08B1A9] px-5 py-2 text-[13px] font-medium text-white hover:bg-[#0F6E56] disabled:opacity-50"
        >
          다음 →
        </button>
      </div>
    </div>
  );
}

function ChannelCard({
  on,
  onClick,
  icon,
  label,
  desc,
}: {
  on: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border p-4 text-left transition"
      style={
        on
          ? { background: "#E1F5EE", borderColor: "#08B1A9", borderWidth: 2 }
          : { background: "#fff", borderColor: "rgba(0,0,0,0.1)", borderWidth: 2 }
      }
    >
      <div className="mb-1 text-[24px]">{icon}</div>
      <div className={`text-[15px] font-semibold ${on ? "text-[#0F6E56]" : "text-[#1A1A18]"}`}>
        {label}
      </div>
      <div className="mt-0.5 text-[12px] text-[#5F5E5A]">{desc}</div>
    </button>
  );
}

// =================== Step 2 ===================

function Step2(props: {
  channel: Channel;
  mode: Mode;
  onMode: (m: Mode) => void;
  emailTemplates: Template[];
  alimTemplates: AlimTemplate[];
  selectedTemplateId: string;
  onSelectTemplate: (id: string) => void;
  selectedEmail: Template | null;
  selectedAlim: AlimTemplate | null;
  subject: string;
  onSubject: (v: string) => void;
  bodyMode: "text" | "html";
  onBodyMode: (m: "text" | "html") => void;
  textBody: string;
  onTextBody: (v: string) => void;
  htmlBody: string;
  onHtmlBody: (v: string) => void;
  senderEmail: string;
  onSenderEmail: (v: string) => void;
  templateBody: string | null;
  templateBodyLoading: boolean;
  variables: string[];
  singleVars: Record<string, string>;
  onSingleVars: (v: Record<string, string>) => void;
  activeLayout: EmailLayoutMapping | null;
  onActiveLayoutSku: (s: LayoutSku | "none") => void;
  layouts: EmailLayoutMapping[];
  previewOpen: boolean;
  onTogglePreview: () => void;
  onPrev: () => void;
  onNext: () => void;
  canNext: boolean;
}) {
  const cols = props.previewOpen ? "3fr 2fr" : "1fr 0fr";

  return (
    <div>
      <div className="grid items-start gap-4" style={{ gridTemplateColumns: cols }}>
        <div className="rounded-xl border border-black/10 bg-white p-5">
          {props.channel === "email" ? (
            <EmailComposer {...props} />
          ) : (
            <AlimComposer {...props} />
          )}
        </div>

        {props.previewOpen && (
          <div className="sticky top-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[11px] font-medium uppercase tracking-wider text-[#9A9994]">
                미리보기
              </div>
              <button
                onClick={props.onTogglePreview}
                className="text-[11px] text-[#9A9994] hover:text-[#1A1A18]"
              >
                닫기 →
              </button>
            </div>
            {props.channel === "email" ? (
              <EmailPreview
                mode={props.mode}
                subject={props.subject || props.selectedEmail?.name || ""}
                bodyHtml={
                  props.mode === "free"
                    ? props.bodyMode === "html"
                      ? props.htmlBody
                      : textToHtml(props.textBody)
                    : props.templateBody
                }
                templateBodyLoading={props.templateBodyLoading}
                layoutSkuId={props.activeLayout?.skuId}
                layoutHeaderId={props.activeLayout?.headerTemplateId}
                senderEmail={props.senderEmail}
                onSenderEmail={props.onSenderEmail}
                values={props.singleVars}
              />
            ) : (
              <AlimPreview template={props.selectedAlim ?? undefined} values={props.singleVars} />
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={props.onPrev}
          className="rounded-lg border border-black/15 bg-transparent px-4 py-2 text-[13px] text-[#5F5E5A] hover:bg-[#F7F7F5]"
        >
          ← 이전
        </button>
        <div className="flex items-center gap-2">
          {!props.previewOpen && (
            <button
              onClick={props.onTogglePreview}
              className="rounded-lg border border-black/15 bg-transparent px-3.5 py-2 text-[12px] text-[#5F5E5A] hover:bg-[#F7F7F5]"
            >
              미리보기 열기 ←
            </button>
          )}
          <button
            onClick={props.onNext}
            disabled={!props.canNext}
            className="rounded-lg border border-[#08B1A9] bg-[#08B1A9] px-5 py-2 text-[13px] font-medium text-white hover:bg-[#0F6E56] disabled:opacity-50"
          >
            다음 →
          </button>
        </div>
      </div>
    </div>
  );
}

function EmailComposer(props: Parameters<typeof Step2>[0]) {
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex overflow-hidden rounded-lg border border-black/15">
          {(["free", "template"] as const).map((m) => (
            <button
              key={m}
              onClick={() => props.onMode(m)}
              className={`px-4 py-1.5 text-[12px] transition ${
                props.mode === m ? "bg-[#08B1A9] font-medium text-white" : "bg-white text-[#5F5E5A]"
              }`}
            >
              {m === "free" ? "자유 발송" : "템플릿 사용"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[#9A9994]">
          레이아웃
          {props.layouts.map((l) => {
            const on = props.activeLayout?.skuId === l.skuId;
            return (
              <button
                key={l.skuId}
                onClick={() => props.onActiveLayoutSku(l.skuId)}
                className="rounded-full border px-2 py-0.5 text-[11px]"
                style={
                  on
                    ? { background: l.primaryColor, color: "#fff", borderColor: l.primaryColor }
                    : { background: "#fff", color: "#5F5E5A", borderColor: "rgba(0,0,0,0.15)" }
                }
              >
                {l.name}
              </button>
            );
          })}
          <button
            onClick={() => props.onActiveLayoutSku("none")}
            className={`rounded-full border px-2 py-0.5 text-[11px] ${
              !props.activeLayout
                ? "border-black/30 bg-[#F7F7F5] text-[#1A1A18]"
                : "border-black/15 bg-white text-[#5F5E5A]"
            }`}
          >
            없음
          </button>
        </div>
      </div>

      {props.mode === "free" ? (
        <>
          <Field label="이메일 제목">
            <input
              value={props.subject}
              onChange={(e) => props.onSubject(e.target.value)}
              placeholder="예: 4월 제품 업데이트 안내 (${회사명} 가능)"
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-[13px] outline-none focus:border-[#08B1A9]"
            />
          </Field>
          <div className="mb-3.5">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="text-[12px] text-[#5F5E5A]">
                본문{" "}
                <small className="ml-1 text-[11px] text-[#9A9994]">
                  변수 <code className="rounded bg-[#F7F7F5] px-1">{`\${변수명}`}</code>
                </small>
              </div>
              <div className="flex overflow-hidden rounded-lg border border-black/15">
                {(["text", "html"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      // Sync text→html on switch so the editor shows the
                      // converted HTML ready to fine-tune.
                      if (m === "html" && props.bodyMode === "text") {
                        props.onHtmlBody(textToHtml(props.textBody));
                      }
                      props.onBodyMode(m);
                    }}
                    className={`px-3 py-1 text-[11px] transition ${
                      props.bodyMode === m ? "bg-[#08B1A9] font-medium text-white" : "bg-white text-[#5F5E5A]"
                    }`}
                  >
                    {m === "text" ? "텍스트" : "HTML"}
                  </button>
                ))}
              </div>
            </div>
            {props.bodyMode === "text" ? (
              <textarea
                value={props.textBody}
                onChange={(e) => props.onTextBody(e.target.value)}
                rows={10}
                placeholder="안녕하세요 ${회사명} 담당자님,&#10;..."
                className="w-full resize-y rounded-lg border border-black/15 bg-white px-3 py-2 text-[13px] outline-none focus:border-[#08B1A9]"
              />
            ) : (
              <div className="overflow-hidden rounded-lg border border-black/15">
                <MonacoEditor
                  value={props.htmlBody}
                  onChange={(v) => props.onHtmlBody(v ?? "")}
                  language="html"
                  height="280px"
                  theme="vs-light"
                  options={{ minimap: { enabled: false }, fontSize: 12, scrollBeyondLastLine: false, wordWrap: "on", tabSize: 2 }}
                />
              </div>
            )}
            {props.variables.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="text-[11px] text-[#9A9994]">감지된 변수:</span>
                {props.variables.map((v) => (
                  <span key={v} className="rounded bg-[#F7F7F5] px-2 py-0.5 font-mono text-[11px] text-[#5F5E5A]">
                    {`\${${v}}`}
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <Field label="템플릿 선택">
            <TemplateList
              templates={props.emailTemplates.filter((t) => !t.isLayout && isTemplateActive(t.id))}
              selectedId={props.selectedTemplateId}
              onSelect={props.onSelectTemplate}
            />
          </Field>
          {props.selectedEmail && props.variables.length > 0 && (
            <Field label="변수 샘플값" hint="미리보기용 · 실제 발송 값은 Step 3에서 CSV로 업로드">
              <div className="flex flex-col gap-2">
                {props.variables.map((v) => (
                  <div key={v}>
                    <div className="mb-0.5 font-mono text-[11px] text-[#9A9994]">${`{${v}}`}</div>
                    <input
                      value={props.singleVars[v] ?? ""}
                      onChange={(e) =>
                        props.onSingleVars({ ...props.singleVars, [v]: e.target.value })
                      }
                      className="w-full rounded-lg border border-black/15 bg-white px-3 py-1.5 text-[13px] outline-none focus:border-[#08B1A9]"
                    />
                  </div>
                ))}
              </div>
            </Field>
          )}
        </>
      )}
    </>
  );
}

function AlimComposer(props: Parameters<typeof Step2>[0]) {
  return (
    <>
      <Field label="템플릿 선택" hint="승인된 템플릿만 발송 가능">
        <AlimTemplateList
          templates={props.alimTemplates.filter((t) => isTemplateActive(t.id))}
          selectedId={props.selectedTemplateId}
          onSelect={props.onSelectTemplate}
        />
      </Field>
      {props.selectedAlim && props.variables.length > 0 && (
        <Field label="변수 샘플값" hint="미리보기용 · 실제 값은 Step 3에서 입력">
          {props.variables.map((v) => (
            <div key={v} className="mb-2">
              <div className="mb-0.5 font-mono text-[11px] text-[#9A9994]">{`#{${v}}`}</div>
              <input
                value={props.singleVars[v] ?? ""}
                onChange={(e) =>
                  props.onSingleVars({ ...props.singleVars, [v]: e.target.value })
                }
                className="w-full rounded-lg border border-black/15 bg-white px-3 py-1.5 text-[13px] outline-none focus:border-[#08B1A9]"
              />
            </div>
          ))}
        </Field>
      )}
    </>
  );
}

// =================== Step 3 ===================

function Step3({
  channel,
  recipientMode,
  onRecipientMode,
  singleAddr,
  onSingleAddr,
  csvData,
  onCsvData,
  variables,
  singleVars,
  onSingleVars,
  recipientCount,
  segments,
  selectedSegmentId,
  onSelectSegment,
  onPrev,
  onTest,
  onSend,
  canSubmit,
  sampleBasis,
}: {
  channel: Channel;
  recipientMode: RecipientMode;
  onRecipientMode: (m: RecipientMode) => void;
  singleAddr: string;
  onSingleAddr: (v: string) => void;
  csvData: CsvData | null;
  onCsvData: (d: CsvData | null) => void;
  variables: string[];
  singleVars: Record<string, string>;
  onSingleVars: (v: Record<string, string>) => void;
  recipientCount: number;
  segments: Segment[];
  selectedSegmentId: string | null;
  onSelectSegment: (id: string | null) => void;
  onPrev: () => void;
  onTest: () => void;
  onSend: () => void;
  canSubmit: boolean;
  templateCode?: string;
  sampleBasis: string;
}) {
  const addrKey = channel === "email" ? "email" : "phone";
  const addrPlaceholder =
    channel === "email" ? "user@company.com" : "01012345678";
  const selectedSegment = segments.find((s) => s.id === selectedSegmentId) ?? null;

  const downloadSample = () => {
    const headers = [addrKey, ...variables];
    const rows = [
      headers.map((h) =>
        h === addrKey
          ? channel === "email"
            ? "user@example.com"
            : "01012345678"
          : `샘플-${h}`
      ),
    ];
    downloadCsv(`sample_${sampleBasis}.csv`, buildCsv(headers, rows));
  };

  return (
    <div className="mx-auto max-w-[680px]">
      <div className="rounded-xl border border-black/10 bg-white p-6">
        <div className="mb-4">
          <div className="mb-2 text-[13px] font-semibold text-[#1A1A18]">수신 방식</div>
          <div className="flex overflow-hidden w-max rounded-lg border border-black/15">
            {(["single", "bulk", "segment"] as const).map((m) => (
              <button
                key={m}
                onClick={() => onRecipientMode(m)}
                className={`px-4 py-1.5 text-[12px] transition ${
                  recipientMode === m
                    ? "bg-[#08B1A9] font-medium text-white"
                    : "bg-white text-[#5F5E5A]"
                }`}
              >
                {m === "single" ? "단건" : m === "bulk" ? "대량 CSV" : "세그먼트"}
              </button>
            ))}
          </div>
        </div>

        {recipientMode === "single" ? (
          <>
            <Field label={channel === "email" ? "수신자 이메일" : "수신자 전화번호"}>
              <input
                value={singleAddr}
                onChange={(e) => onSingleAddr(e.target.value)}
                placeholder={addrPlaceholder}
                className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 font-mono text-[13px] outline-none focus:border-[#08B1A9]"
              />
            </Field>
            {variables.map((v) => (
              <Field key={v} label={channel === "email" ? `\${${v}}` : `#{${v}}`}>
                <input
                  value={singleVars[v] ?? ""}
                  onChange={(e) => onSingleVars({ ...singleVars, [v]: e.target.value })}
                  className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-[13px] outline-none focus:border-[#08B1A9]"
                />
              </Field>
            ))}
          </>
        ) : recipientMode === "bulk" ? (
          <>
            <DropZoneCsv onParsed={onCsvData} />
            <div className="mt-3 flex items-center justify-between">
              <button onClick={downloadSample} className="text-[12px] text-[#08B1A9] hover:underline">
                샘플 CSV 다운로드 (헤더: {[addrKey, ...variables].join(", ") || addrKey})
              </button>
              {csvData && (
                <button
                  onClick={() => onCsvData(null)}
                  className="text-[11px] text-[#9A9994] hover:text-[#E24B4A]"
                >
                  파일 제거
                </button>
              )}
            </div>
            {csvData && (
              <>
                <CsvPreview data={csvData} />
                <div className="mt-2 text-[13px] font-semibold text-[#08B1A9]">
                  {csvData.rows.length}개 회사에게 발송 예정
                </div>
              </>
            )}
          </>
        ) : (
          /* Segment mode */
          <>
            <Field label="세그먼트 선택" hint="완료된 세그먼트만 선택 가능">
              {segments.length === 0 ? (
                <div className="rounded-lg bg-[#F7F7F5] px-3 py-4 text-center text-[12px] text-[#9A9994]">
                  생성된 세그먼트가 없습니다. /segments 에서 먼저 생성하세요.
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {segments.map((seg) => {
                    const on = selectedSegmentId === seg.id;
                    const typeMeta = SEGMENT_TYPES.find((s) => s.value === seg.type);
                    return (
                      <button
                        key={seg.id}
                        onClick={() => onSelectSegment(seg.id)}
                        className="rounded-lg border px-3 py-2.5 text-left transition"
                        style={
                          on
                            ? { border: "2px solid #08B1A9", backgroundColor: "#E1F5EE" }
                            : { border: "1px solid rgba(0,0,0,0.1)" }
                        }
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-[13px] font-medium">{seg.label}</div>
                          <div className="text-[13px] font-semibold text-[#08B1A9]">
                            {seg.companyCount.toLocaleString()}개사 · {seg.userCount.toLocaleString()}명
                          </div>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span
                            className="rounded-full px-2 py-px text-[10px] font-medium"
                            style={{ background: "#E6F1FB", color: "#185FA5" }}
                          >
                            {typeMeta?.label}
                          </span>
                          <span
                            className="rounded-full px-2 py-px text-[10px] font-medium"
                            style={
                              seg.consent === "agreed"
                                ? { background: "#E1F5EE", color: "#0F6E56" }
                                : { background: "#F7F7F5", color: "#5F5E5A" }
                            }
                          >
                            수신동의: {seg.consent === "agreed" ? "동의만" : "전체"}
                          </span>
                          {seg.referenceMonth && (
                            <span className="text-[11px] text-[#9A9994]">
                              {seg.referenceMonth} {typeMeta?.timeLabel} 기준
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Field>
            {selectedSegment && (
              <div className="text-[13px] font-semibold text-[#08B1A9]">
                {selectedSegment.companyCount.toLocaleString()}개사 · {selectedSegment.userCount.toLocaleString()}명에게 발송 예정
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={onPrev}
          className="rounded-lg border border-black/15 bg-transparent px-4 py-2 text-[13px] text-[#5F5E5A] hover:bg-[#F7F7F5]"
        >
          ← 이전
        </button>
        <div className="flex gap-2">
          <button
            onClick={onTest}
            className="rounded-lg border border-black/15 bg-transparent px-4 py-2 text-[13px] text-[#5F5E5A] hover:bg-[#F7F7F5]"
          >
            테스트 발송
          </button>
          <button
            disabled={!canSubmit}
            onClick={onSend}
            className="rounded-lg border border-[#08B1A9] bg-[#08B1A9] px-5 py-2 text-[13px] font-medium text-white hover:bg-[#0F6E56] disabled:opacity-50"
          >
            발송 요청 →
          </button>
        </div>
      </div>
    </div>
  );
}

function DropZoneCsv({ onParsed }: { onParsed: (d: CsvData) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File) => {
    const text = await file.text();
    onParsed(parseCsv(text));
    setFileName(file.name);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) void handleFile(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-10 text-center transition ${
          dragOver ? "border-[#08B1A9] bg-[#E1F5EE]" : "border-black/20 bg-[#F7F7F5] hover:border-[#08B1A9]"
        }`}
      >
        <div className="text-[28px]">📂</div>
        <div className="text-[13px] font-medium text-[#1A1A18]">
          CSV 파일을 끌어다 놓거나 클릭해서 업로드
        </div>
        <div className="text-[11px] text-[#9A9994]">
          {fileName ?? "첫 번째 행은 헤더여야 합니다"}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) await handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

// =================== Modals ===================

function ConfirmModal({
  summary,
  onCancel,
  onConfirm,
}: {
  summary: {
    count: number;
    channel: "email" | "alimtalk";
    templateName: string;
    campaignName: string;
  };
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="w-[90%] max-w-[440px] rounded-xl border border-black/10 bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 text-[16px] font-semibold">발송 요청 확인</div>
        <div className="mb-4 space-y-1 text-[13px] text-[#5F5E5A]">
          <div>
            캠페인: <strong className="text-[#1A1A18]">{summary.campaignName}</strong>
          </div>
          <div>
            채널:{" "}
            <strong className="text-[#1A1A18]">
              {summary.channel === "email" ? "이메일" : "알림톡"}
            </strong>
          </div>
          <div>
            템플릿: <strong className="text-[#1A1A18]">{summary.templateName}</strong>
          </div>
          <div>
            총 <strong className="text-[#08B1A9]">{summary.count}명</strong>에게 발송됩니다
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-black/15 bg-transparent px-4 py-2 text-[13px] text-[#5F5E5A] hover:bg-[#F7F7F5]"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg border border-[#08B1A9] bg-[#08B1A9] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#0F6E56]"
          >
            발송 요청
          </button>
        </div>
      </div>
    </div>
  );
}

function TestSendModal(props: {
  channel: "email" | "alimtalk";
  variables: string[];
  subject?: string;
  body?: string;
  templateId?: string;
  templateCode?: string;
  layoutSkuId?: string;
  onClose: () => void;
  onToast: (msg: string) => void;
}) {
  const [addr, setAddr] = useState("");
  const [sampleVars, setSampleVars] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const send = async () => {
    const items = addr.split(",").map((s) => s.trim()).filter(Boolean);
    if (items.length === 0) {
      alert("수신 주소를 입력하세요.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/send/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: props.channel,
          templateId: props.templateId,
          templateCode: props.templateCode,
          subject: props.subject,
          subjectPrefix: "[테스트] ",
          body: props.body,
          layoutSkuId: props.layoutSkuId,
          recipients: items.map((a) =>
            props.channel === "email"
              ? { email: a, vars: sampleVars }
              : { phone: a, vars: sampleVars }
          ),
        }),
      });
      const data = await res.json();
      props.onClose();
      props.onToast(
        data.mode === "live" ? "NHN 테스트 발송 완료" : `테스트 발송 시뮬레이션 (${items.length}건)`
      );
    } catch (e) {
      alert("테스트 발송 실패: " + String(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40"
      onClick={props.onClose}
    >
      <div
        className="w-[90%] max-w-[480px] rounded-xl border border-black/10 bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 text-[16px] font-semibold">
          테스트 발송 · {props.channel === "email" ? "이메일" : "알림톡"}
        </div>
        <Field
          label={props.channel === "email" ? "테스트 수신 이메일" : "테스트 수신 전화번호"}
          hint="쉼표로 구분해서 여러 명 입력 가능"
        >
          <input
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            placeholder={props.channel === "email" ? "amber@v1c.com, me@v1c.com" : "01012345678"}
            className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 font-mono text-[13px] outline-none focus:border-[#08B1A9]"
          />
        </Field>
        {props.variables.map((v) => (
          <Field key={v} label={`샘플 ${v}`}>
            <input
              value={sampleVars[v] ?? ""}
              onChange={(e) => setSampleVars((s) => ({ ...s, [v]: e.target.value }))}
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-[13px] outline-none focus:border-[#08B1A9]"
            />
          </Field>
        ))}
        {props.channel === "email" && (
          <div className="mb-2 text-[11px] text-[#9A9994]">
            제목 앞에 <code className="rounded bg-[#F7F7F5] px-1 py-0.5">[테스트]</code> prefix가 자동 추가됩니다.
          </div>
        )}
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={props.onClose}
            className="rounded-lg border border-black/15 bg-transparent px-4 py-2 text-[13px] text-[#5F5E5A] hover:bg-[#F7F7F5]"
          >
            취소
          </button>
          <button
            onClick={send}
            disabled={sending}
            className="rounded-lg border border-[#08B1A9] bg-[#08B1A9] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#0F6E56] disabled:opacity-50"
          >
            {sending ? "발송 중..." : "테스트 발송"}
          </button>
        </div>
      </div>
    </div>
  );
}

// =================== Reused building blocks ===================

function TemplateList({
  templates,
  selectedId,
  onSelect,
}: {
  templates: Template[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex max-h-[360px] flex-col gap-1.5 overflow-y-auto pr-1">
      {templates.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={`rounded-lg border px-3 py-2 text-left transition ${
            t.id === selectedId
              ? "border-[#08B1A9] bg-[#E1F5EE]"
              : "border-black/10 hover:bg-[#F7F7F5]"
          }`}
        >
          <div className="text-[13px] font-medium">
            <TemplateName id={t.id} />
          </div>
          <div className="mt-0.5 truncate font-mono text-[10px] text-[#9A9994]">{t.code}</div>
        </button>
      ))}
    </div>
  );
}

function AlimTemplateList({
  templates,
  selectedId,
  onSelect,
}: {
  templates: AlimTemplate[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex max-h-[360px] flex-col gap-1.5 overflow-y-auto pr-1">
      {templates.map((t) => {
        const approved = t.status === "approved";
        const isSel = t.id === selectedId;
        return (
          <button
            key={t.id}
            disabled={!approved}
            onClick={() => onSelect(t.id)}
            className={`rounded-lg border px-3 py-2 text-left transition ${
              isSel ? "border-[#08B1A9] bg-[#E1F5EE]" : "border-black/10 hover:bg-[#F7F7F5]"
            } ${!approved ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <div className="mb-0.5 flex items-center justify-between gap-2">
              <div className="truncate text-[13px] font-medium">
                <TemplateName id={t.id} />
              </div>
              <TemplateStatusBadge status={t.status} />
            </div>
            <div className="font-mono text-[10px] text-[#9A9994]">{t.code}</div>
          </button>
        );
      })}
    </div>
  );
}

function CsvPreview({ data }: { data: CsvData }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-black/10">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="bg-[#F7F7F5]">
            {data.headers.map((h) => (
              <th key={h} className="px-2 py-1.5 text-left font-medium text-[#5F5E5A]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.slice(0, 3).map((r, i) => (
            <tr key={i} className="border-t border-black/10">
              {r.map((c, j) => (
                <td key={j} className="px-2 py-1.5 font-mono text-[11px] text-[#5F5E5A]">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.rows.length > 3 && (
        <div className="border-t border-black/10 bg-[#F7F7F5] px-2 py-1 text-[10px] text-[#9A9994]">
          외 {data.rows.length - 3}행
        </div>
      )}
    </div>
  );
}

/** SKU top-bar colors (overrides layout.primaryColor with the design spec). */
const SKU_TOP_BAR: Record<string, string> = {
  "clobe-ai": "#08B1A9",
  "clobe-finance": "#3B5BDB",
  "clobe-connect": "#7950F2",
};

function EmailPreview({
  mode,
  subject,
  bodyHtml,
  templateBodyLoading = false,
  layoutSkuId,
  layoutHeaderId,
  senderEmail,
  onSenderEmail,
  values = {},
}: {
  mode: Mode;
  subject: string;
  /** HTML string to render. `null` → template body not loaded / unavailable. */
  bodyHtml: string | null;
  templateBodyLoading?: boolean;
  layoutSkuId?: string;
  layoutHeaderId?: string;
  senderEmail: string;
  onSenderEmail: (v: string) => void;
  values?: Record<string, string>;
}) {
  const renderedSubject = applyEmailVars(subject, values);
  const topBarColor = layoutSkuId ? SKU_TOP_BAR[layoutSkuId] : null;

  // Substitute variables producing HTML markup so unfilled vars can be styled.
  const substitutedHtml = bodyHtml
    ? bodyHtml.replace(/\$\{([^}]+)\}/g, (_, k) => {
        const key = k.trim();
        const v = values[key];
        if (v !== undefined && v !== "") {
          return escapeHtml(v);
        }
        return `<span style="color:#9A9994">[${escapeHtml(key)}]</span>`;
      })
    : "";

  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{ background: "#f5f5f5" }}
    >
      {/* Meta area */}
      <div className="border-b border-black/10 bg-white px-4 py-3">
        <div className="mb-2 flex items-center gap-2 text-[12px]">
          <span className="w-12 shrink-0 text-[#9A9994]">발신</span>
          {mode === "free" ? (
            <input
              value={senderEmail}
              onChange={(e) => onSenderEmail(e.target.value)}
              className="flex-1 rounded-md border border-black/10 bg-white px-2 py-1 font-mono text-[12px] outline-none focus:border-[#08B1A9]"
            />
          ) : (
            <span className="font-mono text-[12px] text-[#5F5E5A]">{senderEmail}</span>
          )}
        </div>
        <div className="flex items-start gap-2 text-[13px]">
          <span className="mt-0.5 w-12 shrink-0 text-[12px] text-[#9A9994]">제목</span>
          <span
            className={`font-semibold leading-snug ${
              renderedSubject ? "text-[#1A1A18]" : "text-[#9A9994]"
            }`}
          >
            {renderedSubject || "(제목 없음)"}
          </span>
        </div>
      </div>

      {/* Body card */}
      <div className="px-4 py-5">
        <div
          className="mx-auto max-h-[480px] overflow-y-auto rounded-lg bg-white"
          style={{ maxWidth: 520, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}
        >
          {topBarColor && (
            <div>
              <div
                className="flex items-center px-5 text-[13px] font-medium text-white"
                style={{ background: topBarColor, height: 48 }}
              >
                {/* Real header HTML lives in the NHN layout template. */}
                클로브 레이아웃 헤더
              </div>
              <div className="border-b border-black/5 bg-[#FAFAFA] px-5 py-1.5 text-[10px] text-[#9A9994]">
                실제 헤더는 NHN 레이아웃 템플릿(
                {layoutHeaderId ? (
                  <code className="font-mono">{layoutHeaderId}</code>
                ) : (
                  "—"
                )}
                )에서 관리됩니다
              </div>
            </div>
          )}

          <div className="px-6 py-6 text-[13px] leading-relaxed text-[#1A1A18]">
            {templateBodyLoading ? (
              <div className="rounded-lg bg-[#F7F7F5] px-3 py-4 text-center text-[12px] text-[#9A9994]">
                NHN에서 본문 불러오는 중…
              </div>
            ) : bodyHtml === null && mode === "template" ? (
              <div className="rounded-lg bg-[#F7F7F5] px-3 py-4 text-center text-[12px] text-[#9A9994]">
                본문은 NHN 콘솔에서 확인하세요
              </div>
            ) : substitutedHtml ? (
              <div
                className="email-body-preview"
                dangerouslySetInnerHTML={{ __html: substitutedHtml }}
              />
            ) : (
              <div className="text-[12px] text-[#9A9994]">본문을 입력하세요</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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

export function TemplateStatusBadge({ status }: { status: TemplateStatus }) {
  const map: Record<TemplateStatus, { bg: string; fg: string; label: string }> = {
    approved: { bg: "#E1F5EE", fg: "#0F6E56", label: "승인" },
    pending: { bg: "#FAEEDA", fg: "#854F0B", label: "심사중" },
    rejected: { bg: "#FCEBEB", fg: "#A32D2D", label: "반려" },
    draft: { bg: "#F7F7F5", fg: "#5F5E5A", label: "임시" },
  };
  const s = map[status];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}
