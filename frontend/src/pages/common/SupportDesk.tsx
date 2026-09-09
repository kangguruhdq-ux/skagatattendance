import React, { useState, useEffect, useCallback } from "react";
import { 
  LifeBuoy, Plus, Search, Filter, MessageSquare, AlertTriangle, 
  CheckCircle2, Clock, Paperclip, ChevronRight, RefreshCw, X, Shield 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import type { SupportTicket, TicketStats, TicketStatus, TicketPriority } from "../../types";
import { listTickets, createTicket, getTicketStats } from "../../api/supportService";
import { TicketDetailModal } from "../../components/support/TicketDetailModal";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { formatWibDateTime } from "../../utils/date";

export const SupportDesk: React.FC = () => {
  const { role, userId } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  
  // Selected ticket for modal conversation
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // New ticket modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState("Presensi & Absensi");
  const [newPriority, setNewPriority] = useState<TicketPriority>("MEDIUM");
  const [newMessage, setNewMessage] = useState("");
  const [newAttachment, setNewAttachment] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const isAdminOrTeacher = role === "admin" || role === "teacher";

  const fetchTicketsData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (categoryFilter !== "ALL") params.category = categoryFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [ticketsRes, statsRes] = await Promise.all([
        listTickets(params),
        isAdminOrTeacher ? getTicketStats().catch(() => null) : Promise.resolve(null),
      ]);

      setTickets(ticketsRes.tickets || []);
      if (statsRes) {
        setStats(statsRes);
      }
    } catch (err) {
      console.error("Gagal memuat tiket:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, searchQuery, isAdminOrTeacher]);

  useEffect(() => {
    fetchTicketsData();
  }, [fetchTicketsData]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) {
      setCreateError("Judul dan pesan laporan wajib diisi.");
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const formData = new FormData();
      formData.append("subject", newSubject.trim());
      formData.append("category", newCategory);
      formData.append("priority", newPriority);
      formData.append("description", newMessage.trim());
      formData.append("message", newMessage.trim());
      if (newAttachment) {
        formData.append("attachment", newAttachment);
      }

      const created = await createTicket(formData);
      setIsCreateModalOpen(false);
      setNewSubject("");
      setNewMessage("");
      setNewAttachment(null);
      fetchTicketsData();
      
      // Auto open detail for the newly created ticket
      setSelectedTicketId(created.id);
      setIsDetailModalOpen(true);
    } catch (err: any) {
      setCreateError(err?.message || "Gagal membuat tiket bantuan.");
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    const map: Record<TicketStatus, { label: string; bg: string; text: string }> = {
      OPEN: { label: "Terbuka", bg: "bg-blue-100 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300" },
      IN_PROGRESS: { label: "Diproses", bg: "bg-amber-100 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-300" },
      WAITING_FOR_USER: { label: "Menunggu Pengguna", bg: "bg-purple-100 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800", text: "text-purple-700 dark:text-purple-300" },
      RESOLVED: { label: "Selesai", bg: "bg-emerald-100 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300" },
      CLOSED: { label: "Ditutup", bg: "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700", text: "text-slate-600 dark:text-slate-400" },
    };
    const conf = map[status] || map.OPEN;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${conf.bg} ${conf.text}`}>
        {conf.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: TicketPriority) => {
    const map: Record<TicketPriority, { label: string; color: string }> = {
      LOW: { label: "Rendah", color: "text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700" },
      MEDIUM: { label: "Sedang", color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800" },
      HIGH: { label: "Tinggi", color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800" },
    };
    const conf = map[priority] || map.MEDIUM;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${conf.color}`}>
        {conf.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <LifeBuoy className="text-brand-600 dark:text-brand-400 shrink-0" size={26} />
            <span className="truncate">Pusat Bantuan & Tiket Dukungan</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Layanan pengaduan kendala presensi, GPS, kamera, akun, dan komunikasi langsung dengan tim pengelola.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
          leftIcon={<Plus size={18} />}
          className="w-full sm:w-auto shrink-0 justify-center"
        >
          Buat Tiket Baru
        </Button>
      </div>

      {/* Metrics Banner for Admin / Teacher */}
      {isAdminOrTeacher && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
          <Card className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Tiket</span>
              <LifeBuoy size={18} className="text-slate-400" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-2">{stats.total}</p>
          </Card>

          <Card className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-blue-100 dark:border-blue-900/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Perlu Diproses</span>
              <Clock size={18} className="text-blue-500" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">{stats.open + stats.in_progress}</p>
          </Card>

          <Card className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-900/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Selesai (Resolved)</span>
              <CheckCircle2 size={18} className="text-emerald-500" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{stats.resolved}</p>
          </Card>

          <Card className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-rose-100 dark:border-rose-900/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-rose-600 dark:text-rose-400">Prioritas Tinggi</span>
              <AlertTriangle size={18} className="text-rose-500" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">{stats.high_priority}</p>
          </Card>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5 sm:gap-3">
          <div className="relative flex-1 min-w-0 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="Cari berdasarkan nomor tiket, subjek, atau pelapor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-2 w-full lg:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter Status Tiket"
              className="w-full lg:w-auto px-3 py-2 sm:py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">Semua Status</option>
              <option value="OPEN">Terbuka (OPEN)</option>
              <option value="IN_PROGRESS">Diproses</option>
              <option value="WAITING_FOR_USER">Menunggu Pengguna</option>
              <option value="RESOLVED">Selesai</option>
              <option value="CLOSED">Ditutup</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter Kategori Tiket"
              className="w-full lg:w-auto px-3 py-2 sm:py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="Presensi & Absensi">Presensi & Absensi</option>
              <option value="Kendala GPS / Lokasi">Kendala GPS / Lokasi</option>
              <option value="Kendala Kamera / Foto">Kendala Kamera / Foto</option>
              <option value="Akun & Kata Sandi">Akun & Kata Sandi</option>
              <option value="Jadwal & Kelas">Jadwal & Kelas</option>
              <option value="Lainnya">Lainnya</option>
            </select>

            <Button
              variant="outline"
              size="md"
              onClick={fetchTicketsData}
              title="Segarkan data"
              className="w-full sm:col-span-2 lg:w-auto justify-center"
              leftIcon={<RefreshCw size={15} className={loading ? "animate-spin" : ""} />}
            >
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* Tickets List */}
      <div className="space-y-3">
        {loading ? (
          <Card className="p-8 sm:p-12 text-center bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <RefreshCw className="animate-spin mx-auto text-brand-600 mb-3" size={32} />
            <p className="text-sm text-slate-500">Memuat daftar tiket bantuan...</p>
          </Card>
        ) : tickets.length === 0 ? (
          <Card className="p-8 sm:p-12 text-center bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <LifeBuoy className="mx-auto text-slate-400 mb-3" size={36} />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Tidak ada tiket bantuan</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Tidak ditemukan tiket yang sesuai dengan filter saat ini.
            </p>
          </Card>
        ) : (
          tickets.map((t) => (
            <Card
              key={t.id}
              onClick={() => {
                setSelectedTicketId(t.id);
                setIsDetailModalOpen(true);
              }}
              className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 hover:border-brand-500/60 dark:hover:border-brand-500/60 transition-all cursor-pointer group shadow-sm hover:shadow-md"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs">
                    <span className="font-mono font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-2 py-0.5 rounded border border-brand-200 dark:border-brand-800 text-[11px] sm:text-xs">
                      {t.ticket_number}
                    </span>
                    {getStatusBadge(t.status)}
                    {getPriorityBadge(t.priority)}
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-[11px] sm:text-xs truncate max-w-[140px] sm:max-w-none">
                      {t.category}
                    </span>
                    {t.is_deleted && (
                      <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-medium border border-rose-200 dark:border-rose-800 text-[11px]">
                        Terhapus
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors break-words">
                    {t.subject}
                  </h3>

                  <div className="flex items-center gap-2 sm:gap-4 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                    {isAdminOrTeacher && (
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        Pelapor: {t.user_name} ({t.user_role})
                      </span>
                    )}
                    <span>{formatWibDateTime(t.created_at)}</span>
                    {t.attachment_path && (
                      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                        <Paperclip size={12} /> Ada Lampiran
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <MessageSquare size={14} />
                    <span>{t.message_count ?? (t.messages ? t.messages.length : 1)} respon</span>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Ticket Detail & Conversation Modal */}
      <TicketDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTicketId(null);
        }}
        ticketId={selectedTicketId}
        currentUserId={userId ?? undefined}
        currentUserRole={role || undefined}
        onTicketUpdated={fetchTicketsData}
      />

      {/* Create New Ticket Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Buat Tiket Bantuan Baru"
        description="Jelaskan kendala yang dialami dengan rinci agar tim pengelola dapat segera menindaklanjuti."
        size="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {createError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-600 dark:text-rose-400">
              {createError}
            </div>
          )}

          <Input
            label="Subjek / Ringkasan Kendala *"
            placeholder="Contoh: Gagal check-in presensi karena GPS melenceng"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Kategori Kendala *
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              >
                <option value="Presensi & Absensi">Presensi & Absensi</option>
                <option value="Kendala GPS / Lokasi">Kendala GPS / Lokasi</option>
                <option value="Kendala Kamera / Foto">Kendala Kamera / Foto</option>
                <option value="Akun & Kata Sandi">Akun & Kata Sandi</option>
                <option value="Jadwal & Kelas">Jadwal & Kelas</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Tingkat Prioritas *
              </label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as TicketPriority)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              >
                <option value="LOW">Rendah (Pertanyaan umum / saran)</option>
                <option value="MEDIUM">Sedang (Kendala standar presensi)</option>
                <option value="HIGH">Tinggi (Mendesak / sesi sedang berjalan)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Pesan / Penjelasan Detail Kendala *
            </label>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Jelaskan kronologi kendala, mata pelajaran, jam kejadian, atau pesan error yang tampil..."
              rows={4}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Lampiran Bukti (Screenshot / Foto / Dokumen Opsional)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) {
                  setCreateError("Ukuran berkas lampiran maksimal 5MB.");
                  e.target.value = "";
                  return;
                }
                setNewAttachment(file);
                setCreateError(null);
              }}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-950/60 dark:file:text-brand-300 cursor-pointer"
            />
            {newAttachment && (
              <div className="mt-2 flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                  {newAttachment.name} ({(newAttachment.size / 1024).toFixed(0)} KB)
                </span>
                <button
                  type="button"
                  onClick={() => setNewAttachment(null)}
                  className="text-rose-500 hover:text-rose-600 text-[11px] font-semibold ml-2 hover:underline"
                >
                  Hapus
                </button>
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-1">Mendukung file JPG, PNG, WEBP, atau PDF (maks. 5MB).</p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={creating}
            >
              Kirim Tiket
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SupportDesk;
