import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  RefreshCcw,
  CheckCircle2,
  Clock3,
  Fingerprint,
  Camera,
  Users,
  Maximize2,
  Minimize2,
  Radio,
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
  X,
  Edit2,
} from "lucide-react";
import {
  getSessionQr,
  getSessionRecords,
  fetchRecordPhotoUrl,
  updateRecordStatus,
  reviewPhoto,
  updateTeacherSession,
} from "../../api/teacherService";
import type { SessionOut, AttendanceRecordOut } from "../../types";
import { formatWibTime } from "../../utils/date";
import { ApiRequestError } from "../../api/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import StatusBadge from "../../components/StatusBadge";
import { Skeleton } from "../../components/ui/Skeleton";

const POLL_INTERVAL_MS = 4000;
const QR_REFRESH_MS = 25000;

export default function TeacherSessionMonitor() {
  const { sessionId } = useParams();
  const id = Number(sessionId);

  const [session, setSession] = useState<SessionOut | null>(null);
  const [records, setRecords] = useState<AttendanceRecordOut[]>([]);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Photo viewer & review modal
  const [photoModal, setPhotoModal] = useState<{ url: string; record: AttendanceRecordOut } | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReasonInput, setRejectReasonInput] = useState("");

  // Edit session modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editEndTime, setEditEndTime] = useState("");
  const [editLateThreshold, setEditLateThreshold] = useState(15);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Fullscreen QR Modal (for projector display)
  const [qrFullscreen, setQrFullscreen] = useState(false);

  // Countdown timer state
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isSessionEnded, setIsSessionEnded] = useState(false);

  // Override status modal state
  const [overrideTarget, setOverrideTarget] = useState<AttendanceRecordOut | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<string>("present");
  const [overrideReason, setOverrideReason] = useState<string>("");
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);

  const pollRef = useRef<number | null>(null);
  const qrRef = useRef<number | null>(null);

  async function refreshRecords() {
    try {
      const res = await getSessionRecords(id);
      setSession(res.session);
      setRecords(res.records);
      setError(null);
    } catch (e: any) {
      setError(e instanceof ApiRequestError ? e.friendlyMessage : "Gagal memuat sesi.");
    }
  }

  async function refreshQr() {
    try {
      const res = await getSessionQr(id);
      setQrToken(res.token);
    } catch {
      setQrToken(null);
    }
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([refreshRecords(), refreshQr()]).finally(() => setLoading(false));

    pollRef.current = window.setInterval(refreshRecords, POLL_INTERVAL_MS);
    qrRef.current = window.setInterval(refreshQr, QR_REFRESH_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (qrRef.current) clearInterval(qrRef.current);
    };
  }, [id]);

  // Live countdown calculator
  useEffect(() => {
    if (!session) return;

    function updateCountdown() {
      if (!session) return;
      const endDt = new Date(`${session.date}T${session.end_time}:00`);
      const now = new Date();
      const diffMs = endDt.getTime() - now.getTime();

      if (diffMs <= 0) {
        setIsSessionEnded(true);
        setTimeRemaining("SESI TELAH BERAKHIR");
      } else {
        setIsSessionEnded(false);
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

        const pad = (n: number) => String(n).padStart(2, "0");
        setTimeRemaining(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
      }
    }

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [session]);

  async function viewPhoto(record: AttendanceRecordOut) {
    setPhotoLoading(true);
    setShowRejectInput(false);
    setRejectReasonInput("");
    try {
      const url = await fetchRecordPhotoUrl(record.id);
      setPhotoModal({ url, record });
    } catch {
      alert("Gagal memuat foto bukti kehadiran.");
    } finally {
      setPhotoLoading(false);
    }
  }

  async function handleApprovePhoto(recordId: number) {
    setReviewSubmitting(true);
    try {
      await reviewPhoto(recordId, "approved");
      setPhotoModal(null);
      setShowRejectInput(false);
      setRejectReasonInput("");
      await refreshRecords();
    } catch (e: any) {
      alert(e instanceof ApiRequestError ? e.friendlyMessage : "Gagal menyetujui foto presensi.");
    } finally {
      setReviewSubmitting(false);
    }
  }

  async function handleRejectPhoto(recordId: number) {
    if (!showRejectInput) {
      setShowRejectInput(true);
      return;
    }
    const reason = rejectReasonInput.trim() || "Foto tidak memenuhi kriteria / wajah tidak terlihat jelas.";
    setReviewSubmitting(true);
    try {
      await reviewPhoto(recordId, "rejected", reason);
      setPhotoModal(null);
      setShowRejectInput(false);
      setRejectReasonInput("");
      await refreshRecords();
    } catch (e: any) {
      alert(e instanceof ApiRequestError ? e.friendlyMessage : "Gagal menolak foto presensi.");
    } finally {
      setReviewSubmitting(false);
    }
  }

  function openEditModal() {
    if (!session) return;
    setEditEndTime(session.end_time);
    setEditLateThreshold(session.late_threshold_minutes);
    setEditModalOpen(true);
  }

  async function handleSaveSessionEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setEditSubmitting(true);
    try {
      await updateTeacherSession(session.id, {
        end_time: editEndTime,
        late_threshold_minutes: Number(editLateThreshold),
      });
      setEditModalOpen(false);
      await refreshRecords();
    } catch (e: any) {
      alert(e instanceof ApiRequestError ? e.friendlyMessage : "Gagal memperbarui pengaturan sesi.");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleOverrideSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!overrideTarget) return;

    setOverrideSubmitting(true);
    try {
      await updateRecordStatus(overrideTarget.id, overrideStatus, overrideReason);
      setOverrideTarget(null);
      setOverrideReason("");
      refreshRecords();
    } catch (err) {
      alert("Gagal memperbarui status presensi.");
    } finally {
      setOverrideSubmitting(false);
    }
  }

  if (loading && !session) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <Card className="p-8 text-center border-rose-500/30 max-w-lg mx-auto">
        <AlertTriangle className="mx-auto text-rose-400 mb-3" size={40} />
        <h3 className="text-lg font-bold text-white">Gagal Membuka Sesi</h3>
        <p className="text-xs text-slate-400 mt-1">{error || "Sesi tidak ditemukan."}</p>
        <Link to="/teacher/sessions" className="inline-block mt-4">
          <Button variant="secondary" size="sm">
            Kembali ke Daftar Sesi
          </Button>
        </Link>
      </Card>
    );
  }

  // Attendance stats
  const presentCount = records.filter((r) => r.status === "present").length;
  const lateCount = records.filter((r) => r.status === "late").length;
  const totalCheckedIn = records.length;
  const totalStudents = session.total_students || 0;
  const absentCount = Math.max(0, totalStudents - totalCheckedIn);
  const pendingPhotos = records.filter((r) => r.photo_status === "pending").length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Back link and actions */}
      <div className="flex items-center justify-between">
        <Link
          to="/teacher"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Dashboard Guru
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openEditModal}
            leftIcon={<Edit2 size={14} />}
          >
            Edit Sesi
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshRecords}
            leftIcon={<RefreshCcw size={14} />}
          >
            Segarkan Data
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. LIVE HEADER & COUNTDOWN */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                LIVE ATTENDANCE MONITOR
              </span>
              <StatusBadge status={session.status} size="sm" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {session.subject_name}
            </h1>
            <p className="text-sm text-slate-300">
              Kelas: <span className="font-semibold text-white">{session.class_name}</span> • Waktu:{" "}
              <span className="font-mono text-brand-300">
                {session.start_time} - {session.end_time} WIB
              </span>
            </p>

            {/* Requirement badges */}
            <div className="flex items-center gap-2 pt-2 flex-wrap text-xs">
              {session.require_gps && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  <MapPin size={12} className="text-amber-400" /> GPS Radius Wajib
                </span>
              )}
              {session.require_photo && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  <Camera size={12} className="text-emerald-400" /> Wajib Foto
                </span>
              )}
              {session.require_biometric && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  <Fingerprint size={12} className="text-brand-400" /> Biometrik Wajib
                </span>
              )}
            </div>
          </div>

          {/* Countdown timer card */}
          <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 text-center sm:text-right shrink-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isSessionEnded ? "Status Waktu" : "Sisa Waktu Sesi"}
            </p>
            <p
              className={`text-2xl sm:text-3xl font-mono font-black mt-1 ${
                isSessionEnded ? "text-rose-400" : "text-brand-400"
              }`}
            >
              {timeRemaining || "00:00:00"}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Toleransi Terlambat: {session.late_threshold_minutes} menit
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. REAL-TIME STATISTICS CARDS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-xs text-slate-400">Total Siswa Kelas</span>
            <p className="text-2xl font-black text-white mt-1">{totalStudents}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-xs text-emerald-400">Hadir Tepat Waktu</span>
            <p className="text-2xl font-black text-emerald-400 mt-1">{presentCount}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <span className="text-xs text-amber-400">Terlambat</span>
            <p className="text-2xl font-black text-amber-400 mt-1">{lateCount}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-xs text-slate-400">Belum Presensi</span>
            <p className="text-2xl font-black text-slate-300 mt-1">{absentCount}</p>
          </div>
        </div>
      </div>

      {/* Pending Photos Alert Banner */}
      {pendingPhotos > 0 && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-200">
                {pendingPhotos} Foto Bukti Menunggu Review Guru
              </p>
              <p className="text-xs text-amber-300/80">
                Siswa telah mengirimkan foto bukti presensi selfie. Klik tombol "Review Foto" di bawah untuk menyetujui atau menolak.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-xs font-bold text-amber-300 shrink-0">
            Perlu Tindakan
          </span>
        </div>
      )}

      {/* Main Grid: QR Card (left) & Live Student Feed (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* QR Code Presentation Box (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-6 text-center flex flex-col items-center justify-center space-y-4 border-slate-700 shadow-xl">
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Kode QR Presensi Siswa
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQrFullscreen(true)}
                leftIcon={<Maximize2 size={14} />}
              >
                Proyektor
              </Button>
            </div>

            {session.status === "expired" || isSessionEnded ? (
              <div className="py-16 text-center space-y-2">
                <Clock className="mx-auto text-rose-400" size={48} />
                <p className="text-sm font-bold text-white">Sesi Telah Berakhir</p>
                <p className="text-xs text-slate-400 max-w-xs">
                  Kode QR telah dinonaktifkan dan tidak dapat lagi digunakan untuk presensi.
                </p>
              </div>
            ) : qrToken ? (
              <div className="p-4 rounded-3xl bg-white shadow-2xl shadow-white/5 border border-slate-200">
                <QRCodeSVG value={qrToken} size={220} level="M" />
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 text-xs animate-pulse">
                Menghasilkan QR Token aman...
              </div>
            )}

            <div className="text-center space-y-1">
              <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
                <RefreshCcw size={12} className="animate-spin text-brand-400" />
                QR Token disegarkan otomatis setiap 25 detik
              </p>
              <p className="text-[11px] text-slate-500">
                Siswa juga dapat memilih <strong>Absen dengan Foto</strong> melalui dashboard mereka.
              </p>
            </div>
          </Card>
        </div>

        {/* Live Attendance Student List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <Users size={18} className="text-brand-400" /> Kehadiran Siswa
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Daftar siswa yang telah presensi secara live.
                </p>
              </div>
              <span className="text-xs font-bold text-brand-400 bg-brand-500/10 px-2.5 py-1 rounded-full border border-brand-500/30">
                {records.length} Presensi
              </span>
            </div>

            {records.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl">
                <Radio className="mx-auto text-slate-600 mb-2 animate-pulse" size={32} />
                <p className="text-sm font-semibold text-slate-300">Menunggu Siswa Presensi...</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Siswa yang melakukan scan QR atau foto selfie akan langsung muncul di sini secara real-time.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {records
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime()
                  )
                  .map((r) => {
                    const initials = r.student_name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    return (
                      <div
                        key={r.id}
                        className="rounded-xl bg-slate-950/70 border border-slate-800/90 p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-brand-600/20 border border-brand-500/30 text-brand-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{r.student_name}</p>
                            <p className="text-xs text-slate-400 font-mono">
                              Pukul{" "}
                              {new Date(r.checked_in_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              WIB
                              Pukul {formatWibTime(r.checked_in_at)} WIB
                            </p>
                          </div>
                        </div>

                        {/* Indicators & Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {r.biometric_verified && (
                            <span
                              title="Biometrik Terverifikasi"
                              className="p-1.5 rounded-lg bg-slate-800 text-brand-400"
                            >
                              <Fingerprint size={14} />
                            </span>
                          )}

                          {r.location_verified && (
                            <span
                              title="Lokasi GPS Terverifikasi"
                              className="p-1.5 rounded-lg bg-slate-800 text-emerald-400"
                            >
                              <MapPin size={14} />
                            </span>
                          )}

                          {r.has_photo && (
                            <button
                              type="button"
                              onClick={() => viewPhoto(r)}
                              title={
                                r.photo_status === "approved"
                                  ? "Foto Disetujui (Klik untuk melihat)"
                                  : r.photo_status === "rejected"
                                  ? `Foto Ditolak: ${r.photo_rejection_reason || ""}`
                                  : "Foto Menunggu Review Guru (Klik untuk memverifikasi)"
                              }
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                r.photo_status === "approved"
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                                  : r.photo_status === "rejected"
                                  ? "bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25"
                                  : "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 animate-pulse"
                              }`}
                            >
                              <Camera size={13} />
                              <span>
                                {r.photo_status === "approved"
                                  ? "Disetujui"
                                  : r.photo_status === "rejected"
                                  ? "Ditolak"
                                  : "Review Foto"}
                              </span>
                            </button>
                          )}

                          <StatusBadge status={r.status} size="sm" />

                          {/* Status override button */}
                          <button
                            type="button"
                            onClick={() => {
                              setOverrideTarget(r);
                              setOverrideStatus(r.status);
                            }}
                            title="Ubah Status Manual"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                          >
                            <Edit2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: PHOTO PROOF REVIEW (APPROVE / REJECT) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(photoModal)}
        onClose={() => {
          setPhotoModal(null);
          setShowRejectInput(false);
          setRejectReasonInput("");
        }}
        title="Review Foto Bukti Presensi"
        description={`Siswa: ${photoModal?.record.student_name || ""}`}
        size="md"
      >
        {photoModal && (
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden bg-black border border-slate-700 aspect-square max-w-sm mx-auto shadow-2xl relative">
              <img
                src={photoModal.url}
                alt="Bukti Kehadiran"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2.5 left-2.5 right-2.5 flex justify-center">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg backdrop-blur-md ${
                    photoModal.record.photo_status === "approved"
                      ? "bg-emerald-600/90 text-white border border-emerald-400/40"
                      : photoModal.record.photo_status === "rejected"
                      ? "bg-rose-600/90 text-white border border-rose-400/40"
                      : "bg-amber-500/90 text-slate-950 font-black border border-amber-300"
                  }`}
                >
                  {photoModal.record.photo_status === "approved"
                    ? "✓ Foto Disetujui"
                    : photoModal.record.photo_status === "rejected"
                    ? "✕ Foto Ditolak"
                    : "🟡 Menunggu Review Guru"}
                </span>
              </div>
            </div>

            {photoModal.record.photo_rejection_reason && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300 text-left">
                <strong className="text-rose-200">Alasan Penolakan:</strong>{" "}
                {photoModal.record.photo_rejection_reason}
              </div>
            )}

            {showRejectInput && (
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-rose-300 uppercase tracking-wider">
                  Alasan Penolakan Foto
                </label>
                <input
                  type="text"
                  className="input-field border-rose-500/40 focus:border-rose-400"
                  placeholder="Contoh: Wajah tidak terlihat jelas / bukan di dalam kelas"
                  value={rejectReasonInput}
                  onChange={(e) => setRejectReasonInput(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            {/* Actions for teacher */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              {!showRejectInput ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    fullWidth
                    className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
                    onClick={() => setShowRejectInput(true)}
                    disabled={reviewSubmitting}
                  >
                    Tolak Foto
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    fullWidth
                    onClick={() => handleApprovePhoto(photoModal.record.id)}
                    isLoading={reviewSubmitting}
                  >
                    Setujui Foto
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    fullWidth
                    onClick={() => setShowRejectInput(false)}
                    disabled={reviewSubmitting}
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="md"
                    fullWidth
                    onClick={() => handleRejectPhoto(photoModal.record.id)}
                    isLoading={reviewSubmitting}
                  >
                    Konfirmasi Tolak
                  </Button>
                </>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              fullWidth
              onClick={() => {
                setPhotoModal(null);
                setShowRejectInput(false);
                setRejectReasonInput("");
              }}
            >
              Tutup Pratinjau
            </Button>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: FULLSCREEN PROJECTOR QR */}
      {/* ========================================================================= */}
      <Modal
        isOpen={qrFullscreen}
        onClose={() => setQrFullscreen(false)}
        title={session.subject_name}
        description={`Kelas: ${session.class_name} • Jam: ${session.start_time} - ${session.end_time} WIB`}
        size="lg"
      >
        <div className="text-center py-4 space-y-5">
          {qrToken ? (
            <div className="p-6 rounded-3xl bg-white shadow-2xl inline-block border-4 border-brand-500/40">
              <QRCodeSVG value={qrToken} size={320} level="H" />
            </div>
          ) : (
            <p className="text-slate-400">QR tidak tersedia.</p>
          )}

          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">
              Arahkan kamera smartphone ke kode QR di atas untuk presensi.
            </p>
            <p className="text-xs text-slate-400">
              Token QR berganti secara aman secara otomatis.
            </p>
          </div>

          <Button variant="secondary" size="md" onClick={() => setQrFullscreen(false)}>
            Keluar dari Tampilan Proyektor
          </Button>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: MANUAL STATUS OVERRIDE */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(overrideTarget)}
        onClose={() => setOverrideTarget(null)}
        title="Ubah Status Presensi Manual"
        description={`Siswa: ${overrideTarget?.student_name || ""}`}
        size="md"
      >
        {overrideTarget && (
          <form onSubmit={handleOverrideSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Status Baru
              </label>
              <select
                className="input-field"
                value={overrideStatus}
                onChange={(e) => setOverrideStatus(e.target.value)}
              >
                <option value="present">Hadir (Present)</option>
                <option value="late">Terlambat (Late)</option>
                <option value="excused">Izin (Excused)</option>
                <option value="sick">Sakit (Sick)</option>
                <option value="absent">Alpa (Absent)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Alasan Perubahan
              </label>
              <input
                className="input-field"
                placeholder="Contoh: Dispensasi tugas OSIS"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => setOverrideTarget(null)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                isLoading={overrideSubmitting}
              >
                Simpan Perubahan
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: EDIT SESSION SETTINGS */}
      {/* ========================================================================= */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Pengaturan Sesi"
        description={`Sesi: ${session.subject_name} (${session.class_name})`}
        size="md"
      >
        <form onSubmit={handleSaveSessionEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Jam Selesai (Format HH:MM)
            </label>
            <input
              type="time"
              required
              className="input-field"
              value={editEndTime}
              onChange={(e) => setEditEndTime(e.target.value)}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Jam selesai harus lebih besar dari jam mulai ({session.start_time} WIB).
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Toleransi Keterlambatan (Menit)
            </label>
            <input
              type="number"
              min="0"
              max="180"
              required
              className="input-field"
              value={editLateThreshold}
              onChange={(e) => setEditLateThreshold(Number(e.target.value))}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Siswa yang presensi setelah batas ini akan otomatis berstatus Terlambat.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setEditModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              isLoading={editSubmitting}
            >
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
