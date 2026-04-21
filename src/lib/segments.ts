"use client";

export type SegmentType =
  | "no_workspace"
  | "no_data_connection"
  | "no_tax_agent"
  | "no_login_this_month";

export type ConsentFilter = "all" | "agreed";
export type SegmentStatus = "pending" | "done";

export type Segment = {
  id: string;
  type: SegmentType;
  /** e.g. "2026-03" or null for all-time */
  referenceMonth: string | null;
  consent: ConsentFilter;
  /** 회사 수 */
  companyCount: number;
  /** 유저 수 (마수동은 유저 단위이므로 실제 발송 대상) */
  userCount: number;
  status: SegmentStatus;
  createdAt: string;
  label: string;
};

export const SEGMENT_TYPES: {
  value: SegmentType;
  label: string;
  description: string;
  currentBasis: string;
  timeLabel: string;
}[] = [
  {
    value: "no_workspace",
    label: "워크스페이스 미생성",
    description: "지금 워크스페이스가 없는 유저",
    currentBasis: "현재 기준: 지금 워크스페이스가 없는 유저",
    timeLabel: "가입 완료 시점",
  },
  {
    value: "no_data_connection",
    label: "데이터 미연동",
    description: "지금 데이터 연동이 안 된 회사",
    currentBasis: "현재 기준: 지금 데이터 연동이 안 된 회사",
    timeLabel: "워크스페이스 생성 완료 시점",
  },
  {
    value: "no_tax_agent",
    label: "세무대리인 미연동",
    description: "지금 클로브커넥트 세무대리인 연동이 안 된 회사",
    currentBasis: "현재 기준: 지금 클로브커넥트 세무대리인 연동이 안 된 회사",
    timeLabel: "워크스페이스 생성 완료 시점",
  },
  {
    value: "no_login_this_month",
    label: "이번달 미접속",
    description: "이번달 로그인 기록이 없는 회사",
    currentBasis: "현재 기준: 이번달 로그인 기록이 없는 회사",
    timeLabel: "마지막 접속 시점",
  },
];

const CONSENT_LABEL: Record<ConsentFilter, string> = {
  all: "전체",
  agreed: "동의만",
};

export function buildSegmentLabel(
  type: SegmentType,
  month: string | null,
  consent: ConsentFilter
): string {
  const meta = SEGMENT_TYPES.find((s) => s.value === type)!;
  const timePart = month
    ? `${month} ${meta.timeLabel} 기준`
    : "전체기간";
  const consentPart =
    consent === "all" ? "" : ` · 마케팅 ${CONSENT_LABEL[consent]}`;
  return `${meta.label} · ${timePart}${consentPart}`;
}

const LOCAL_KEY = "crm_segments";

function loadLocal(): Segment[] {
  if (typeof window === "undefined") return MOCK_SEGMENTS;
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) {
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(MOCK_SEGMENTS));
      return MOCK_SEGMENTS;
    }
    const parsed = JSON.parse(raw) as Segment[];
    // Migrate: old schema had `count` instead of companyCount/userCount.
    if (parsed.length > 0 && parsed[0].companyCount === undefined) {
      window.localStorage.removeItem(LOCAL_KEY);
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(MOCK_SEGMENTS));
      return MOCK_SEGMENTS;
    }
    return parsed;
  } catch {
    return MOCK_SEGMENTS;
  }
}

function saveLocal(list: Segment[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
}

export function getSegments(): Segment[] {
  return loadLocal();
}

export function addSegment(seg: Segment): void {
  const list = loadLocal();
  list.unshift(seg);
  saveLocal(list);
}

export function completeSegment(
  id: string,
  companyCount: number,
  userCount: number
): void {
  const list = loadLocal();
  const idx = list.findIndex((s) => s.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], status: "done", companyCount, userCount };
    saveLocal(list);
  }
}

const MOCK_SEGMENTS: Segment[] = [
  {
    id: "seg-1",
    type: "no_data_connection",
    referenceMonth: "2026-03",
    consent: "agreed",
    companyCount: 342,
    userCount: 614,
    status: "done",
    createdAt: "2026-04-01T09:00:00Z",
    label: "데이터 미연동 · 2026-03 워크스페이스 생성 완료 시점 기준 · 마케팅 동의",
  },
  {
    id: "seg-2",
    type: "no_tax_agent",
    referenceMonth: "2026-02",
    consent: "all",
    companyCount: 218,
    userCount: 385,
    status: "done",
    createdAt: "2026-04-05T10:00:00Z",
    label: "세무대리인 미연동 · 2026-02 워크스페이스 생성 완료 시점 기준",
  },
  {
    id: "seg-3",
    type: "no_login_this_month",
    referenceMonth: "2026-03",
    consent: "all",
    companyCount: 1820,
    userCount: 4210,
    status: "done",
    createdAt: "2026-04-10T11:00:00Z",
    label: "이번달 미접속 · 2026-03 마지막 접속 시점 기준",
  },
  {
    id: "seg-4",
    type: "no_workspace",
    referenceMonth: null,
    consent: "agreed",
    companyCount: 156,
    userCount: 156,
    status: "done",
    createdAt: "2026-04-15T14:00:00Z",
    label: "워크스페이스 미생성 · 전체기간 · 마케팅 동의",
  },
];
