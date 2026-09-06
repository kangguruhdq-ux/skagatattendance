import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  Plus,
  Radio,
  Clock,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  Search,
  Trash2,
} from "lucide-react";
import { getMySessions, cancelTeacherSession } from "../../api/teacherService";
import { ApiRequestError } from "../../api/client";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import StatusBadge from "../../components/StatusBadge";
import { Skeleton } from "../../components/ui/Skeleton";
import { Modal } from "../../components/ui/Modal";

type StatusFilter = "all" | "active" | "not_started" | "expired";

export default function TeacherSessions() {
  const [sessions, setSessions] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function loadSessions() {
    return getMySessions()
      .then((res) => setSessions(res.sessions || []))
      .catch((e) =>
        setError(e instanceof ApiRequestError ? e.friendlyMessage : "Gagal memuat daftar sesi.")
      );
  }

  useEffect(() => {
    loadSessions();
  }, []);

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await cancelTeacherSession(deleteTarget.id);
      setDeleteTarget(null);
      await loadSessions();
    } catch (err) {
      setDeleteError(
        err instanceof ApiRequestError ? err.friendlyMessage : "Gagal menghapus sesi presensi."
      );
    } finally {
      setDeleteLoading(false);
    }
  }

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter((s) => {
      const matchFilter = filter === "all" ? true : s.status === filter;
      const matchSearch =
        s.subject?.toLowerCase().includes(search.toLowerCase()) ||
        s.class_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.date?.includes(search);
      return matchFilter && matchSearch;
    });
  }, [sessions, filter, search]);

  if (error) {
    return (
      <Card className="p-8 text-center border-rose-500/30 max-w-lg mx-auto">
        <AlertCircle className="mx-auto text-rose-400 mb-3" size={40} />
        <h3 className="text-lg font-bold text-white">Gagal Memuat Sesi</h3>
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <ClipboardList className="text-brand-400" size={24} /> Daftar Sesi Presensi
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Kelola dan pantau seluruh sesi presensi kelas yang telah Anda buat.
          </p>
        </div>
        <Link to="/teacher/sessions/new">
          <Button variant="primary" size="md" leftIcon={<Plus size={18} />}>
            Buat Sesi Baru
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Status tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 border border-slate-800 rounded-2xl overflow-x-auto">
          {(
            [
              { key: "all", label: "Semua Sesi" },
              { key: "active", label: "🟢 Aktif" },
              { key: "not_started", label: "Akan Datang" },
              { key: "expired", label: "Selesai" },
            ] as { key: StatusFilter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                filter === tab.key
                  ? "bg-brand-600 text-white shadow-md shadow-brand-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari mapel atau kelas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 rounded-xl bg-slate-900/80 border border-slate-700/80 pl-10 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Loading Skeletons */}
      {!sessions ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filteredSessions.length === 0 ? (
        <Card className="p-12 text-center border-slate-800">
          <Clock className="mx-auto text-slate-600 mb-3" size={40} />
          <h3 className="font-bold text-white text-base">Tidak Ada Sesi Ditemukan</h3>
          <p className="text-xs text-slate-400 mt-1">
            Belum ada sesi presensi yang sesuai dengan filter yang dipilih.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((s) => {
            const isActive = s.status === "active";
            return (
              <div
                key={s.id}
                className={`rounded-2xl p-4 sm:p-5 transition-all duration-150 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isActive
                    ? "bg-slate-900/90 border-2 border-emerald-500/50 shadow-emerald-500/5"
                    : "bg-slate-900/70 border border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    {isActive && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
                    <h3 className="text-base sm:text-lg font-bold text-white">{s.subject}</h3>
                    <StatusBadge status={s.status} size="sm" />
                  </div>

                  <p className="text-xs text-slate-400">
                    Kelas: <span className="text-slate-200 font-semibold">{s.class_name}</span> •
                    Tanggal: <span className="text-slate-300">{s.date}</span> • Waktu:{" "}
                    <span className="font-mono text-brand-300">
                      {s.start_time} - {s.end_time} WIB
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link to={`/teacher/sessions/${s.id}`}>
                    <Button
                      variant={isActive ? "primary" : "secondary"}
                      size="sm"
                      rightIcon={<ArrowRight size={14} />}
                    >
                      {isActive ? "Buka Live Monitor" : "Lihat Rekap"}
                    </Button>
                  </Link>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteTarget(s);
                    }}
                    title="Hapus Sesi Presensi"
                    leftIcon={<Trash2 size={14} />}
                  >
                    Hapus
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Konfirmasi Hapus Sesi */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleteLoading) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        title="Hapus Sesi Presensi"
        description="Konfirmasi penghapusan sesi presensi"
        size="sm"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 text-xs text-amber-300 flex items-start gap-2.5">
              <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={16} />
              <div>
                <span className="font-semibold text-amber-200 block mb-1">Peringatan:</span>
                Apakah Anda yakin ingin menghapus sesi <strong className="text-white">{deleteTarget.subject}</strong> kelas{" "}
                <strong className="text-white">{deleteTarget.class_name}</strong> tanggal <strong className="text-white">{deleteTarget.date}</strong> ({deleteTarget.start_time} - {deleteTarget.end_time} WIB)?
                <span className="block mt-1 text-slate-400">
                  Sesi akan dihapus dari daftar presensi. Histori presensi siswa yang sudah tersimpan tetap aman.
                </span>
              </div>
            </div>

            {deleteError && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-rose-400" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                fullWidth
                disabled={deleteLoading}
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError(null);
                }}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="danger"
                size="md"
                fullWidth
                isLoading={deleteLoading}
                onClick={handleConfirmDelete}
                leftIcon={<Trash2 size={15} />}
              >
                Hapus Sesi
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
