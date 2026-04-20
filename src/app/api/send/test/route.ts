import { NextResponse } from "next/server";

/**
 * Test-send endpoint. For AlimTalk we call NHN's messages endpoint live when
 * credentials are configured; email sending is still stubbed until we wire
 * the NHN email POST body.
 *
 * POST body:
 *   { channel: "alimtalk",
 *     templateCode: string,
 *     recipients: Array<{ phone: string; vars?: Record<string,string> }>,
 *     subjectPrefix?: string }
 *   { channel: "email",
 *     templateId?: string,       // when using a template
 *     subject: string,
 *     body: string,
 *     recipients: Array<{ email: string; vars?: Record<string,string> }>,
 *     layoutSkuId?: string }
 */
export async function POST(req: Request) {
  const payload = (await req.json()) as {
    channel: "email" | "alimtalk";
    templateCode?: string;
    subject?: string;
    body?: string;
    recipients: { phone?: string; email?: string; vars?: Record<string, string> }[];
    subjectPrefix?: string;
    layoutSkuId?: string;
  };

  if (payload.channel === "alimtalk") {
    const appkey = process.env.NHN_APPKEY;
    const senderKey = process.env.NHN_SENDER_KEY;
    const secret = process.env.NHN_SECRET_KEY;
    if (!appkey || !senderKey || !secret) {
      return NextResponse.json({
        ok: true,
        mode: "stub",
        message: "NHN 자격증명이 없어 시뮬레이션으로 처리됨",
        sentCount: payload.recipients.length,
      });
    }
    const res = await fetch(
      `https://api-alimtalk.cloud.toast.com/alimtalk/v2.3/appkeys/${appkey}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          "X-Secret-Key": secret,
        },
        body: JSON.stringify({
          senderKey,
          templateCode: payload.templateCode,
          recipientList: payload.recipients.map((r) => ({
            recipientNo: r.phone,
            templateParameter: r.vars ?? {},
          })),
        }),
      }
    );
    const body = await res.json();
    return NextResponse.json({ ok: res.ok, mode: "live", nhn: body });
  }

  // TODO: NHN email send — requires POSTing to
  //   /email/v2.1/appKeys/{appKey}/sender/mail with templateId + recipients.
  // Stubbing success for now so the UI flow can be exercised end-to-end.
  return NextResponse.json({
    ok: true,
    mode: "stub",
    message: "이메일 테스트 발송은 아직 시뮬레이션 단계입니다",
    sentCount: payload.recipients.length,
    subjectPreview: `${payload.subjectPrefix ?? ""}${payload.subject ?? ""}`,
    layoutSkuId: payload.layoutSkuId,
  });
}
