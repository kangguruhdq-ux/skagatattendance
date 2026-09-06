import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  QrCode,
  CalendarClock,
  History,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Fingerprint,
  Camera,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import BottomNav from "../components/BottomNav";
import clsx from "clsx";

const STUDENT_NAV = [
  { to: "/student", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/student/scan", label: "Scan QR", icon: QrCode },
  { to: "/student/photo", label: "Absen dengan Foto", icon: Camera },
  { to: "/student/schedule", label: "Jadwal Pelajaran", icon: CalendarClock },
  { to: "/student/history", label: "Riwayat Presensi", icon: History },
  { to: "/student/biometric", label: "Fingerprint / Face ID", icon: Fingerprint },
];

const TEACHER_NAV = [
  { to: "/teacher", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/teacher/sessions/new", label: "Buat Sesi Presensi", icon: QrCode },
  { to: "/teacher/sessions", label: "Daftar Sesi Saya", icon: ClipboardList },
];

const ADMIN_NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/students", label: "Data Siswa", icon: GraduationCap },
  { to: "/admin/teachers", label: "Data Guru", icon: Users },
  { to: "/admin/classes", label: "Kelas & Mapel", icon: BookOpen },
  { to: "/admin/reports", label: "Laporan Presensi", icon: ClipboardList },
];

export default function DashboardLayout() {
  const { role, fullName, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  const nav = role === "admin" ? ADMIN_NAV : role === "teacher" ? TEACHER_NAV : STUDENT_NAV;

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const initials = fullName
    ? fullName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "SK";

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-slate-800/80 bg-slate-950/90 backdrop-blur-xl px-4 py-6 fixed inset-y-0 z-30">
        <SidebarContent
          nav={nav}
          fullName={fullName}
          role={role}
          initials={initials}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-slate-950 border-r border-slate-800 px-4 py-6 flex flex-col z-10 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-brand-600/20 text-brand-400">
                  <ShieldCheck size={20} />
                </div>
                <span className="font-extrabold text-white">SKAGATA</span>
              </div>
              <button
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                onClick={() => setDrawerOpen(false)}
                aria-label="Tutup menu"
              >
                <X size={20} />
              </button>
            </div>
            <SidebarContent
              nav={nav}
              fullName={fullName}
              role={role}
              initials={initials}
              onLogout={handleLogout}
              onNavigate={() => setDrawerOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main content wrapper */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Topbar (mobile) */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Buka menu navigasi"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-brand-600/20 text-brand-400">
                <ShieldCheck size={18} />
              </div>
              <span className="font-bold text-white tracking-wide text-sm">SKAGATA</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-600/30 border border-brand-500/40 text-brand-300 text-xs font-bold flex items-center justify-center">
              {initials}
            </div>
          </div>
        </header>

        {/* Content area: extra bottom padding on mobile for BottomNav */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Sticky Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

function SidebarContent({
  nav,
  fullName,
  role,
  initials,
  onLogout,
  onNavigate,
}: {
  nav: { to: string; label: string; icon: any; end?: boolean }[];
  fullName: string | null;
  role: string | null;
  initials: string;
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3 px-2 mb-7">
        <div className="p-2.5 rounded-xl bg-brand-600/20 text-brand-400 shadow-glow border border-brand-500/20">
          <ShieldCheck size={22} />
        </div>
        <div>
          <p className="font-black text-white text-base tracking-wider leading-none">SKAGATA</p>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">
            Smart Attendance
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-brand-600/20 text-brand-300 border border-brand-500/30 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/70"
                )
              }
            >
              <Icon size={18} className="shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User profile footer */}
      <div className="border-t border-slate-800/80 pt-4 mt-4">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600/30 border border-brand-500/40 text-brand-300 font-bold text-xs flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate leading-tight">{fullName}</p>
            <span className="inline-block px-2 py-0.5 mt-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-slate-300 uppercase font-medium">
              {role}
            </span>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 font-medium transition-colors"
        >
          <LogOut size={16} /> Keluar (Logout)
        </button>
      </div>
    </>
  );
}
