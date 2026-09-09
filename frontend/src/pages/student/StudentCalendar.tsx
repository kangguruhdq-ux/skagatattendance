import React, { useState, useEffect, useMemo } from "react";
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, 
  CheckCircle2, AlertTriangle, UserX, FileText, MapPin, Camera, RefreshCw 
} from "lucide-react";
import { getStudentAttendanceHistory } from "../../api/studentService";
import type { AttendanceHistoryItem } from "../../types";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export const StudentCalendar: React.FC = () => {
  const [records, setRecords] = useState<AttendanceHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string>(new Date().toISOString().split("T")[0]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await getStudentAttendanceHistory();
      setRecords(res.records || []);
    } catch (err) {
      console.error("Gagal memuat riwayat presensi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Map records by date string YYYY-MM-DD
  const recordsByDate = useMemo(() => {
    const map: Record<string, AttendanceHistoryItem[]> = {};
    for (const rec of records) {
      const d = rec.date;
      if (!map[d]) map[d] = [];
      map[d].push(rec);
    }
    return map;
  }, [records]);

  // Generate calendar days
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    // Shift to Mon = 0
    const startOffset = (firstDayIndex + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Padding before
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }
    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      days.push({ day, dateString: dStr, items: recordsByDate[dStr] || [] });
    }
    return days;
  }, [year, month, recordsByDate]);

  const selectedDayRecords = useMemo(() => {
    return recordsByDate[selectedDay] || [];
  }, [selectedDay, recordsByDate]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "present":
        return "bg-emerald-500";
      case "late":
        return "bg-amber-500";
      case "sick":
        return "bg-blue-500";
      case "excused":
        return "bg-purple-500";
      case "absent":
        return "bg-rose-500";
      default:
        return "bg-slate-400";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "present":
        return <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded text-xs font-semibold">Hadir</span>;
      case "late":
        return <span className="text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded text-xs font-semibold">Terlambat</span>;
      case "sick":
        return <span className="text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 rounded text-xs font-semibold">Sakit</span>;
      case "excused":
        return <span className="text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 px-2 py-0.5 rounded text-xs font-semibold">Izin</span>;
      default:
        return <span className="text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 rounded text-xs font-semibold">Alpha</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <CalendarIcon className="text-brand-600 dark:text-brand-400" size={28} />
            Kalender Presensi Siswa
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Visualisasi kalender kehadiran harian, ketepatan waktu, dan riwayat presensi per mata pelajaran.
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

      {/* Main Grid & Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Calendar Card (2 Cols on lg) */}
        <Card className="lg:col-span-2 p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          {/* Calendar Month Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {monthNames[month]} {year}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                title="Bulan sebelumnya"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
              >
                Hari Ini
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                title="Bulan berikutnya"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">
            <span>Sen</span>
            <span>Sel</span>
            <span>Rab</span>
            <span>Kam</span>
            <span>Jum</span>
            <span>Sab</span>
            <span className="text-rose-500">Min</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarGrid.map((cell, idx) => {
              if (!cell) {
                return <div key={`empty-${idx}`} className="h-14 sm:h-20 rounded-xl bg-slate-50/40 dark:bg-slate-950/20" />;
              }

              const isSelected = cell.dateString === selectedDay;
              const isToday = cell.dateString === new Date().toISOString().split("T")[0];

              return (
                <button
                  key={cell.dateString}
                  onClick={() => setSelectedDay(cell.dateString)}
                  className={`h-14 sm:h-20 p-1.5 sm:p-2 rounded-xl border flex flex-col justify-between text-left transition-all ${
                    isSelected
                      ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 ring-2 ring-brand-500/20"
                      : isToday
                      ? "border-brand-300 dark:border-brand-700 bg-slate-50 dark:bg-slate-800/40"
                      : "border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <span
                    className={`text-xs font-bold leading-none ${
                      isToday
                        ? "text-brand-600 dark:text-brand-400"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {cell.day}
                  </span>

                  {/* Dots for items */}
                  <div className="flex items-center gap-1 flex-wrap overflow-hidden max-h-5">
                    {cell.items.map((item, i) => (
                      <span
                        key={i}
                        className={`w-2 h-2 rounded-full shrink-0 ${getStatusColor(item.status)}`}
                        title={`${item.subject}: ${item.status}`}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 flex-wrap mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Hadir
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Terlambat
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Sakit
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> Izin
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Alpha
            </span>
          </div>
        </Card>

        {/* Selected Date Detail Panel */}
        <Card className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
              Detail Presensi
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {new Date(selectedDay).toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </h2>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {selectedDayRecords.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Tidak ada data presensi pada tanggal ini.
              </div>
            ) : (
              selectedDayRecords.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {rec.subject}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {rec.class_name}
                      </p>
                    </div>
                    {getStatusBadge(rec.status)}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock size={13} /> {rec.check_in_time} WIB
                    </span>
                    <span className="flex items-center gap-1">
                      {rec.method === "photo" ? "Foto Wajah" : "Scan QR"}
                    </span>
                  </div>

                  {rec.has_photo && (
                    <div className="flex items-center gap-1 text-[11px] text-brand-600 dark:text-brand-400 font-medium">
                      <Camera size={12} /> Bukti Foto: {rec.photo_status || "Tercatat"}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>

      </div>
    </div>
  );
};

export default StudentCalendar;
