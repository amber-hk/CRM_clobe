import type { Sku } from "@/types/crm";
export type { Sku };
/** Dashboard UI filter (not the messaging channel — see `Channel` in crm.ts). */
export type Channel = "all" | "email" | "alim";

export const skuMeta: Record<Sku, { label: string; color: string; tagBg: string; tagText: string; tagBorder: string }> = {
  ai: { label: "클로브AI", color: "#1D9E75", tagBg: "#E1F5EE", tagText: "#0F6E56", tagBorder: "#5DCAA5" },
  fin: { label: "클로브금융", color: "#185FA5", tagBg: "#E6F1FB", tagText: "#185FA5", tagBorder: "#85B7EB" },
  con: { label: "클로브커넥트", color: "#534AB7", tagBg: "#EEEDFE", tagText: "#534AB7", tagBorder: "#AFA9EC" },
};

export const chartColor: Record<Sku, string> = {
  ai: "#08B1A9",
  fin: "#378ADD",
  con: "#7F77DD",
};

type ChannelStats = {
  sends: string;
  sendsSub: string;
  sendsDir: "up" | "down";
  openLabel: string;
  open: string;
  openSub: string;
  openDir: "up" | "down";
  ctr: string;
  ctrSub: string;
  ctrDir: "up" | "down";
  openRateTitle: string;
  openRates: { sku: Sku; pct: number }[];
  campaigns: {
    name: string;
    ch: "email" | "alim";
    sku: Sku;
    open: string;
    openDir: "up" | "down" | "flat";
    status: "진행중" | "종료";
  }[];
};

export const dashData: Record<Channel, ChannelStats> = {
  all: {
    sends: "284,120", sendsSub: "↑ 12.4% vs 지난달", sendsDir: "up",
    openLabel: "평균 오픈율", open: "31.2%", openSub: "↑ 2.1%p vs 지난달", openDir: "up",
    ctr: "8.7%", ctrSub: "↓ 0.4%p vs 지난달", ctrDir: "down",
    openRateTitle: "제품별 오픈율",
    openRates: [{ sku: "ai", pct: 78 }, { sku: "fin", pct: 44 }, { sku: "con", pct: 34 }],
    campaigns: [
      { name: "4월 부가세 안내", ch: "email", sku: "ai", open: "82.1%", openDir: "up", status: "진행중" },
      { name: "부가세 D-7 알림", ch: "alim", sku: "ai", open: "91.4%", openDir: "up", status: "진행중" },
      { name: "신기능 소개", ch: "email", sku: "con", open: "34.5%", openDir: "flat", status: "진행중" },
      { name: "무료 플랜 전환", ch: "email", sku: "ai", open: "18.2%", openDir: "down", status: "종료" },
      { name: "팩토링 만기 안내", ch: "alim", sku: "fin", open: "94.1%", openDir: "up", status: "진행중" },
    ],
  },
  email: {
    sends: "221,720", sendsSub: "↑ 9.8% vs 지난달", sendsDir: "up",
    openLabel: "평균 오픈율", open: "31.2%", openSub: "↑ 2.1%p vs 지난달", openDir: "up",
    ctr: "8.7%", ctrSub: "↓ 0.4%p vs 지난달", ctrDir: "down",
    openRateTitle: "제품별 이메일 오픈율",
    openRates: [{ sku: "ai", pct: 31 }, { sku: "fin", pct: 44 }, { sku: "con", pct: 34 }],
    campaigns: [
      { name: "4월 부가세 안내", ch: "email", sku: "ai", open: "82.1%", openDir: "up", status: "진행중" },
      { name: "신기능 소개", ch: "email", sku: "con", open: "34.5%", openDir: "flat", status: "진행중" },
      { name: "무료 플랜 전환", ch: "email", sku: "ai", open: "18.2%", openDir: "down", status: "종료" },
      { name: "법인 세무 안내", ch: "email", sku: "fin", open: "44.1%", openDir: "flat", status: "종료" },
    ],
  },
  alim: {
    sends: "62,400", sendsSub: "↑ 18.2% vs 지난달", sendsDir: "up",
    openLabel: "평균 수신율", open: "88.4%", openSub: "↑ 1.3%p vs 지난달", openDir: "up",
    ctr: "23.1%", ctrSub: "↑ 2.8%p vs 지난달", ctrDir: "up",
    openRateTitle: "제품별 알림톡 수신율",
    openRates: [{ sku: "ai", pct: 91 }, { sku: "fin", pct: 94 }, { sku: "con", pct: 87 }],
    campaigns: [
      { name: "부가세 D-7 알림", ch: "alim", sku: "ai", open: "91.4%", openDir: "up", status: "진행중" },
      { name: "팩토링 만기 안내", ch: "alim", sku: "fin", open: "94.1%", openDir: "up", status: "진행중" },
      { name: "가입 온보딩", ch: "alim", sku: "ai", open: "84.2%", openDir: "flat", status: "진행중" },
      { name: "첫 거래 축하", ch: "alim", sku: "ai", open: "89.3%", openDir: "flat", status: "종료" },
    ],
  },
};

