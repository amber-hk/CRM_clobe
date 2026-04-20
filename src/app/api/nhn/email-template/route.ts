import { NextResponse } from "next/server";

/**
 * NHN email template detail proxy.
 *
 *   GET /api/nhn/email-template?templateId=xxx
 *
 * Upstream:
 *   GET https://email.api.nhncloudservice.com/email/v2.1
 *         /appKeys/{NHN_EMAIL_APPKEY}/templates/{templateId}
 *
 * Always returns `{ body, error? }` with `body` being the HTML string (or null).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const templateId = searchParams.get("templateId");
  if (!templateId) {
    return NextResponse.json(
      { body: null, error: "templateId query param required" },
      { status: 400 }
    );
  }

  const appKey = process.env.NHN_EMAIL_APPKEY;
  const secret = process.env.NHN_EMAIL_SECRET_KEY;
  if (!appKey || !secret) {
    return NextResponse.json({
      body: null,
      error: "NHN_EMAIL_APPKEY not set",
    });
  }

  const url = `https://email.api.nhncloudservice.com/email/v2.1/appKeys/${appKey}/templates/${encodeURIComponent(templateId)}`;
  try {
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "X-Secret-Key": secret,
      },
      cache: "no-store",
    });
    const json = (await res.json()) as {
      header?: { isSuccessful?: boolean; resultMessage?: string };
      body?: unknown;
    };
    if (!res.ok || json.header?.isSuccessful === false) {
      return NextResponse.json({
        body: null,
        error: json.header?.resultMessage ?? `NHN ${res.status}`,
      });
    }
    // NHN wraps responses as { header, body: { data: {...template row...} } }.
    // Try common field names in order.
    const data = extract(json.body);
    const htmlBody =
      data?.body ??
      data?.bodyText ??
      data?.bodyHtml ??
      data?.templateBody ??
      null;
    return NextResponse.json({ body: htmlBody });
  } catch (e) {
    return NextResponse.json({ body: null, error: String(e) });
  }
}

function extract(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object") return null;
  const b = value as Record<string, unknown>;
  if (b.data && typeof b.data === "object") return b.data as Record<string, string>;
  return b as Record<string, string>;
}
