import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid h-screen grid-cols-[200px_1fr] bg-[#F7F7F5]">
      <Sidebar />
      <main className="overflow-y-auto">
        <div className="mx-auto max-w-[1200px] px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