/** "Today" anchor for all dashboard mock data. */
export const DASHBOARD_TODAY = new Date("2026-04-14T00:00:00");

export type TrendPoint = { date: string; ai: number; fin: number; con: number };

/** Deterministic 90-day series ending at DASHBOARD_TODAY (inclusive). */
export const trendDaily: TrendPoint[] = (() => {
  const out: TrendPoint[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(DASHBOARD_TODAY);
    d.setDate(d.getDate() - i);
    const day = d.getDay();
    const weekend = day === 0 || day === 6;
    const seed = (i * 37) % 100;
    const base = weekend ? 0.35 : 1;
    out.push({
      date: d.toISOString().slice(0, 10),
      ai:  Math.round(base * (4500 + seed * 45)),
      fin: Math.round(base * (1300 + seed * 14)),
      con: Math.round(base * (900  + seed * 10)),
    });
  }
  return out;
})();

/** Slice the 90-day trend to an inclusive [from, to] date range. */
export function getTrendRange(from: Date, to: Date): TrendPoint[] {
  const f = from.toISOString().slice(0, 10);
  const t = to.toISOString().slice(0, 10);
  return trendDaily.filter((p) => p.date >= f && p.date <= t);
}

/** Period snapshots. Custom ranges pick the closest snapshot by day count. */
export type PeriodKey = "7d" | "30d" | "90d";

export const PERIOD_DAYS: Record<PeriodKey, number> = { "7d": 7, "30d": 30, "90d": 90 };

export const dashDataByPeriod: Record<PeriodKey, Record<Channel, typeof dashData.all>> = {
  "7d": {
    all: {
      sends: "48,200", sendsSub: "↑ 8.1% vs 이전 7일", sendsDir: "up",
      openLabel: "평균 오픈율", open: "33.4%", openSub: "↑ 1.2%p vs 이전 7일", openDir: "up",
      ctr: "9.1%", ctrSub: "↑ 0.3%p vs 이전 7일", ctrDir: "up",
      openRateTitle: "제품별 오픈율",
      openRates: [{ sku: "ai", pct: 81 }, { sku: "fin", pct: 47 }, { sku: "con", pct: 36 }],
      campaigns: [
        { name: "4월 부가세 안내", ch: "email", sku: "ai", open: "82.1%", openDir: "up", status: "진행중" },
        { name: "부가세 D-7 알림", ch: "alim", sku: "ai", open: "91.4%", openDir: "up", status: "진행중" },
        { name: "신기능 소개", ch: "email", sku: "con", open: "34.5%", openDir: "flat", status: "진행중" },
      ],
    },
    email: { ...dashData.email, sends: "38,100", sendsSub: "↑ 6.4% vs 이전 7일", open: "32.8%" },
    alim:  { ...dashData.alim,  sends: "10,100", sendsSub: "↑ 14.2% vs 이전 7일", open: "89.1%" },
  },
  "30d": dashData,
  "90d": {
    all: {
      sends: "712,800", sendsSub: "↑ 22.6% vs 이전 90일", sendsDir: "up",
      openLabel: "평균 오픈율", open: "29.8%", openSub: "↓ 0.6%p vs 이전 90일", openDir: "down",
      ctr: "8.2%", ctrSub: "↓ 0.8%p vs 이전 90일", ctrDir: "down",
      openRateTitle: "제품별 오픈율",
      openRates: [{ sku: "ai", pct: 74 }, { sku: "fin", pct: 42 }, { sku: "con", pct: 31 }],
      campaigns: dashData.all.campaigns,
    },
    email: { ...dashData.email, sends: "551,220", sendsSub: "↑ 18.3% vs 이전 90일", open: "29.6%" },
    alim:  { ...dashData.alim,  sends: "161,580", sendsSub: "↑ 34.1% vs 이전 90일", open: "87.9%" },
  },
};

