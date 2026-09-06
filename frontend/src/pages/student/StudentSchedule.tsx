import { useEffect, useState } from "react";
import { CalendarClock, BookOpen, Clock, User, AlertCircle } from "lucide-react";
import { getStudentSchedule } from "../../api/studentService";
import type { ScheduleItem } from "../../types";
import { ApiRequestError } from "../../api/client";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";

const DAY_ORDER = [
  { en: "Monday", id: "Senin" },
  { en: "Tuesday", id: "Selasa" },
  { en: "Wednesday", id: "Rabu" },
  { en: "Thursday", id: "Kamis" },
  { en: "Friday", id: "Jumat" },
  { en: "Saturday", id: "Sabtu" },
  { en: "Sunday", id: "Minggu" },
];

export default function StudentSchedule() {
  const [schedule, setSchedule] = useState<ScheduleItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStudentSchedule()
      .then((res) => setSchedule(res.schedule || []))
      .catch((e) =>
        setError(e instanceof ApiRequestError ? e.friendlyMessage : "Gagal memuat jadwal.")
      );
  }, []);

  if (error) {
    return (
      <Card className="p-8 text-center border-rose-500/30 max-w-lg mx-auto">
        <AlertCircle className="mx-auto text-rose-400 mb-3" size={40} />
        <h3 className="text-lg font-bold text-white">Gagal Memuat Jadwal</h3>
        <p className="text-xs text-slate-400 mt-1">{error}</p>
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

  const grouped = DAY_ORDER.map((d) => ({
    dayLabel: d.id,
    items: (schedule || []).filter((s) => s.day_name === d.en),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <CalendarClock className="text-brand-400" size={24} /> Jadwal Pelajaran
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Jadwal mingguan mata pelajaran dan guru pengampu kelas Anda.
        </p>
      </div>

      {!schedule ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <Card className="p-12 text-center border-slate-800">
          <Clock className="mx-auto text-slate-600 mb-2" size={36} />
          <h3 className="font-bold text-white text-base">Belum Ada Jadwal</h3>
          <p className="text-xs text-slate-400 mt-1">
            Jadwal pelajaran untuk kelas Anda belum diatur oleh admin sekolah.
          </p>
        </Card>
      ) : (
        <div className="space-y-5">
          {grouped.map((g) => (
            <Card key={g.dayLabel} className="p-5 sm:p-6 space-y-3 border-slate-800">
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2.5">
                <span className="w-2 h-2 rounded-full bg-brand-400" />
                <h2 className="font-bold text-white text-base">{g.dayLabel}</h2>
              </div>

              <div className="space-y-2.5">
                {g.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-3.5 hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-white">{item.subject}</h3>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-slate-300">
                          <User size={12} className="text-slate-400" /> {item.teacher}
                        </span>
                        {item.room && (
                          <span className="text-slate-500">• Ruang: {item.room}</span>
                        )}
                      </p>
                    </div>

                    <span className="text-xs font-mono font-semibold text-brand-300 bg-brand-500/10 border border-brand-500/20 px-3 py-1 rounded-lg w-fit">
                      {item.start_time} – {item.end_time} WIB
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
