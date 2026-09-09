import React, { useState, useEffect, useCallback } from "react";
import { 
  Users, Search, Filter, RefreshCw, GraduationCap, 
  CheckCircle2, Clock, Award 
} from "lucide-react";
import { getTeacherStudents, getClasses, type TeacherStudentItem } from "../../api/teacherService";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export const TeacherStudents: React.FC = () => {
  const [students, setStudents] = useState<TeacherStudentItem[]>([]);
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string>("ALL");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [studentsRes, classesRes] = await Promise.all([
        getTeacherStudents({
          class_id: selectedClassId !== "ALL" ? Number(selectedClassId) : undefined,
          search: search.trim() || undefined,
        }),
        getClasses().catch(() => ({ classes: [] })),
      ]);
      setStudents(studentsRes.students || []);
      setClasses(classesRes.classes || []);
    } catch (err) {
      console.error("Gagal memuat data siswa:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="text-brand-600 dark:text-brand-400" size={28} />
            Daftar Siswa & Kehadiran
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Data siswa pada mata pelajaran yang Anda ampu beserta ringkasan ketepatan waktu presensi.
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

      {/* Filter Bar */}
      <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="Cari nama atau NIS siswa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>

          <div className="w-full sm:w-64">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              aria-label="Filter Kelas"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-medium focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Students Table / Grid */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="animate-spin mx-auto text-brand-600 mb-3" size={32} />
            <p className="text-sm text-slate-500">Memuat daftar siswa...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center">
            <GraduationCap className="mx-auto text-slate-400 mb-3" size={40} />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Tidak ada siswa ditemukan</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Sesuaikan kata kunci pencarian atau filter kelas Anda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Siswa</th>
                  <th className="py-3.5 px-4">Kelas</th>
                  <th className="py-3.5 px-4 text-center">Sesi Dihadiri</th>
                  <th className="py-3.5 px-4 text-center">Tepat Waktu</th>
                  <th className="py-3.5 px-4 text-center">Terlambat</th>
                  <th className="py-3.5 px-4 text-right">Persentase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{s.full_name}</div>
                      <div className="text-xs text-slate-400 font-mono">{s.student_code}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-200 dark:border-slate-700">
                        {s.class_name || "-"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-300">
                      {s.total_attended} sesi
                    </td>
                    <td className="py-3 px-4 text-center text-emerald-600 dark:text-emerald-400 font-semibold">
                      {s.present_count}
                    </td>
                    <td className="py-3 px-4 text-center text-amber-600 dark:text-amber-400 font-semibold">
                      {s.late_count}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 font-bold text-xs px-2.5 py-1 rounded-full ${
                          s.attendance_rate >= 85
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                            : s.attendance_rate >= 75
                            ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                            : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                        }`}
                      >
                        <Award size={12} />
                        {s.attendance_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default TeacherStudents;
