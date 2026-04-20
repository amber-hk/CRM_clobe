"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  FileText,
  History,
  LayoutDashboard,
  Send,
  Settings,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { mockCtrWarnings, mockTrackingWarnings, mockDormantTemplates } from "@/lib/mock-data";

type Item = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: "warn";
};

const SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: "현황",
    items: [
      { href: "/", label: "대시보드", icon: LayoutDashboard },
      { href: "/warnings", label: "워닝", icon: AlertTriangle, badge: "warn" },
    ],
  },
  {
    title: "발송",
    items: [
      { href: "/send", label: "발송하기", icon: Send },
      { href: "/history", label: "발송이력", icon: History },
    ],
  },
  {
    title: "관리",
    items: [
      { href: "/automation", label: "자동화 현황", icon: Zap },
      { href: "/templates", label: "템플릿 관리", icon: FileText },
    ],
  },
  {
    title: "",
    items: [{ href: "/settings", label: "설정", icon: Settings }],
  },
];

function useWarningCount(): number {
  // Keep in sync with warnings page aggregation.
  const ctr = mockCtrWarnings.filter((r) => r.sends > 0 && r.ctr < 10).length;
  const dormant = mockDormantTemplates.filter((t) => t.sends7d / 7 < 3).length;
  return ctr + mockTrackingWarnings.length + dormant;
}

export function Sidebar() {
  const pathname = usePathname();
  const warnings = useWarningCount();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="flex h-screen w-[200px] flex-col border-r border-black/10 bg-white">
      <Link
        href="/"
        className="flex h-14 items-center px-5 text-[15px] font-semibold tracking-tight text-[#08B1A9]"
      >
        Clobe CRM
      </Link>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
        {SECTIONS.map((section, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            {section.title && (
              <div className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-[#9A9994]">
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              const iconColor =
                item.badge === "warn" && !active ? "#E24B4A" : undefined;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition ${
                    active
                      ? "bg-[#08B1A9] font-medium text-white"
                      : "text-[#5F5E5A] hover:bg-[#F7F7F5] hover:text-[#1A1A18]"
                  }`}
                >
                  <Icon
                    size={16}
                    strokeWidth={2}
                    color={active ? "#fff" : iconColor}
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.badge === "warn" && warnings > 0 && (
                    <span
                      className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
                        active ? "bg-white text-[#E24B4A]" : "bg-[#E24B4A] text-white"
                      }`}
                    >
                      {warnings}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
