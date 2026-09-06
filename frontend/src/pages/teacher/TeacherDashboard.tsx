import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  Users,
  Activity,
  TrendingUp,
  Plus,
  ArrowRight,
  Sparkles,
  Clock,
  Radio,
  Eye,
  AlertCircle,
} from "lucide-react";
import { getTeacherDashboard } from "../../api/teacherService";
import type { TeacherDashboard as TeacherDashboardType } from "../../types";
import { ApiRequestError } from "../../api/client";
import { Card, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import StatusBadge from "../../components/StatusBadge";
import { DashboardSkeleton } from "../../components/ui/Skeleton";

export default function TeacherDashboard() {
  const [data, setData] = useState<TeacherDashboardType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTeacherDashboard()
      .then(setData)
      .catch((e) =>
        setError(e instanceof ApiRequestError ? e.friendlyMessage : "Gagal memuat dashboard guru.")
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <Card className="p-8 text-center border-rose-500/30">
        <AlertCircle className="mx-auto text-rose-400 mb-3" size={40} />
        <h3 className="text-lg font-bold text-white">Gagal Memuat Dashboard</h3>
        <p className="text-sm text-slate-400 mt-1">{error || "Terjadi kesalahan data."}</p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Coba Muat Ulang
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900/40 via-slate-900/80 to-slate-950 border border-brand-500/20 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-300 text-xs font-semibold mb-2">
              <Sparkles size={13} /> Dashboard Guru Pengampu
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Selamat Mengajar, {data.full_name}!
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Pantau kehadiran kelas dan jalankan sesi presensi aktif Anda hari ini.
            </p>
          </div>

          <Link to="/teacher/sessions/new" className="shrink-0">
            <Button variant="primary" size="lg" leftIcon={<Plus size={20} />}>
              Buat Sesi Baru
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Sesi Hari Ini</span>
            <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400">
              <CalendarClock size={20} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white mt-2">{data.today_sessions}</p>
          <p className="text-xs text-slate-400 mt-0.5">Sesi terjadwal</p>
        </div>

        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Sesi Aktif</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Activity size={20} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2">
            {data.active_sessions}
          </p>
          <p className="text-xs text-emerald-400/90 flex items-center gap-1.5 mt-0.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Sedang berlangsung
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Siswa Diajar</span>
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400">
              <Users size={20} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white mt-2">
            {data.total_students_taught}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Siswa terdaftar</p>
        </div>

        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Kehadiran Hari Ini</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <TrendingUp size={20} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-400 mt-2">
            {data.attendance_rate_today}%
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Rata-rata presensi</p>
        </div>
      </div>

      {/* Today's Sessions List */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Sesi Presensi Hari Ini</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Klik pada sesi untuk membuka monitor kehadiran langsung dan menampilkan QR.
            </p>
          </div>
          <Link to="/teacher/sessions">
            <Button variant="ghost" size="sm">
              Lihat Semua Sesi
            </Button>
          </Link>
        </div>

        {data.recent_sessions.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-slate-800 rounded-2xl">
            <Clock className="mx-auto text-slate-600 mb-2" size={36} />
            <p className="text-sm font-semibold text-slate-300">Belum ada sesi hari ini</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Buat sesi presensi baru untuk kelas Anda agar siswa dapat mulai melakukan absensi.
            </p>
            <Link to="/teacher/sessions/new" className="inline-block mt-4">
              <Button variant="primary" size="sm" leftIcon={<Plus size={16} />}>
                Buat Sesi Sekarang
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {data.recent_sessions.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl bg-slate-900/90 border border-slate-800/80 hover:border-brand-500/40 p-4 sm:p-5 transition-all duration-150 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{s.subject}</h3>
                    <StatusBadge status={s.status} size="sm" />
                  </div>
                  <p className="text-xs text-slate-400">
                    Kelas: <span className="text-slate-300 font-semibold">{s.class_name}</span> • Waktu:{" "}
                    <span className="font-mono text-slate-300">
                      {s.start_time} - {s.end_time} WIB
                    </span>
                  </p>
                </div>

                <Link to={`/teacher/sessions/${s.id}`} className="shrink-0">
                  <Button
                    variant={s.status === "active" ? "primary" : "secondary"}
                    size="sm"
                    rightIcon={<ArrowRight size={14} />}
                  >
                    {s.status === "active" ? "Buka Live Monitor" : "Lihat Rekap"}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
