import React, { useState, useEffect } from "react";
import { 
  BarChart3, RefreshCw, CheckCircle2, Clock, 
  Camera, Users, BookOpen, AlertTriangle 
} from "lucide-react";
import { getTeacherAnalytics, type TeacherAnalyticsData } from "../../api/teacherService";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export const TeacherAnalytics: React.FC = () => {
  const [data, setData] = useState<TeacherAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getTeacherAnalytics();
      setData(res);
    } catch (err) {
      console.error("Gagal memuat analitik guru:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <BarChart3 className="text-brand-600 dark:text-brand-400" size={28} />
            Statistik & Analitik Kelas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Ringkasan kehadiran siswa, performa kelas yang diampu, dan status verifikasi foto.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={fetchData}
          leftIcon={<RefreshCw size={15} className={loading ? "animate-spin" : ""} />}
        >
          Refresh
        </Button>
      </div>

      {loading ? (
        <Card className="p-12 text-center bg-white dark:bg-slate-900">
          <RefreshCw className="animate-spin mx-auto text-brand-600 mb-3" size={32} />
          <p className="text-sm text-slate-500">Memuat data analitik...</p>
        </Card>
      ) : !data ? (
        <Card className="p-8 text-center bg-white dark:bg-slate-900">
          <p className="text-sm text-slate-500">Data analitik tidak tersedia.</p>
        </Card>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 stagger-children">
            <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Sesi Dibuka</span>
                <BookOpen size={18} className="text-slate-400" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">{data.total_sessions}</p>
              <span className="text-[11px] text-slate-400">Sepanjang semester</span>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-950/60 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Rata-Rata Hadir</span>
                <CheckCircle2 size={18} className="text-emerald-500" />
              </div>
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">{data.attendance_rate}%</p>
              <span className="text-[11px] text-slate-400">Siswa hadir / tepat waktu</span>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border-blue-100 dark:border-blue-950/60 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Total Check-In</span>
                <Users size={18} className="text-blue-500" />
              </div>
              <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-2">{data.total_records}</p>
              <span className="text-[11px] text-slate-400">Rekam presensi siswa</span>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border-amber-100 dark:border-amber-950/60 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Foto Pending</span>
                <Camera size={18} className="text-amber-500" />
              </div>
              <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-2">{data.pending_photos}</p>
              <span className="text-[11px] text-slate-400">Menunggu review guru</span>
            </Card>
          </div>

          {/* Attendance Breakdown */}
          <Card className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Status Presensi Siswa Keseluruhan
            </h2>

            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Hadir (Tepat Waktu)</span>
                  <span>{data.present_count} ({data.total_records > 0 ? Math.round((data.present_count / data.total_records) * 100) : 0}%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${data.total_records > 0 ? (data.present_count / data.total_records) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Terlambat</span>
                  <span>{data.late_count} ({data.total_records > 0 ? Math.round((data.late_count / data.total_records) * 100) : 0}%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${data.total_records > 0 ? (data.late_count / data.total_records) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Izin & Sakit</span>
                  <span>{data.excused_count + data.sick_count} ({data.total_records > 0 ? Math.round(((data.excused_count + data.sick_count) / data.total_records) * 100) : 0}%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${data.total_records > 0 ? ((data.excused_count + data.sick_count) / data.total_records) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Alpha / Tanpa Keterangan</span>
                  <span>{data.absent_count} ({data.total_records > 0 ? Math.round((data.absent_count / data.total_records) * 100) : 0}%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full"
                    style={{ width: `${data.total_records > 0 ? (data.absent_count / data.total_records) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Class Breakdown */}
          <Card className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Performa Kehadiran per Kelas
            </h2>

            {data.class_breakdown.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Belum ada data kelas yang tercatat.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.class_breakdown.map((c) => (
                  <div
                    key={c.class_id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{c.class_name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {c.sessions_count} sesi telah diselenggarakan
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-extrabold text-slate-900 dark:text-white">
                        {c.attendance_rate}%
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          c.attendance_rate >= 85
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                            : c.attendance_rate >= 75
                            ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                            : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                        }`}
                      >
                        {c.attendance_rate >= 85 ? "Sangat Baik" : c.attendance_rate >= 75 ? "Cukup" : "Perlu Perhatian"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default TeacherAnalytics;
