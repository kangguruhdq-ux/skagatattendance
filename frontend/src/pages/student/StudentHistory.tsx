import { useEffect, useState, useMemo } from "react";
import {
  History,
  Calendar,
  CheckCircle2,
  Clock3,
  XCircle,
  QrCode,
  Camera,
  Filter,
} from "lucide-react";
import { getStudentAttendanceHistory } from "../../api/studentService";
import type { AttendanceHistoryItem } from "../../types";
import { ApiRequestError } from "../../api/client";
import { Card, CardContent } from "../../components/ui/Card";
import StatusBadge from "../../components/StatusBadge";
import { Skeleton } from "../../components/ui/Skeleton";
import { Button } from "../../components/ui/Button";

type FilterPeriod = "all" | "today" | "week" | "month";

export default function StudentHistory() {
  const [records, setRecords] = useState<AttendanceHistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<FilterPeriod>("all");

  useEffect(() => {
    getStudentAttendanceHistory()
      .then((res) => setRecords(res.records))
      .catch((e) =>
        setError(e instanceof ApiRequestError ? e.friendlyMessage : "Gagal memuat riwayat presensi.")
      );
  }, []);

  const filteredRecords = useMemo(() => {
    if (!records) return [];
    if (period === "all") return records;

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    if (period === "today") {
      return records.filter((r) => r.date === todayStr);
    }

    if (period === "week") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(today.getDate() - 7);
      return records.filter((r) => new Date(r.date) >= oneWeekAgo);
    }

    if (period === "month") {
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(today.getDate() - 30);
      return records.filter((r) => new Date(r.date) >= oneMonthAgo);
    }

    return records;
  }, [records, period]);

  const stats = useMemo(() => {
    if (!records) return { total: 0, present: 0, late: 0, absent: 0 };
    return {
      total: records.length,
      present: records.filter((r) => r.status === "present").length,
      late: records.filter((r) => r.status === "late").length,
      absent: records.filter((r) => r.status === "absent").length,
    };
  }, [records]);

  if (error) {
    return (
      <Card className="p-8 text-center border-rose-500/30">
        <XCircle className="mx-auto text-rose-400 mb-3" size={36} />
        <h3 className="font-bold text-white text-base">Gagal Memuat Riwayat</h3>
        <p className="text-xs text-slate-400 mt-1">{error}</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => window.location.reload()}>
          Coba Lagi
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <History className="text-brand-400" size={24} /> Riwayat Presensi
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Catatan kehadiran kelas dan kegiatan pembelajaran Anda.
          </p>
        </div>

        {/* Quick summary chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-white">
            Total: <span className="text-brand-400">{stats.total}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
            Hadir: {stats.present}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400">
            Terlambat: {stats.late}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 border border-slate-800 rounded-2xl w-fit">
        {(
          [
            { key: "all", label: "Semua" },
            { key: "today", label: "Hari Ini" },
            { key: "week", label: "7 Hari Terakhir" },
            { key: "month", label: "30 Hari Terakhir" },
          ] as { key: FilterPeriod; label: string }[]
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setPeriod(tab.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
              period === tab.key
                ? "bg-brand-600 text-white shadow-md shadow-brand-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading Skeleton */}
      {!records ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filteredRecords.length === 0 ? (
        <Card className="p-12 text-center border-slate-800">
          <Calendar className="mx-auto text-slate-600 mb-3" size={40} />
          <h3 className="font-bold text-white text-base">Tidak Ada Riwayat Presensi</h3>
          <p className="text-xs text-slate-400 mt-1">
            Belum ada catatan presensi pada periode yang dipilih.
          </p>
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800/80 bg-slate-950/40">
                  <th className="px-5 py-3.5">Tanggal</th>
                  <th className="px-5 py-3.5">Mata Pelajaran</th>
                  <th className="px-5 py-3.5">Kelas</th>
                  <th className="px-5 py-3.5">Waktu Presensi</th>
                  <th className="px-5 py-3.5">Metode</th>
                  <th className="px-5 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 text-slate-300 font-medium whitespace-nowrap">
                      {r.date}
                    </td>
                    <td className="px-5 py-3.5 text-white font-semibold whitespace-nowrap">
                      {r.subject}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap">{r.class_name}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-300 text-xs whitespace-nowrap">
                      {r.check_in_time} WIB
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        {r.method === "photo" ? (
                          <>
                            <Camera size={13} className="text-emerald-400" /> Foto
                          </>
                        ) : (
                          <>
                            <QrCode size={13} className="text-brand-400" /> Scan QR
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <StatusBadge status={r.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredRecords.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3 shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-white text-base leading-snug">{r.subject}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {r.class_name} • {r.date}
                    </p>
                  </div>
                  <StatusBadge status={r.status} size="sm" />
                </div>

                <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono text-slate-300">Pukul {r.check_in_time} WIB</span>
                  <span className="inline-flex items-center gap-1">
                    {r.method === "photo" ? (
                      <>
                        <Camera size={12} className="text-emerald-400" /> Absen Foto
                      </>
                    ) : (
                      <>
                        <QrCode size={12} className="text-brand-400" /> Scan QR
                      </>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
