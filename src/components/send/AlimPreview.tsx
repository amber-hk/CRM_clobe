"use client";

/**
 * KakaoTalk AlimTalk preview. Branches on `templateEmphasizeType` and
 * `templateMessageType` to mirror what end users actually see in chat.
 */

import type { AlimButton, AlimTemplate } from "@/types/crm";

type Props = {
  template: AlimTemplate | undefined;
  /** Variable values keyed by name (without `#{}`). */
  values: Record<string, string>;
};

const TIME = "오전 9:00";

export function AlimPreview({ template, values }: Props) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#B2C7D9" }}>
      <div className="mb-2 text-center text-[10px] text-[#5B6470]">@clobe</div>

      <div className="flex items-start gap-2">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px]"
          style={{ background: "#08B1A9" }}
        >
          🐝
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 text-[12px] font-bold text-[#1A1A18]">클로브</div>
          <div className="flex items-end gap-1.5">
            <div className="min-w-0 flex-1">
              {template ? (
                <Bubble template={template} values={values} />
              ) : (
                <div className="rounded-xl bg-white px-3 py-2 text-[12px] text-[#9A9994]">
                  템플릿을 선택하세요
                </div>
              )}
            </div>
            <div className="shrink-0 self-end text-[10px] text-[#5B6470]">{TIME}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({
  template: t,
  values,
}: {
  template: AlimTemplate;
  values: Record<string, string>;
}) {
  // Channel-add (MI) sits below the regular bubble as its own block.
  return (
    <>
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {t.templateEmphasizeType === "IMAGE" && <ImageBlock template={t} values={values} />}
        {t.templateEmphasizeType === "ITEM_LIST" && <ItemListBlock template={t} values={values} />}
        {t.templateEmphasizeType === "TEXT" && <TextEmphasisBlock template={t} values={values} />}
        {(t.templateEmphasizeType === "NONE" || !t.templateEmphasizeType) && (
          <BasicBlock template={t} values={values} />
        )}

        {t.buttons.length > 0 && <Buttons buttons={t.buttons} />}
      </div>

      {t.templateMessageType === "MI" && t.templateAd && (
        <div className="mt-2 overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="px-3 py-2.5 text-[11px] italic text-[#9A9994]">
            {render(t.templateAd, values)}
          </div>
          <div
            className="border-t border-[#eee] py-2.5 text-center text-[12px] font-medium text-[#1A1A18]"
            style={{ background: "#FEE500" }}
          >
            채널 추가
          </div>
        </div>
      )}
    </>
  );
}

// ---------------- Block variants ----------------

function ImageBlock({ template: t, values }: { template: AlimTemplate; values: Record<string, string> }) {
  return (
    <>
      {t.templateImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={t.templateImageUrl}
          alt={t.templateImageName ?? ""}
          className="block w-full"
          style={{ maxHeight: 160, objectFit: "cover" }}
        />
      )}
      <div className="px-3 pt-3">
        {t.templateHeader && (
          <div className="mb-2 text-[14px] font-bold text-[#1A1A18]">
            {render(t.templateHeader, values)}
          </div>
        )}
        <Body content={t.content ?? ""} values={values} />
      </div>
    </>
  );
}

function ItemListBlock({ template: t, values }: { template: AlimTemplate; values: Record<string, string> }) {
  return (
    <div className="px-3 pt-3">
      {t.templateItemHighlight && (
        <div className="mb-3 rounded-lg bg-[#F4F6F9] px-3 py-2.5">
          <div className="text-[14px] font-bold text-[#1A1A18]">
            {render(t.templateItemHighlight.title, values)}
          </div>
          <div className="mt-0.5 text-[11px] text-[#5F5E5A]">
            {render(t.templateItemHighlight.description, values)}
          </div>
        </div>
      )}
      {t.templateHeader && (
        <div className="mb-2 text-[13px] font-bold text-[#1A1A18]">
          {render(t.templateHeader, values)}
        </div>
      )}
      {t.templateItem && (
        <>
          <div className="mb-2 flex flex-col gap-1">
            {t.templateItem.list.map((row, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3 text-[12px]">
                <span className="text-[#5F5E5A]">{render(row.title, values)}</span>
                <span className="text-right text-[#1A1A18]">
                  {render(row.description, values)}
                </span>
              </div>
            ))}
          </div>
          <div className="my-2 border-t border-dashed border-[#E5E5E5]" />
          <div className="mb-2 flex items-baseline justify-between gap-3 text-[12px]">
            <span className="text-[#5F5E5A]">{render(t.templateItem.summary.title, values)}</span>
            <span className="text-right font-bold text-[#1A1A18]">
              {render(t.templateItem.summary.description, values)}
            </span>
          </div>
        </>
      )}
      <Body content={t.content ?? ""} values={values} />
    </div>
  );
}

function TextEmphasisBlock({
  template: t,
  values,
}: {
  template: AlimTemplate;
  values: Record<string, string>;
}) {
  return (
    <div className="px-3 pt-3">
      {t.templateTitle && (
        <div className="text-[18px] font-bold leading-tight text-[#1A1A18]">
          {render(t.templateTitle, values)}
        </div>
      )}
      {t.templateSubtitle && (
        <div className="mt-0.5 text-[11px] text-[#5F5E5A]">
          {render(t.templateSubtitle, values)}
        </div>
      )}
      <div className="mt-2">
        <Body content={t.content ?? ""} values={values} />
      </div>
      {t.templateExtra && (
        <div className="mt-3 rounded-lg bg-[#F4F6F9] px-3 py-2 text-[11px] leading-relaxed text-[#5F5E5A]">
          {render(t.templateExtra, values)}
        </div>
      )}
    </div>
  );
}

function BasicBlock({ template: t, values }: { template: AlimTemplate; values: Record<string, string> }) {
  return (
    <div className="px-3 pt-3">
      <Body content={t.content ?? ""} values={values} />
    </div>
  );
}

function Body({ content, values }: { content: string; values: Record<string, string> }) {
  return (
    <div className="whitespace-pre-wrap pb-3 text-[13px] leading-relaxed text-[#1A1A18]">
      {renderTokens(content, values)}
    </div>
  );
}

// ---------------- Buttons ----------------

function Buttons({ buttons }: { buttons: AlimButton[] }) {
  const sorted = [...buttons].sort((a, b) => a.ordering - b.ordering);
  return (
    <div className="mt-1 border-t border-[#eee]">
      {sorted.map((b, i) => {
        const isAdd = b.type === "AC";
        return (
          <div
            key={i}
            className="border-b border-[#eee] py-2.5 text-center text-[12px] font-medium last:border-b-0"
            style={
              isAdd
                ? { background: "#FEE500", color: "#1A1A18" }
                : { color: "#3C89F9" }
            }
          >
            {b.name}
          </div>
        );
      })}
    </div>
  );
}

// ---------------- Variable rendering ----------------

const VAR_RE = /#\{([^}]+)\}/g;

function render(text: string | null | undefined, values: Record<string, string>): string {
  if (!text) return "";
  return text.replace(VAR_RE, (_, k) => values[k.trim()] ?? `{{${k.trim()}}}`);
}

/** Like `render` but produces React nodes so unfilled variables can be styled. */
function renderTokens(text: string, values: Record<string, string>): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(VAR_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    const key = m[1].trim();
    const val = values[key];
    if (val !== undefined && val !== "") {
      out.push(<strong key={i++} className="text-[#1A1A18]">{val}</strong>);
    } else {
      out.push(
        <span key={i++} className="text-[#9A9994]">{`{{${key}}}`}</span>
      );
    }
    last = idx + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
