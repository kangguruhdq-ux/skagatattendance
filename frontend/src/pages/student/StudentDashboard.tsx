import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Clock3,
  XCircle,
  TrendingUp,
  QrCode,
  Camera,
  Calendar,
  Radio,
  MapPin,
  Fingerprint,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Clock,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { getStudentDashboard, getStudentActiveSessions } from "../../api/studentService";
import { getBiometricStatus } from "../../api/webauthnService";
import type { StudentDashboard as StudentDashboardType, ActiveSessionItem } from "../../types";
import { ApiRequestError } from "../../api/client";
import { formatWibTime } from "../../utils/date";
import { Card, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import StatusBadge from "../../components/StatusBadge";
import { DashboardSkeleton } from "../../components/ui/Skeleton";

export default function StudentDashboard() {
  const [data, setData] = useState<StudentDashboardType | null>(null);
  const [activeSessions, setActiveSessions] = useState<ActiveSessionItem[]>([]);
  const [biometricEnrolled, setBiometricEnrolled] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getStudentDashboard(),
      getStudentActiveSessions().catch(() => ({ sessions: [] })),
      getBiometricStatus().catch(() => null),
    ])
      .then(([dash, act, bio]) => {
        setData(dash);
        setActiveSessions(act.sessions || []);
        if (bio) setBiometricEnrolled(bio.enrolled);
      })
      .catch((e) => {
        setError(e instanceof ApiRequestError ? e.friendlyMessage : "Gagal memuat dashboard siswa.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <Card className="p-8 text-center border-rose-500/30">
        <XCircle className="mx-auto text-rose-400 mb-3" size={40} />
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

  // Check if there are active sessions that student hasn't attended yet
  const pendingActiveSession = activeSessions.find(
    (s) => s.status === "active" && !s.has_checked_in
  );
  const attendedTodaySession = activeSessions.find((s) => s.has_checked_in);

  const firstName = data.full_name.split(" ")[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ========================================================================= */}
      {/* 1. HERO GREETING & PROFILE BANNER */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900/40 via-slate-900/80 to-slate-950 border border-brand-500/20 p-5 sm:p-8 shadow-2xl backdrop-blur-xl animate-fadeIn">
        {/* Subtle background glow circle */}
        <div className="absolute top-0 right-0 w-48 h-48 sm:w-80 sm:h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none animate-float" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-300 text-xs font-semibold mb-2.5">
              <Sparkles size={13} /> Siswa SMK Negeri 3 Yogyakarta
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Halo, {firstName}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Kelas: <span className="font-semibold text-white">{data.class_name || "XI TKJ 1"}</span>
              {data.student_code && (
                <span className="text-slate-400 font-mono ml-2">({data.student_code})</span>
              )}
            </p>
          </div>

          {/* Today's Check-in Status Badge */}
          <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between sm:justify-start gap-4 shrink-0 shadow-lg">
            <div className="text-left">
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Status Presensi Hari Ini
              </p>
              <div className="mt-1">
                {data.today_status ? (
                  <StatusBadge status={data.today_status} size="md" />
                ) : (
                  <StatusBadge status="not_started" size="md" customLabel="Belum Presensi" />
                )}
              </div>
            </div>
            <div className="h-10 w-px bg-slate-800" />
            <div className="text-right">
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Kehadiran
              </p>
              <p className="text-xl sm:text-2xl font-black text-emerald-400 leading-tight">
                {data.attendance_rate}%
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. PRIMARY ATTENDANCE CTAs (CLEAR VISUAL HIERARCHY) */}
        {/* ========================================================================= */}
        <div className="mt-7 pt-6 border-t border-slate-800/80">
          <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            PILIH METODE PRESENSI
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* CTA 1: Scan QR */}
            <Link to="/student/scan" className="group">
              <div className="relative rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 p-4 sm:p-5 text-white shadow-xl shadow-brand-600/25 border border-brand-400/40 transition-all duration-200 transform group-hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 rounded-xl bg-white/15 backdrop-blur-md text-white shadow-inner">
                      <QrCode size={26} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base tracking-tight leading-snug">
                        Scan QR Presensi
                      </h3>
                      <p className="text-xs text-brand-100/90 mt-0.5">
                        Arahkan kamera ke QR code sesi guru
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    size={20}
                    className="transform group-hover:translate-x-1 transition-transform opacity-90 shrink-0"
                  />
                </div>
              </div>
            </Link>

            {/* CTA 2: Absen dengan Foto */}
            <Link to="/student/photo" className="group">
              <div className="relative rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 p-4 sm:p-5 text-white shadow-lg border border-slate-700/80 hover:border-emerald-500/50 transition-all duration-200 transform group-hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-inner">
                      <Camera size={26} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-base tracking-tight leading-snug">
                          Absen dengan Foto
                        </h3>
                        <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          Praktis
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Pilih sesi aktif & foto selfie langsung
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    size={20}
                    className="text-slate-400 transform group-hover:translate-x-1 group-hover:text-emerald-300 transition-all shrink-0"
                  />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ACTIVE SESSION BANNER (IF AVAILABLE) */}
      {/* ========================================================================= */}
      {pendingActiveSession ? (
        <Card className="border-brand-500/40 bg-brand-950/20 shadow-brand-500/10 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                  SESI PRESENSI AKTIF SEKARANG
                </span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {pendingActiveSession.subject_name}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {pendingActiveSession.class_name} • {pendingActiveSession.teacher_name || "Guru"} •{" "}
                <span className="font-mono text-brand-300">
                  {pendingActiveSession.start_time} - {pendingActiveSession.end_time}
                </span>
              </p>

              {/* Requirement chips */}
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                {pendingActiveSession.require_gps && (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-slate-900/80 px-2 py-0.5 rounded-md text-slate-300 border border-slate-700">
                    <MapPin size={11} className="text-amber-400" /> GPS Radius
                  </span>
                )}
                {pendingActiveSession.require_biometric && (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-slate-900/80 px-2 py-0.5 rounded-md text-slate-300 border border-slate-700">
                    <Fingerprint size={11} className="text-brand-400" /> Biometrik
                  </span>
                )}
                {pendingActiveSession.require_photo && (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-slate-900/80 px-2 py-0.5 rounded-md text-slate-300 border border-slate-700">
                    <Camera size={11} className="text-emerald-400" /> Bukti Foto
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
              <Link to="/student/photo" className="w-full sm:w-auto">
                <Button variant="primary" size="md" fullWidth leftIcon={<Camera size={16} />}>
                  Absen Sekarang
                </Button>
              </Link>
              <Link to="/student/scan" className="w-full sm:w-auto">
                <Button variant="secondary" size="md" fullWidth leftIcon={<QrCode size={16} />}>
                  Scan QR
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      ) : attendedTodaySession ? (
        <Card className="p-4 border-emerald-500/30 bg-emerald-950/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-emerald-400 shrink-0" size={22} />
              <div>
                <p className="text-sm font-bold text-white">
                  Sudah Presensi: {attendedTodaySession.subject_name}
                </p>
                <p className="text-xs text-slate-400">
                  Tercatat pukul {formatWibTime(attendedTodaySession.checked_in_at)} WIB • Status:{" "}
                  <span className="uppercase font-semibold text-emerald-300">{attendedTodaySession.checked_in_status}</span>
                </p>
              </div>
            </div>
            <Link to="/student/history" className="self-end sm:self-auto">
              <Button variant="ghost" size="sm">
                Lihat Detail
              </Button>
            </Link>
          </div>
        </Card>
      ) : null}

      {/* ========================================================================= */}
      {/* 4. ATTENDANCE STATISTICS CARDS */}
      {/* ========================================================================= */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Statistik Kehadiran Semester Ini
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-3.5 stagger-children">
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 transition-transform hover:-translate-y-1 hover:border-emerald-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Hadir</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <p className="text-2xl font-black text-white mt-2">{data.present}</p>
            <p className="text-[11px] text-emerald-400/90 mt-0.5">Tepat Waktu</p>
          </div>

          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 transition-transform hover:-translate-y-1 hover:border-amber-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Terlambat</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Clock3 size={18} />
              </div>
            </div>
            <p className="text-2xl font-black text-white mt-2">{data.late}</p>
            <p className="text-[11px] text-amber-400/90 mt-0.5">Dispensasi waktu</p>
          </div>

          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 transition-transform hover:-translate-y-1 hover:border-rose-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Alpa</span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                <XCircle size={18} />
              </div>
            </div>
            <p className="text-2xl font-black text-white mt-2">{data.absent}</p>
            <p className="text-[11px] text-rose-400/90 mt-0.5">Tanpa keterangan</p>
          </div>

          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 transition-transform hover:-translate-y-1 hover:border-sky-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Izin</span>
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                <TrendingUp size={18} />
              </div>
            </div>
            <p className="text-2xl font-black text-white mt-2">{data.excused}</p>
            <p className="text-[11px] text-sky-400/90 mt-0.5">Surat izin resmi</p>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-2xl bg-slate-900/80 border border-slate-800 p-4 transition-transform hover:-translate-y-1 hover:border-violet-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Sakit</span>
              <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
                <TrendingUp size={18} />
              </div>
            </div>
            <p className="text-2xl font-black text-white mt-2">{data.sick}</p>
            <p className="text-[11px] text-violet-400/90 mt-0.5">Keterangan dokter</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. BIOMETRIC STATUS & TODAY SCHEDULE */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Today's Schedule (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="text-brand-400" size={18} />
              <h2 className="font-bold text-white text-base">Jadwal Pelajaran Hari Ini</h2>
            </div>
            <Link to="/student/schedule" className="text-xs text-brand-400 hover:text-brand-300 font-medium">
              Lihat Semua
            </Link>
          </div>

          {data.today_schedule.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
              Tidak ada jadwal pelajaran hari ini.
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.today_schedule.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 bg-slate-950/60 border border-slate-800/80 rounded-xl px-3.5 sm:px-4 py-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-white truncate">{s.subject}</p>
                      <p className="text-[11px] sm:text-xs text-slate-400 truncate">{s.room || "Ruang Kelas"}</p>
                    </div>
                  </div>
                  <span className="text-[11px] sm:text-xs text-slate-300 font-mono bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 shrink-0">
                    {s.start_time} - {s.end_time}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Biometric Status Card (1 col) */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Fingerprint className="text-brand-400" size={20} />
              <h3 className="font-bold text-white text-base">Biometrik Perangkat</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Daftarkan sidik jari atau Face ID perangkat Anda untuk presensi instan tanpa password.
            </p>

            <div className="mt-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              {biometricEnrolled === null ? (
                <p className="text-xs text-slate-400">Memeriksa status...</p>
              ) : biometricEnrolled ? (
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 size={16} /> Perangkat Terdaftar & Aktif
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                  <AlertCircle size={16} /> Belum Didaftarkan
                </div>
              )}
            </div>
          </div>

          <Link to="/student/biometric" className="w-full">
            <Button
              variant={biometricEnrolled ? "secondary" : "primary"}
              size="sm"
              fullWidth
              leftIcon={<Fingerprint size={16} />}
            >
              {biometricEnrolled ? "Kelola Perangkat" : "Daftarkan Sekarang"}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
