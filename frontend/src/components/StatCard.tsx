import type { LucideIcon } from "lucide-react";

export default function StatCard({
  label, value, icon: Icon, accent = "brand", sub,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "brand" | "emerald" | "amber" | "rose";
  sub?: string;
}) {
  const accentMap: Record<string, string> = {
    brand: "text-brand-400 bg-brand-500/10",
    emerald: "text-emerald-400 bg-emerald-500/10",
    amber: "text-amber-400 bg-amber-500/10",
    rose: "text-rose-400 bg-rose-500/10",
  };
  return (
    <div className="glass-card p-5 flex items-start justify-between">
      <div>
        <p className="text-slate-400 text-sm">{label}</p>
        <p className="text-2xl font-bold mt-1 text-white">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </div>
      <div className={`p-2.5 rounded-xl ${accentMap[accent]}`}>
        <Icon size={20} />
      </div>
    </div>
  );
}
