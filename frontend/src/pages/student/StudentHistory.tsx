import { useEffect, useState, useMemo, useRef } from "react";
import {
  History,
  Calendar,
  CheckCircle2,
  Clock3,
  XCircle,
  QrCode,
  Camera,
  Filter,
  AlertTriangle,
  Upload,
  RefreshCw,
  Trash2,
  Check,
} from "lucide-react";
import { getStudentAttendanceHistory, retakePhoto, deleteAttendanceRecord } from "../../api/studentService";
import type { AttendanceHistoryItem } from "../../types";
import { ApiRequestError } from "../../api/client";
import { Card, CardContent } from "../../components/ui/Card";
import StatusBadge from "../../components/StatusBadge";
import { Skeleton } from "../../components/ui/Skeleton";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";

type FilterPeriod = "all" | "today" | "week" | "month";

export default function StudentHistory() {
  const [records, setRecords] = useState<AttendanceHistoryItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<FilterPeriod>("all");
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Delete attendance state
  const [deleteTarget, setDeleteTarget] = useState<AttendanceHistoryItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Retake photo state
  const [retakeTarget, setRetakeTarget] = useState<AttendanceHistoryItem | null>(null);
  const [retakeFile, setRetakeFile] = useState<File | null>(null);
  const [retakePreview, setRetakePreview] = useState<string | null>(null);
  const [retakeSubmitting, setRetakeSubmitting] = useState(false);
  const [retakeError, setRetakeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function loadHistory() {
    setLoading(true);
    setError(null);
    getStudentAttendanceHistory()
      .then((res) => setRecords(res.records))
      .catch((e) =>
        setError(e instanceof ApiRequestError ? e.friendlyMessage : "Gagal memuat riwayat presensi.")
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadHistory();
  }, []);

  function openRetakeModal(record: AttendanceHistoryItem) {
    setRetakeTarget(record);
    setRetakeFile(null);
    setRetakePreview(null);
    setRetakeError(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRetakeFile(file);
    const url = URL.createObjectURL(file);
    setRetakePreview(url);
    setRetakeError(null);
  }

  async function handleSubmitRetake(e: React.FormEvent) {
    e.preventDefault();
    if (!retakeTarget || !retakeFile) return;

    setRetakeSubmitting(true);
    setRetakeError(null);
    try {
      await retakePhoto(retakeTarget.id, retakeFile);
      setRetakeTarget(null);
      setRetakeFile(null);
      setRetakePreview(null);
      loadHistory();
    } catch (err: any) {
      setRetakeError(err instanceof ApiRequestError ? err.friendlyMessage : "Gagal mengunggah foto baru.");
    } finally {
      setRetakeSubmitting(false);
    }
  }

  async function handleDeleteRecord() {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      await deleteAttendanceRecord(deleteTarget.id);
      setDeleteTarget(null);
      setSuccessToast("Riwayat presensi berhasil dihapus.");
      setTimeout(() => setSuccessToast(null), 3500);
      loadHistory();
    } catch (err: any) {
      setDeleteError(err instanceof ApiRequestError ? err.friendlyMessage : "Gagal menghapus riwayat presensi.");
    } finally {
      setDeleteSubmitting(false);
    }
  }

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
      {successToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <Check size={16} className="text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : error ? (
        <Card className="p-8 text-center border-rose-500/30">
          <AlertTriangle className="mx-auto text-rose-400 mb-3" size={36} />
          <h3 className="font-bold text-white text-base">Gagal Memuat Riwayat</h3>
          <p className="text-xs text-slate-400 mt-1">{error}</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={loadHistory}>
            Coba Lagi
          </Button>
        </Card>
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[780px]">
                <thead>
                  <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800/80 bg-slate-950/40">
                    <th className="px-5 py-3.5">Tanggal</th>
                    <th className="px-5 py-3.5">Mata Pelajaran</th>
                    <th className="px-5 py-3.5">Kelas</th>
                    <th className="px-5 py-3.5">Waktu Presensi</th>
                    <th className="px-5 py-3.5">Metode & Bukti Foto</th>
                    <th className="px-5 py-3.5">Status Presensi</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 text-slate-300 font-medium whitespace-nowrap">
                        {r.date}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <p className="text-white font-semibold">{r.subject}</p>
                        {r.photo_status === "rejected" && r.photo_rejection_reason && (
                          <p className="text-[11px] text-rose-400 mt-0.5 max-w-xs truncate" title={r.photo_rejection_reason}>
                            ⚠️ Alasan: {r.photo_rejection_reason}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap">{r.class_name}</td>
                      <td className="px-5 py-3.5 font-mono text-slate-300 text-xs whitespace-nowrap">
                        {r.check_in_time} WIB
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
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
                          {r.has_photo && (
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                                r.photo_status === "approved"
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                  : r.photo_status === "rejected"
                                  ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                  : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                              }`}
                            >
                              {r.photo_status === "approved"
                                ? "✓ Foto Disetujui"
                                : r.photo_status === "rejected"
                                ? "✕ Foto Ditolak"
                                : "🟡 Menunggu Review"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <StatusBadge status={r.status} size="sm" />
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 shrink-0">
                          {r.can_retake_photo && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-amber-400 border-amber-500/40 hover:bg-amber-500/10 text-xs shrink-0"
                              onClick={() => openRetakeModal(r)}
                              leftIcon={<Camera size={13} />}
                            >
                              Ambil Ulang
                            </Button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteTarget(r);
                              setDeleteError(null);
                            }}
                            title="Hapus Riwayat Presensi Ini"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

                {/* Photo status badge if photo was submitted */}
                {r.has_photo && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Bukti Foto:</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        r.photo_status === "approved"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : r.photo_status === "rejected"
                          ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                          : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {r.photo_status === "approved"
                        ? "✓ Foto Disetujui Guru"
                        : r.photo_status === "rejected"
                        ? "✕ Foto Ditolak Guru"
                        : "🟡 Menunggu Review Guru"}
                    </span>
                  </div>
                )}

                {/* Rejection note */}
                {r.photo_status === "rejected" && r.photo_rejection_reason && (
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/25 p-3 text-xs text-rose-300">
                    <strong className="text-rose-200 block mb-0.5">Alasan Penolakan:</strong>
                    {r.photo_rejection_reason}
                  </div>
                )}

                {/* Retake action button */}
                {r.can_retake_photo && (
                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    className="bg-amber-600 hover:bg-amber-500 text-white"
                    onClick={() => openRetakeModal(r)}
                    leftIcon={<Camera size={14} />}
                  >
                    Ambil Foto Ulang Sekarang
                  </Button>
                )}

                <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono text-slate-300">Pukul {r.check_in_time} WIB</span>
                  <div className="flex items-center gap-2">
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
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteTarget(r);
                        setDeleteError(null);
                      }}
                      title="Hapus Riwayat"
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ========================================================================= */}
          {/* MODAL: RETAKE PHOTO */}
          {/* ========================================================================= */}
          <Modal
            isOpen={Boolean(retakeTarget)}
            onClose={() => {
              setRetakeTarget(null);
              setRetakeFile(null);
              setRetakePreview(null);
            }}
            title="Ambil Foto Ulang"
            description={`Mata Pelajaran: ${retakeTarget?.subject || ""}`}
            size="md"
          >
            {retakeTarget && (
              <form onSubmit={handleSubmitRetake} className="space-y-4">
                {retakeTarget.photo_rejection_reason && (
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/25 p-3 text-xs text-rose-300">
                    <strong className="text-rose-200 block mb-0.5">Catatan Penolakan Guru:</strong>
                    {retakeTarget.photo_rejection_reason}
                  </div>
                )}

                <div className="text-center space-y-3">
                  {retakePreview ? (
                    <div className="rounded-2xl overflow-hidden bg-black border border-slate-700 aspect-square max-w-xs mx-auto shadow-xl">
                      <img src={retakePreview} alt="Foto Baru" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-8 cursor-pointer transition-colors text-center space-y-2"
                    >
                      <Camera className="mx-auto text-slate-500" size={40} />
                      <p className="text-sm font-semibold text-white">Klik untuk mengambil foto selfie</p>
                      <p className="text-xs text-slate-400">Pastikan wajah terlihat jelas dan berada di lingkungan kelas.</p>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {retakePreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Pilih Foto Lain
                    </Button>
                  )}
                </div>

                {retakeError && (
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-center gap-2">
                    <AlertTriangle size={15} className="shrink-0 text-rose-400" />
                    <span>{retakeError}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    fullWidth
                    onClick={() => {
                      setRetakeTarget(null);
                      setRetakeFile(null);
                      setRetakePreview(null);
                    }}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    fullWidth
                    disabled={!retakeFile}
                    isLoading={retakeSubmitting}
                  >
                    Kirim Foto Baru
                  </Button>
                </div>
              </form>
            )}
          </Modal>

          {/* ========================================================================= */}
          {/* MODAL: DELETE CONFIRMATION */}
          {/* ========================================================================= */}
          <Modal
            isOpen={Boolean(deleteTarget)}
            onClose={() => {
              if (!deleteSubmitting) {
                setDeleteTarget(null);
                setDeleteError(null);
              }
            }}
            title="Hapus Riwayat Presensi"
            description="Konfirmasi penghapusan data presensi"
            size="sm"
          >
            {deleteTarget && (
              <div className="space-y-4">
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 text-xs text-amber-300 flex items-start gap-2.5">
                  <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={16} />
                  <div>
                    <span className="font-semibold text-amber-200 block mb-1">Peringatan:</span>
                    Data presensi untuk mata pelajaran <strong className="text-white">{deleteTarget.subject}</strong> pada tanggal <strong className="text-white">{deleteTarget.date}</strong> ({deleteTarget.check_in_time} WIB) akan dihapus dari riwayat Anda.
                  </div>
                </div>

                {deleteError && (
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-center gap-2">
                    <AlertTriangle size={15} className="shrink-0 text-rose-400" />
                    <span>{deleteError}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    fullWidth
                    disabled={deleteSubmitting}
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
                    isLoading={deleteSubmitting}
                    onClick={handleDeleteRecord}
                    leftIcon={<Trash2 size={15} />}
                  >
                    Hapus
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        </>
      )}
    </div>
  );
}
