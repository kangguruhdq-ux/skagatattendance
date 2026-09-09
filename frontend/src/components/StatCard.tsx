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
    <div className="glass-card p-3.5 sm:p-5 flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm truncate">{label}</p>
        <p className="text-xl sm:text-2xl font-bold mt-1 text-slate-900 dark:text-white">{value}</p>
        {sub && <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">{sub}</p>}
      </div>
      <div className={`p-2 sm:p-2.5 rounded-xl shrink-0 ${accentMap[accent]}`}>
        <Icon size={18} className="sm:w-5 sm:h-5" />
      </div>
    </div>
  );
}