/** Pick the snapshot whose preset days is closest to the requested range length. */
export function pickPeriodSnapshot(days: number): PeriodKey {
  const keys: PeriodKey[] = ["7d", "30d", "90d"];
  return keys.reduce((best, k) =>
    Math.abs(PERIOD_DAYS[k] - days) < Math.abs(PERIOD_DAYS[best] - days) ? k : best
  );
}

export type PendingReason = "cap" | "weekend" | "holiday" | "scheduled";

export type Timeslot = {
  /** 0 = Mon .. 6 = Sun, matching `weekDays`. */
  day: number;
  hour: number;
  sku: Sku;
  type: "done" | "plan";
  name: string;
  count: string;
  /** Estimated/actual send volume as a number for aggregations. */
  countNum: number;
  trigger: "자동화" | "수동";
  /** Messaging channel for the send. */
  channel: "email" | "alimtalk";
  /** Required for `type: "plan"` — why it's sitting in the queue. */
  reason?: PendingReason;
};
export const ttSchedules: Timeslot[] = [
  { day: 0, hour: 10, sku: "ai",  type: "done", name: "가입 후 3일 온보딩",     count: "1,240건",       countNum:  1240, trigger: "자동화", channel: "email" },
  { day: 1, hour: 9,  sku: "fin", type: "done", name: "팩토링 만기 안내",       count: "312건",          countNum:   312, trigger: "자동화", channel: "alimtalk" },
  { day: 1, hour: 14, sku: "ai",  type: "done", name: "4월 부가세 신고 안내",    count: "48,200건",       countNum: 48200, trigger: "수동",   channel: "email" },
  { day: 2, hour: 9,  sku: "ai",  type: "done", name: "부가세 D-7 리마인더",     count: "21,300건",       countNum: 21300, trigger: "자동화", channel: "alimtalk" },
  { day: 2, hour: 14, sku: "con", type: "done", name: "세무대리인 리포트",       count: "2,180건",        countNum:  2180, trigger: "자동화", channel: "email" },
  { day: 3, hour: 10, sku: "ai",  type: "plan", name: "온보딩 Day 3",            count: "예정 ~1,200건",   countNum:  1200, trigger: "자동화", channel: "email",    reason: "cap" },
  { day: 3, hour: 15, sku: "fin", type: "plan", name: "팩토링 만기 안내",       count: "예정 ~300건",     countNum:   300, trigger: "자동화", channel: "alimtalk", reason: "scheduled" },
  { day: 4, hour: 11, sku: "con", type: "plan", name: "세무대리인 월간 리포트",  count: "예정 ~2,000건",   countNum:  2000, trigger: "자동화", channel: "email",    reason: "scheduled" },
  { day: 4, hour: 14, sku: "ai",  type: "plan", name: "5월 업데이트 예고",       count: "예정 ~55,000건",  countNum: 55000, trigger: "수동",   channel: "email",    reason: "weekend" },
  { day: 5, hour: 9,  sku: "fin", type: "plan", name: "주말 리마인더",           count: "예정 ~800건",     countNum:   800, trigger: "자동화", channel: "alimtalk", reason: "weekend" },
  { day: 6, hour: 10, sku: "ai",  type: "plan", name: "공휴일 리마인더",         count: "예정 ~1,500건",   countNum:  1500, trigger: "자동화", channel: "email",    reason: "holiday" },
];

export const weekDays = [
  { label: "월", date: "4/7" },
  { label: "화", date: "4/8" },
  { label: "수", date: "4/9", today: true },
  { label: "목", date: "4/10" },
  { label: "금", date: "4/11" },
  { label: "토", date: "4/12" },
  { label: "일", date: "4/13" },
];

export const pendingReasonLabel: Record<PendingReason, { label: string; bg: string; fg: string }> = {
  cap:       { label: "cap 초과",   bg: "#FAEEDA", fg: "#854F0B" },
  weekend:   { label: "주말 지연",  bg: "#EEEDFE", fg: "#534AB7" },
  holiday:   { label: "공휴일 지연", bg: "#FCEBEB", fg: "#A32D2D" },
  scheduled: { label: "예약 발송",  bg: "#E6F1FB", fg: "#185FA5" },
};

/** Resolve a schedule slot to an "MM.DD HH:mm" string anchored on this week. */
export function timeslotWhen(s: Timeslot): string {
  const d = weekDays[s.day].date; // "4/10"
  const [m, day] = d.split("/");
  return `${m.padStart(2, "0")}.${day.padStart(2, "0")} ${String(s.hour).padStart(2, "0")}:00`;
}
