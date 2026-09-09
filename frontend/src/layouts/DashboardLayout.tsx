import React, { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
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
  Calendar,
  TrendingUp,
  ClipboardCheck,
  Bell,
  BellRing,
  LifeBuoy,
  HelpCircle,
  Sliders,
  FileText,
  Shield,
  User as UserIcon,
  Tv,
  Check,
  CheckCheck,
  Trash2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import BottomNav from "../components/BottomNav";
import SchoolLogo from "../components/SchoolLogo";
import ThemeToggle from "../components/ThemeToggle";
import { 
  getNotifications, 
  markNotificationRead, 
  markAllNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
} from "../api/notificationService";
import { getAvatarUrl, getProfile } from "../api/profileService";
import type { NotificationItem } from "../types";
import clsx from "clsx";

interface NavGroup {
  groupName: string;
  items: {
    to: string;
    label: string;
    icon: any;
    end?: boolean;
    badge?: string;
  }[];
}

const STUDENT_GROUPS: NavGroup[] = [
  {
    groupName: "PRESENSI",
    items: [
      { to: "/student", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/student/scan", label: "Scan QR", icon: QrCode },
      { to: "/student/photo", label: "Absen Foto", icon: Camera },
      { to: "/student/calendar", label: "Kalender Presensi", icon: Calendar },
      { to: "/student/history", label: "Riwayat Presensi", icon: History },
    ],
  },
  {
    groupName: "AKADEMIK",
    items: [
      { to: "/student/schedule", label: "Jadwal Pelajaran", icon: CalendarClock },
      { to: "/student/analytics", label: "Analitik Presensi", icon: TrendingUp },
      { to: "/student/corrections", label: "Koreksi Presensi", icon: ClipboardCheck },
    ],
  },
  {
    groupName: "LAYANAN & AKUN",
    items: [
      { to: "/announcements", label: "Pengumuman", icon: BellRing },
      { to: "/help", label: "Pusat Bantuan / FAQ", icon: HelpCircle },
      { to: "/support", label: "Tiket Bantuan", icon: LifeBuoy },
      { to: "/student/biometric", label: "Biometrik Face/Finger", icon: Fingerprint },
      { to: "/profile", label: "Profil & Pengaturan", icon: UserIcon },
    ],
  },
];

const TEACHER_GROUPS: NavGroup[] = [
  {
    groupName: "SESI PRESENSI",
    items: [
      { to: "/teacher", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/teacher/sessions/new", label: "Buat Sesi Baru", icon: QrCode },
      { to: "/teacher/sessions", label: "Daftar Sesi Saya", icon: ClipboardList },
      { to: "/teacher/live-monitor", label: "Live Monitor", icon: Tv },
    ],
  },
  {
    groupName: "KELAS & SISWA",
    items: [
      { to: "/teacher/students", label: "Roster Siswa", icon: Users },
      { to: "/teacher/analytics", label: "Analitik Kelas", icon: TrendingUp },
      { to: "/teacher/corrections", label: "Review Koreksi", icon: ClipboardCheck },
    ],
  },
  {
    groupName: "LAYANAN & AKUN",
    items: [
      { to: "/announcements", label: "Pengumuman Sekolah", icon: BellRing },
      { to: "/help", label: "Pusat Panduan & FAQ", icon: HelpCircle },
      { to: "/support", label: "Support Desk", icon: LifeBuoy },
      { to: "/profile", label: "Profil & Akun", icon: UserIcon },
    ],
  },
];

const ADMIN_GROUPS: NavGroup[] = [
  {
    groupName: "MASTER DATA",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/admin/users", label: "Kelola Pengguna", icon: Users },
      { to: "/admin/students", label: "Data Siswa", icon: GraduationCap },
      { to: "/admin/teachers", label: "Data Guru", icon: ShieldCheck },
      { to: "/admin/classes", label: "Kelas & Mapel", icon: BookOpen },
      { to: "/admin/schedules", label: "Jadwal Pelajaran", icon: CalendarClock },
    ],
  },
  {
    groupName: "PRESENSI & KOREKSI",
    items: [
      { to: "/admin/sessions", label: "Semua Sesi Presensi", icon: ClipboardList },
      { to: "/admin/reports", label: "Laporan Presensi", icon: History },
      { to: "/admin/corrections", label: "Koreksi Kehadiran", icon: ClipboardCheck },
    ],
  },
  {
    groupName: "SISTEM & KEAMANAN",
    items: [
      { to: "/announcements", label: "Pengumuman Sekolah", icon: BellRing },
      { to: "/help", label: "Pusat Panduan & FAQ", icon: HelpCircle },
      { to: "/support", label: "Tiket Dukungan", icon: LifeBuoy },
      { to: "/admin/settings", label: "Pengaturan & Geofence", icon: Sliders },
      { to: "/admin/activity-logs", label: "Log Audit Aktivitas", icon: FileText },
      { to: "/admin/security", label: "Kesehatan Sistem", icon: Shield },
      { to: "/profile", label: "Profil & Akun", icon: UserIcon },
    ],
  },
];

export default function DashboardLayout() {
  const { role, fullName, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const groups = role === "admin" ? ADMIN_GROUPS : role === "teacher" ? TEACHER_GROUPS : STUDENT_GROUPS;

  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => localStorage.getItem("skagata_avatar"));

  const fetchNotifs = async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unread_count || 0);
    } catch {
      // Quiet fail if not logged in
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Sync avatar from profile
    getProfile()
      .then((p) => {
        if (p.avatar_url) {
          setAvatarUrl(p.avatar_url);
          localStorage.setItem("skagata_avatar", p.avatar_url);
        } else {
          setAvatarUrl(null);
          localStorage.removeItem("skagata_avatar");
        }
      })
      .catch(() => {});

    const onAvatarUpdate = () => {
      setAvatarUrl(localStorage.getItem("skagata_avatar"));
    };
    window.addEventListener("avatar_updated", onAvatarUpdate);
    return () => window.removeEventListener("avatar_updated", onAvatarUpdate);
  }, []);

  // Close notif popover on click outside (attribute-based to support both desktop and mobile safely)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      const target = e.target as HTMLElement | null;
      if (
        notifOpen &&
        target &&
        !target.closest("[data-notif-container]") &&
        !target.closest("[data-notif-trigger]")
      ) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [notifOpen]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNotif = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAllNotifs = async () => {
    if (!window.confirm("Hapus semua riwayat notifikasi?")) return;
    try {
      await deleteAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      try {
        await markNotificationRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error(err);
      }
    }
    setNotifOpen(false);
    if (notif.link) {
      navigate(notif.link);
    } else if (notif.title?.toLowerCase().includes("pengumuman")) {
      navigate("/announcements");
    } else if (notif.title?.toLowerCase().includes("tiket") || notif.title?.toLowerCase().includes("bantuan")) {
      navigate("/support");
    }
  };

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
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/90 backdrop-blur-xl px-3 py-5 fixed inset-y-0 z-30 shadow-sm dark:shadow-none">
        <SidebarContent
          groups={groups}
          fullName={fullName}
          role={role}
          initials={initials}
          avatarUrl={avatarUrl}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 px-3 py-5 flex flex-col z-10 shadow-2xl drawer-animate">
            <div className="flex items-center justify-between mb-3 px-2">
              <SchoolLogo size="sm" showName />
              <button
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                onClick={() => setDrawerOpen(false)}
                aria-label="Tutup menu"
              >
                <X size={20} />
              </button>
            </div>
            <SidebarContent
              groups={groups}
              fullName={fullName}
              role={role}
              initials={initials}
              avatarUrl={avatarUrl}
              onLogout={handleLogout}
              onNavigate={() => setDrawerOpen(false)}
              showLogo={false}
            />
          </aside>
        </div>
      )}

      {/* Main content wrapper */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Topbar (desktop) */}
        <header className="hidden lg:flex items-center justify-between px-8 py-3.5 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {role === "admin" ? "Admin Portal" : role === "teacher" ? "Portal Guru" : "Portal Siswa"}
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              SMK Negeri 3 Yogyakarta
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell Dropdown (Desktop) */}
            <div className="relative" data-notif-container>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                data-notif-trigger
                className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Pusat Notifikasi"
                aria-label="Pusat Notifikasi"
              >
                <Bell size={19} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover (Desktop) */}
              {notifOpen && (
                <div 
                  data-notif-container
                  className="absolute right-0 mt-2 w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-drop-in"
                >
                  <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">Notifikasi</span>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-[10px] font-bold">
                          {unreadCount} baru
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                        >
                          <CheckCheck size={14} /> Tandai dibaca
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={handleDeleteAllNotifs}
                          className="text-xs text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 font-medium cursor-pointer transition-colors"
                          title="Hapus semua notifikasi"
                        >
                          <Trash2 size={13} /> Hapus semua
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        Tidak ada notifikasi.
                      </div>
                    ) : (
                      notifications.slice(0, 15).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`p-3 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-start justify-between gap-2.5 group/item ${
                            !n.is_read ? "bg-brand-50/40 dark:bg-brand-950/20" : ""
                          }`}
                        >
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!n.is_read ? "bg-brand-600" : "bg-transparent"}`} />
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-slate-900 dark:text-white truncate">{n.title}</div>
                              <p className="text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">{n.message}</p>
                              <span className="text-[10px] text-slate-400 mt-1 block">
                                {n.created_at ? new Date(n.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : ""}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteNotif(e, n.id)}
                            className="opacity-0 group-hover/item:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shrink-0 cursor-pointer"
                            title="Hapus notifikasi ini"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        navigate("/announcements");
                      }}
                      className="w-full text-center text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold py-1 cursor-pointer"
                    >
                      Buka Semua Pengumuman
                    </button>
                  </div>
                </div>
              )}
            </div>

            <ThemeToggle showLabel />
            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />
            
            {/* User Profile Clickable Link */}
            <Link
              to="/profile"
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {avatarUrl ? (
                <img
                  src={getAvatarUrl(avatarUrl)}
                  alt={fullName || "Profil"}
                  className="w-8 h-8 rounded-xl object-cover border border-brand-500/30 shrink-0 shadow-sm"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-brand-600/15 border border-brand-500/30 text-brand-700 dark:text-brand-300 text-xs font-bold flex items-center justify-center">
                  {initials}
                </div>
              )}
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">{fullName}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{role}</p>
              </div>
            </Link>
          </div>
        </header>

        {/* Topbar (mobile) */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Buka menu navigasi"
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Menu size={22} />
            </button>
            <SchoolLogo size="sm" showName />
          </div>

          <div className="flex items-center gap-2 relative" data-notif-container>
            {/* Mobile notification bell */}
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              data-notif-trigger
              className="relative p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-transform"
              aria-label="Notifikasi"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popover (Mobile) */}
            {notifOpen && (
              <div 
                data-notif-container
                className="fixed inset-x-3 top-14 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-drop-in"
              >
                <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">Notifikasi</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-[10px] font-bold">
                        {unreadCount} baru
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <CheckCheck size={14} /> Dibaca
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={handleDeleteAllNotifs}
                        className="text-xs text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 font-medium cursor-pointer transition-colors"
                        title="Hapus semua"
                      >
                        <Trash2 size={13} /> Hapus
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      Tidak ada notifikasi.
                    </div>
                  ) : (
                    notifications.slice(0, 15).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-3 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 active:bg-slate-100 transition-colors flex items-start justify-between gap-2 ${
                          !n.is_read ? "bg-brand-50/40 dark:bg-brand-950/20" : ""
                        }`}
                      >
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!n.is_read ? "bg-brand-600" : "bg-transparent"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white truncate">{n.title}</div>
                            <p className="text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">{n.message}</p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {n.created_at ? new Date(n.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : ""}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteNotif(e, n.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 active:scale-90 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shrink-0 cursor-pointer"
                          title="Hapus notifikasi ini"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setNotifOpen(false);
                      navigate("/announcements");
                    }}
                    className="w-full text-center text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold py-1.5 cursor-pointer block"
                  >
                    Buka Semua Pengumuman
                  </button>
                </div>
              </div>
            )}

            <ThemeToggle />
            <Link to="/profile">
              {avatarUrl ? (
                <img
                  src={getAvatarUrl(avatarUrl)}
                  alt={fullName || "Profil"}
                  className="w-8 h-8 rounded-full object-cover border border-brand-500/40 shrink-0 shadow-sm"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-brand-600/20 border border-brand-500/40 text-brand-700 dark:text-brand-300 text-xs font-bold flex items-center justify-center">
                  {initials}
                </div>
              )}
            </Link>
          </div>
        </header>

        {/* Content area */}
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
  groups,
  fullName,
  role,
  initials,
  avatarUrl,
  onLogout,
  onNavigate,
  showLogo = true,
}: {
  groups: NavGroup[];
  fullName: string | null;
  role: string | null;
  initials: string;
  avatarUrl?: string | null;
  onLogout: () => void;
  onNavigate?: () => void;
  showLogo?: boolean;
}) {
  return (
    <>
      {showLogo && (
        <div className="px-2 mb-4">
          <SchoolLogo size="md" showName />
        </div>
      )}

      <nav className="flex-1 space-y-4 overflow-y-auto pr-1 text-xs">
        {groups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              {group.groupName}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    clsx(
                      "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 group",
                      isActive
                        ? "bg-brand-600/15 text-brand-700 dark:text-brand-300 border border-brand-500/30 shadow-xs font-semibold translate-x-1"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:translate-x-0.5"
                    )
                  }
                >
                  <Icon size={16} className="shrink-0 transition-transform group-hover:scale-110" />
                  <span className="truncate flex-1">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User profile footer */}
      <div className="border-t border-slate-200 dark:border-slate-800/80 pt-3 mt-2">
        <Link
          to="/profile"
          onClick={onNavigate}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mb-2"
        >
          {avatarUrl ? (
            <img
              src={getAvatarUrl(avatarUrl)}
              alt={fullName || "Profil"}
              className="w-8 h-8 rounded-xl object-cover border border-brand-500/40 shrink-0 shadow-sm"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-brand-600/20 border border-brand-500/40 text-brand-700 dark:text-brand-300 font-bold text-xs flex items-center justify-center shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate leading-tight">{fullName}</p>
            <span className="inline-block px-1.5 py-0.2 mt-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[9px] text-slate-600 dark:text-slate-300 uppercase font-medium">
              {role}
            </span>
          </div>
        </Link>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-medium transition-colors"
        >
          <LogOut size={14} /> Keluar (Logout)
        </button>
      </div>
    </>
  );
}
