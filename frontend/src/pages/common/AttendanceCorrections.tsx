import React, { useState, useEffect, useCallback } from "react";
import { 
  ClipboardCheck, Plus, CheckCircle, XCircle, Clock, 
  FileText, Paperclip, AlertCircle, RefreshCw, Eye, MessageSquare 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import type { AttendanceCorrection, CorrectionStatus } from "../../types";
import { 
  getMyCorrections, getTeacherCorrections, getAdminCorrections, 
  submitCorrection, reviewCorrection 
} from "../../api/correctionService";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";

export const AttendanceCorrections: React.FC = () => {
  const { role } = useAuth();
  const [corrections, setCorrections] = useState<AttendanceCorrection[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Student submission modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitDate, setSubmitDate] = useState(new Date().toISOString().split("T")[0]);
  const [targetStatus, setTargetStatus] = useState<string>("present");
  const [reason, setReason] = useState("Kendala Perangkat / Jaringan");
  const [explanation, setExplanation] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Review modal (Teacher / Admin)
  const [reviewItem, setReviewItem] = useState<AttendanceCorrection | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const isStudent = role === "student";
  const isTeacher = role === "teacher";
  const isAdmin = role === "admin";

  const fetchCorrections = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      if (isStudent) {
        res = await getMyCorrections();
      } else if (isTeacher) {
        res = await getTeacherCorrections();
      } else {
        res = await getAdminCorrections(statusFilter !== "ALL" ? statusFilter : undefined);
      }
      setCorrections(res.corrections || []);
    } catch (err) {
      console.error("Gagal memuat pengajuan koreksi:", err);
    } finally {
      setLoading(false);
    }
  }, [isStudent, isTeacher, statusFilter]);

  useEffect(() => {
    fetchCorrections();
  }, [fetchCorrections]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitDate || !explanation.trim()) {
      setSubmitError("Tanggal dan penjelasan rinci wajib diisi.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const formData = new FormData();
      formData.append("date", submitDate);
      formData.append("target_status", targetStatus);
      formData.append("reason", reason);
      formData.append("explanation", explanation.trim());
      if (attachment) {
        formData.append("attachment", attachment);
      }

      await submitCorrection(formData);
      setIsSubmitModalOpen(false);
      setExplanation("");
      setAttachment(null);
      fetchCorrections();
    } catch (err: any) {
      setSubmitError(err?.message || "Gagal mengajukan koreksi presensi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewItem) return;

    setReviewing(true);
    setReviewError(null);
    try {
      await reviewCorrection(reviewItem.id, reviewDecision, reviewNotes.trim() || undefined);
      setReviewItem(null);
      setReviewNotes("");
      fetchCorrections();
    } catch (err: any) {
      setReviewError(err?.message || "Gagal memproses verifikasi koreksi.");
    } finally {
      setReviewing(false);
    }
  };

  const getStatusBadge = (status: CorrectionStatus) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle size={12} /> Disetujui
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <XCircle size={12} /> Ditolak
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock size={12} /> Menunggu Review
          </span>
        );
    }
  };

  const getTargetStatusLabel = (val: string) => {
    const map: Record<string, string> = {
      present: "Hadir (Tepat Waktu)",
      late: "Terlambat",
      excused: "Izin (Dispensasi)",
      sick: "Sakit (Surat Dokter)",
    };
    return map[val] || val;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <ClipboardCheck className="text-brand-600 dark:text-brand-400" size={28} />
            Pengajuan Koreksi Presensi
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isStudent
              ? "Ajukan perbaikan data kehadiran jika mengalami kendala teknis atau memiliki surat izin resmi."
              : "Verifikasi pengajuan koreksi status kehadiran siswa dengan bukti pendukung."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isStudent && (
            <Button
              variant="primary"
              onClick={() => setIsSubmitModalOpen(true)}
              leftIcon={<Plus size={18} />}
            >
              Ajukan Koreksi
            </Button>
          )}

          <Button
            variant="outline"
            onClick={fetchCorrections}
            title="Segarkan data"
            leftIcon={<RefreshCw size={15} className={loading ? "animate-spin" : ""} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter for Admin */}
      {isAdmin && (
        <Card className="p-3.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Filter Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">Semua Pengajuan</option>
              <option value="PENDING">Menunggu Review</option>
              <option value="APPROVED">Disetujui</option>
              <option value="REJECTED">Ditolak</option>
            </select>
          </div>
        </Card>
      )}

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <Card className="p-12 text-center bg-white dark:bg-slate-900">
            <RefreshCw className="animate-spin mx-auto text-brand-600 mb-3" size={32} />
            <p className="text-sm text-slate-500">Memuat pengajuan koreksi presensi...</p>
          </Card>
        ) : corrections.length === 0 ? (
          <Card className="p-12 text-center bg-white dark:bg-slate-900">
            <ClipboardCheck className="mx-auto text-slate-400 mb-3" size={40} />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Tidak ada pengajuan koreksi</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {isStudent
                ? "Anda belum pernah mengajukan koreksi presensi."
                : "Saat ini tidak ada permohonan koreksi kehadiran yang perlu ditinjau."}
            </p>
          </Card>
        ) : (
          corrections.map((item) => (
            <Card
              key={item.id}
              className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    {getStatusBadge(item.status)}
                    <span className="px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-semibold border border-brand-200 dark:border-brand-800">
                      Target: {getTargetStatusLabel(item.target_status)}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      Tanggal: <strong className="text-slate-700 dark:text-slate-200">{item.date}</strong>
                    </span>
                  </div>

                  {!isStudent && (
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {item.student_name || "Siswa"} ({item.student_code}) • {item.class_name || "Kelas"}
                    </div>
                  )}

                  <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    Alasan: <span className="font-semibold text-slate-800 dark:text-slate-100">{item.reason}</span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    "{item.explanation}"
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-400 pt-1 flex-wrap">
                    {item.attachment_path && (
                      <a
                        href={item.attachment_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-brand-600 dark:text-brand-400 hover:underline font-medium"
                      >
                        <Paperclip size={13} />
                        <span>Lihat Bukti Lampiran</span>
                      </a>
                    )}
                    {item.reviewed_by && (
                      <span className="text-slate-500 dark:text-slate-400">
                        Ditinjau oleh: {item.reviewer_name || "Pengelola"}
                        {item.review_notes && ` — "${item.review_notes}"`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Review Action for Teacher / Admin */}
                {!isStudent && item.status === "PENDING" && (
                  <div className="flex items-center gap-2 shrink-0 md:self-center">
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => {
                        setReviewItem(item);
                        setReviewDecision("APPROVED");
                      }}
                      leftIcon={<CheckCircle size={15} />}
                    >
                      Setujui
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        setReviewItem(item);
                        setReviewDecision("REJECTED");
                      }}
                      leftIcon={<XCircle size={15} />}
                    >
                      Tolak
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Student Submission Modal */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Ajukan Koreksi Presensi"
        description="Pastikan data tanggal dan alasan yang diisi valid disertai bukti yang dapat dipertanggungjawabkan."
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {submitError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-600 dark:text-rose-400">
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Tanggal Presensi yang Ingin Dikoreksi *
              </label>
              <input
                type="date"
                value={submitDate}
                onChange={(e) => setSubmitDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Status Kehadiran Seharusnya *
              </label>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              >
                <option value="present">Hadir (Tepat Waktu)</option>
                <option value="late">Terlambat</option>
                <option value="sick">Sakit</option>
                <option value="excused">Izin / Dispensasi</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Kategori Alasan *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            >
              <option value="Kendala Perangkat / Jaringan">Kendala Perangkat / Jaringan / HP Mati</option>
              <option value="GPS Tidak Akurat di Lingkungan Sekolah">GPS Tidak Akurat di Lingkungan Sekolah</option>
              <option value="Sakit dengan Surat Dokter">Sakit dengan Surat Dokter</option>
              <option value="Tugas / Dispensasi Sekolah (Lomba/OSIS)">Tugas / Dispensasi Sekolah (Lomba/OSIS)</option>
              <option value="Lupa Check-in Sesi Presensi">Lupa Check-in Sesi Presensi</option>
              <option value="Lainnya">Alasan Lainnya</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Penjelasan Rinci Kronologi *
            </label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Ceritakan dengan lengkap mata pelajaran apa, jam berapa, dan mengapa koreksi dibutuhkan..."
              rows={3}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Unggah Bukti Pendukung (Surat Dokter / Surat Tugas / Screenshot)
            </label>
            <input
              type="file"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setAttachment(e.target.files[0]);
                }
              }}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-950/60 dark:file:text-brand-300"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsSubmitModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={submitting}
            >
              Kirim Pengajuan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Review Modal for Teacher/Admin */}
      <Modal
        isOpen={Boolean(reviewItem)}
        onClose={() => setReviewItem(null)}
        title={reviewDecision === "APPROVED" ? "Setujui Koreksi Presensi" : "Tolak Koreksi Presensi"}
        description={`Siswa: ${reviewItem?.student_name} (${reviewItem?.student_code}) • Tanggal: ${reviewItem?.date}`}
        size="md"
      >
        <form onSubmit={handleReviewSubmit} className="space-y-4">
          {reviewError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-600 dark:text-rose-400">
              {reviewError}
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
            <div><strong>Target Status:</strong> {reviewItem && getTargetStatusLabel(reviewItem.target_status)}</div>
            <div><strong>Alasan:</strong> {reviewItem?.reason}</div>
            <div><strong>Penjelasan:</strong> {reviewItem?.explanation}</div>
            {reviewItem?.attachment_path && (
              <div className="pt-1">
                <a
                  href={reviewItem.attachment_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 dark:text-brand-400 underline font-medium"
                >
                  Lihat File Lampiran Siswa
                </a>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Catatan Review / Pertimbangan (Opsional)
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Berikan alasan persetujuan atau penolakan..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              type="button"
              onClick={() => setReviewItem(null)}
            >
              Batal
            </Button>
            <Button
              variant={reviewDecision === "APPROVED" ? "success" : "danger"}
              type="submit"
              isLoading={reviewing}
            >
              Konfirmasi {reviewDecision === "APPROVED" ? "Persetujuan" : "Penolakan"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AttendanceCorrections;
