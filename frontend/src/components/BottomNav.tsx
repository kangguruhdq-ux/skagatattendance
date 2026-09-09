import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  QrCode,
  CalendarClock,
  History,
  Fingerprint,
  PlusCircle,
  ClipboardList,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext";

const STUDENT_ITEMS = [
  { to: "/student", label: "Beranda", icon: LayoutDashboard, end: true },
  { to: "/student/scan", label: "Scan QR", icon: QrCode },
  { to: "/student/photo", label: "Absen Foto", icon: PlusCircle },
  { to: "/student/history", label: "Riwayat", icon: History },
  { to: "/student/biometric", label: "Biometrik", icon: Fingerprint },
];

const TEACHER_ITEMS = [
  { to: "/teacher", label: "Beranda", icon: LayoutDashboard, end: true },
  { to: "/teacher/sessions/new", label: "Buat Sesi", icon: PlusCircle },
  { to: "/teacher/sessions", label: "Sesi Saya", icon: ClipboardList },
];

export default function BottomNav() {
  const { role } = useAuth();

  if (role === "admin") return null;

  const items = role === "teacher" ? TEACHER_ITEMS : STUDENT_ITEMS;

  return (
    <nav
      aria-label="Navigasi Bawah"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/85 dark:bg-slate-950/85 backdrop-blur-2xl border-t border-slate-200/80 dark:border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.35)] pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-around px-2 py-1.5 max-w-lg mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  "flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 min-w-[56px] min-h-[48px] active:scale-95",
                  isActive
                    ? "text-brand-600 dark:text-brand-400 font-semibold"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={clsx(
                      "p-1.5 rounded-xl transition-all duration-200",
                      isActive
                        ? "bg-brand-500/20 text-brand-600 dark:text-brand-300 scale-110 -translate-y-0.5 shadow-sm shadow-brand-500/20"
                        : "text-slate-500 dark:text-slate-400"
                    )}
                  >
                    <Icon size={19} />
                  </div>
                  <span
                    className={clsx(
                      "text-[10px] tracking-tight mt-0.5 leading-tight transition-colors",
                      isActive ? "font-bold text-brand-600 dark:text-brand-300" : "font-medium"
                    )}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

