import React, { useState, useEffect, useCallback } from "react";
import { 
  Tv, QrCode, Users, Clock, CheckCircle2, 
  ExternalLink, RefreshCw, AlertCircle, PlayCircle 
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getMySessions, getSessionRecords } from "../../api/teacherService";
import type { AttendanceRecordOut } from "../../types";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

interface SessionSummary {
  id: number;
  subject: string;
  class_name: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
}

export const TeacherLiveMonitor: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [sessionRecords, setSessionRecords] = useState<AttendanceRecordOut[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMySessions();
      const list = res.sessions || [];
      setSessions(list);

      // Auto-select first active session or first session
      const active = list.find((s: SessionSummary) => s.status === "active");
      if (active) {
        setSelectedSessionId(active.id);
      } else if (list.length > 0) {
        setSelectedSessionId(list[0].id);
      }
    } catch (err) {
      console.error("Gagal memuat sesi monitor live:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSelectedSession = useCallback(async (sessionId: number) => {
    setLoadingRecords(true);
    try {
      const res = await getSessionRecords(sessionId);
      setSessionRecords(res.records || []);
    } catch (err) {
      console.error("Gagal memuat rekam presensi:", err);
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (selectedSessionId) {
      fetchSelectedSession(selectedSessionId);
      // Poll every 10 seconds for real-time attendance feed
      const timer = setInterval(() => {
        fetchSelectedSession(selectedSessionId);
      }, 10000);
      return () => clearInterval(timer);
    }
  }, [selectedSessionId, fetchSelectedSession]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Tv className="text-brand-600 dark:text-brand-400" size={28} />
            Live Monitor Presensi
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pantau kehadiran siswa secara real-time saat sesi presensi sedang berjalan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchSessions}
            leftIcon={<RefreshCw size={15} className={loading ? "animate-spin" : ""} />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            onClick={() => navigate("/teacher/sessions/new")}
            leftIcon={<PlayCircle size={16} />}
          >
            Buka Sesi Baru
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="p-12 text-center bg-white dark:bg-slate-900">
          <RefreshCw className="animate-spin mx-auto text-brand-600 mb-3" size={32} />
          <p className="text-sm text-slate-500">Menghubungkan ke monitor real-time...</p>
        </Card>
      ) : sessions.length === 0 ? (
        <Card className="p-12 text-center bg-white dark:bg-slate-900">
          <Clock className="mx-auto text-slate-400 mb-3" size={40} />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">Tidak ada sesi presensi</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Belum ada sesi presensi yang dibuat. Buka sesi baru untuk memulai presensi kelas.
          </p>
          <Button
            variant="primary"
            onClick={() => navigate("/teacher/sessions/new")}
            className="mt-4"
          >
            Buat Sesi Sekarang
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Sesi Picker Column */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Daftar Sesi
            </h2>

            {sessions.map((s: SessionSummary) => {
              const isSelected = s.id === selectedSessionId;
              const isActive = s.status === "active";

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSessionId(s.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 ring-2 ring-brand-500/20"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        isActive
                          ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 animate-pulse"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {isActive ? "Sedang Berlangsung" : s.status}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {s.start_time} - {s.end_time} WIB
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                    {s.subject}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {s.class_name} • {s.date}
                  </p>

                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end text-xs text-slate-500">
                    <Link
                      to={`/teacher/sessions/${s.id}/monitor`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      Buka QR Penuh <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Realtime Attendee Feed (2 cols on lg) */}
          <Card className="lg:col-span-2 p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" /> Live Feed Kehadiran
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  Daftar Siswa Masuk ({sessionRecords.length})
                </h2>
              </div>

              {selectedSessionId && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => navigate(`/teacher/sessions/${selectedSessionId}/monitor`)}
                  leftIcon={<QrCode size={15} />}
                >
                  Layar Penuh QR
                </Button>
              )}
            </div>

            {loadingRecords ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <RefreshCw className="animate-spin mx-auto text-brand-600 mb-2" size={24} />
                Memperbarui live stream kehadiran...
              </div>
            ) : sessionRecords.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Users className="mx-auto text-slate-300 dark:text-slate-700 mb-2" size={36} />
                <p className="text-sm font-medium">Belum ada siswa yang melakukan check-in.</p>
                <p className="text-xs text-slate-400 mt-1">Siswa yang scan QR atau verifikasi foto akan langsung muncul di sini.</p>
              </div>
            ) : (
              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[550px] pr-1">
                {sessionRecords.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-bold flex items-center justify-center text-xs">
                        {r.student_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">
                          {r.student_name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {r.has_photo ? "Foto Bukti Kehadiran" : "Presensi Scan QR"}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          r.status === "present"
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                            : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        {r.status === "present" ? "Hadir Tepat Waktu" : "Terlambat"}
                      </span>
                      <div className="text-[11px] text-slate-400 mt-1 font-mono">
                        {r.checked_in_at ? new Date(r.checked_in_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"} WIB
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>
      )}
    </div>
  );
};

export default TeacherLiveMonitor;
