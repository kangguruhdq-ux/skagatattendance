import React, { useState, useEffect, useMemo } from "react";
import { 
  TrendingUp, CheckCircle2, Clock, AlertCircle, 
  BarChart3, RefreshCw, BookOpen, Award 
} from "lucide-react";
import { getStudentAttendanceHistory } from "../../api/studentService";
import type { AttendanceHistoryItem } from "../../types";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export const StudentAnalytics: React.FC = () => {
  const [records, setRecords] = useState<AttendanceHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await getStudentAttendanceHistory();
      setRecords(res.records || []);
    } catch (err) {
      console.error("Gagal memuat analitik presensi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const stats = useMemo(() => {
    const total = records.length;
    let present = 0;
    let late = 0;
    let sick = 0;
    let excused = 0;
    let absent = 0;

    const subjectsMap: Record<string, { total: number; present: number; late: number; sick: number; excused: number }> = {};

    for (const r of records) {
      const s = r.status.toLowerCase();
      if (s === "present") present++;
      else if (s === "late") late++;
      else if (s === "sick") sick++;
      else if (s === "excused") excused++;
      else absent++;

      if (!subjectsMap[r.subject]) {
        subjectsMap[r.subject] = { total: 0, present: 0, late: 0, sick: 0, excused: 0 };
      }
      subjectsMap[r.subject].total++;
      if (s === "present") subjectsMap[r.subject].present++;
      if (s === "late") subjectsMap[r.subject].late++;
      if (s === "sick") subjectsMap[r.subject].sick++;
      if (s === "excused") subjectsMap[r.subject].excused++;
    }

    const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;
    const onTimeRate = (present + late) > 0 ? Math.round((present / (present + late)) * 100) : 100;

    return {
      total,
      present,
      late,
      sick,
      excused,
      absent,
      attendanceRate,
      onTimeRate,
      subjects: subjectsMap,
    };
  }, [records]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <TrendingUp className="text-brand-600 dark:text-brand-400" size={28} />
            Analitik & Statistik Presensi
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pantau tingkat kedisiplinan kehadiran, persentase kehadiran per mata pelajaran, dan ketepatan waktu.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={fetchHistory}
          leftIcon={<RefreshCw size={15} className={loading ? "animate-spin" : ""} />}
        >
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 stagger-children">
        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Sesi Diikuti</span>
            <BookOpen size={18} className="text-slate-400" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">{stats.total}</p>
          <span className="text-[11px] text-slate-400">Sepanjang semester ini</span>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-950/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Tingkat Kehadiran</span>
            <Award size={18} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">{stats.attendanceRate}%</p>
          <span className="text-[11px] text-slate-400">Target sekolah min. 85%</span>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border-blue-100 dark:border-blue-950/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Tepat Waktu</span>
            <CheckCircle2 size={18} className="text-blue-500" />
          </div>
          <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-2">{stats.onTimeRate}%</p>
          <span className="text-[11px] text-slate-400">{stats.present} sesi tanpa terlambat</span>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border-amber-100 dark:border-amber-950/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Terlambat</span>
            <Clock size={18} className="text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-2">{stats.late}</p>
          <span className="text-[11px] text-slate-400">Sesi check-in setelah batas</span>
        </Card>
      </div>

      {/* Breakdown Progress Bars */}
      <Card className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
          Distribusi Status Kehadiran
        </h2>

        <div className="space-y-3.5">
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              <span>Hadir Tepat Waktu</span>
              <span>{stats.present} ({stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}%)</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.total > 0 ? (stats.present / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              <span>Terlambat</span>
              <span>{stats.late} ({stats.total > 0 ? Math.round((stats.late / stats.total) * 100) : 0}%)</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.total > 0 ? (stats.late / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              <span>Sakit</span>
              <span>{stats.sick} ({stats.total > 0 ? Math.round((stats.sick / stats.total) * 100) : 0}%)</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.total > 0 ? (stats.sick / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              <span>Izin / Dispensasi</span>
              <span>{stats.excused} ({stats.total > 0 ? Math.round((stats.excused / stats.total) * 100) : 0}%)</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.total > 0 ? (stats.excused / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              <span>Alpha / Tanpa Keterangan</span>
              <span>{stats.absent} ({stats.total > 0 ? Math.round((stats.absent / stats.total) * 100) : 0}%)</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.total > 0 ? (stats.absent / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Subject Performance List */}
      <Card className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
          Kehadiran Berdasarkan Mata Pelajaran
        </h2>

        {Object.keys(stats.subjects).length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            Belum ada rekam data mata pelajaran.
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(stats.subjects).map(([subjectName, s]) => {
              const rate = s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 0;
              return (
                <div
                  key={subjectName}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">{subjectName}</h2>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                      <span>Total: {s.total} sesi</span>
                      <span>Hadir: {s.present}</span>
                      <span>Terlambat: {s.late}</span>
                      <span>Sakit/Izin: {s.sick + s.excused}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white">{rate}%</div>
                      <span className="text-[10px] text-slate-400 font-medium">kehadiran</span>
                    </div>
                    <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${rate >= 85 ? "bg-emerald-500" : rate >= 75 ? "bg-amber-500" : "bg-rose-500"}`}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default StudentAnalytics;
