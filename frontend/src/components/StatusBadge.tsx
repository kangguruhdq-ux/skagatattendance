import React from "react";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Clock3, XCircle, AlertCircle, Radio, UserCheck, ShieldAlert } from "lucide-react";

interface StatusConfigItem {
  label: string;
  style: string;
  icon: LucideIcon;
}

const CONFIG: Record<string, StatusConfigItem> = {
  present: {
    label: "Hadir (Present)",
    style: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    icon: CheckCircle2,
  },
  late: {
    label: "Terlambat (Late)",
    style: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    icon: Clock3,
  },
  absent: {
    label: "Alpa (Absent)",
    style: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    icon: XCircle,
  },
  excused: {
    label: "Izin (Excused)",
    style: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    icon: UserCheck,
  },
  sick: {
    label: "Sakit (Sick)",
    style: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    icon: AlertCircle,
  },
  active: {
    label: "Aktif (Active)",
    style: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    icon: Radio,
  },
  not_started: {
    label: "Belum Mulai",
    style: "bg-slate-500/15 text-slate-400 border-slate-600/40",
    icon: Clock3,
  },
  expired: {
    label: "Selesai (Expired)",
    style: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    icon: ShieldAlert,
  },
};

export default function StatusBadge({
  status,
  size = "md",
  showIcon = true,
  customLabel,
}: {
  status: string;
  size?: "sm" | "md";
  showIcon?: boolean;
  customLabel?: string;
}) {
  const normalized = status.toLowerCase();
  const cfg = CONFIG[normalized] || {
    label: status.replace("_", " "),
    style: "bg-slate-500/15 text-slate-400 border-slate-600/40",
    icon: AlertCircle,
  };

  const Icon = cfg.icon;

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 font-medium border rounded-full select-none",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-xs",
        cfg.style
      )}
    >
      {showIcon && (
        <Icon
          size={size === "sm" ? 12 : 14}
          className={clsx("shrink-0", normalized === "active" && "animate-pulse")}
        />
      )}
      <span className="capitalize">{customLabel || cfg.label}</span>
    </span>
  );
}
