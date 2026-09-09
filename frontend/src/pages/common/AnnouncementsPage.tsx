import React, { useState, useEffect, useCallback } from "react";
import { 
  BellRing, Plus, Calendar, Tag, UserCheck, Trash2, 
  Edit3, RefreshCw, AlertCircle, Pin 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import type { Announcement } from "../../types";
import { 
  listAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement 
} from "../../api/announcementService";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";

export const AnnouncementsPage: React.FC = () => {
  const { role } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem("skagata_dismissed_announcements");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Admin Create/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Informasi");
  const [targetRole, setTargetRole] = useState("ALL");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = role === "admin";

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAnnouncements();
      setAnnouncements(res.announcements || []);
    } catch (err) {
      console.error("Gagal memuat pengumuman:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setTitle("");
    setCategory("Informasi");
    setTargetRole("ALL");
    setContent("");
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (a: Announcement) => {
    setEditingId(a.id);
    setTitle(a.title);
    setCategory(a.category);
    setTargetRole(a.target_role);
    setContent(a.content);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError("Judul dan isi pengumuman wajib diisi.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updateAnnouncement(editingId, {
          title: title.trim(),
          content: content.trim(),
          category,
          target_role: targetRole,
        });
      } else {
        await createAnnouncement(title.trim(), content.trim(), category, targetRole);
      }
      setIsModalOpen(false);
      fetchAnnouncements();
    } catch (err: any) {
      setError(err?.message || "Gagal menyimpan pengumuman.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (isAdmin) {
      if (!window.confirm("Yakin ingin menghapus pengumuman ini secara permanen?")) return;
      try {
        await deleteAnnouncement(id);
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      } catch (err: any) {
        alert(err?.message || "Gagal menghapus pengumuman.");
      }
    } else {
      if (!window.confirm("Hapus pengumuman ini dari tampilan Anda?")) return;
      const nextDismissed = [...dismissedIds, id];
      setDismissedIds(nextDismissed);
      try {
        localStorage.setItem("skagata_dismissed_announcements", JSON.stringify(nextDismissed));
      } catch {}
    }
  };

  const handleRestoreDismissed = () => {
    setDismissedIds([]);
    try {
      localStorage.removeItem("skagata_dismissed_announcements");
    } catch {}
  };

  const visibleAnnouncements = announcements.filter(
    (a) => !dismissedIds.includes(a.id)
  );

  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "penting":
        return "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800";
      case "kegiatan":
        return "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "libur":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "ujian":
        return "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <BellRing className="text-brand-600 dark:text-brand-400" size={28} />
            Pengumuman Sekolah
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Informasi resmi, agenda kegiatan, jadwal ujian, dan pengumuman kedinasan SMKN 3 Yogyakarta.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="primary"
              onClick={handleOpenCreate}
              leftIcon={<Plus size={18} />}
            >
              Buat Pengumuman
            </Button>
          )}

          <Button
            variant="outline"
            onClick={fetchAnnouncements}
            title="Segarkan data"
            leftIcon={<RefreshCw size={15} className={loading ? "animate-spin" : ""} />}
          >
            Refresh
          </Button>

          {dismissedIds.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRestoreDismissed}
              title="Tampilkan kembali pengumuman yang telah dihapus/disembunyikan"
            >
              Pulihkan ({dismissedIds.length})
            </Button>
          )}
        </div>
      </div>

      {/* Announcements Stream */}
      <div className="space-y-4 stagger-children">
        {loading ? (
          <Card className="p-12 text-center bg-white dark:bg-slate-900">
            <RefreshCw className="animate-spin mx-auto text-brand-600 mb-3" size={32} />
            <p className="text-sm text-slate-500">Memuat pengumuman terbaru...</p>
          </Card>
        ) : visibleAnnouncements.length === 0 ? (
          <Card className="p-12 text-center bg-white dark:bg-slate-900">
            <BellRing className="mx-auto text-slate-400 mb-3" size={40} />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Belum ada pengumuman</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {dismissedIds.length > 0
                ? "Semua pengumuman telah Anda bersihkan dari tampilan."
                : "Saat ini belum ada pengumuman resmi yang dipublikasikan."}
            </p>
            {dismissedIds.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={handleRestoreDismissed}
              >
                Tampilkan Kembali Pengumuman
              </Button>
            )}
          </Card>
        ) : (
          visibleAnnouncements.map((a) => (
            <Card
              key={a.id}
              className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-brand-500/40 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className={`px-2.5 py-0.5 rounded-full font-semibold border ${getCategoryColor(a.category)}`}>
                    {a.category}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-semibold border border-brand-200 dark:border-brand-800">
                    Untuk: {a.target_role === "ALL" ? "Semua Warga Sekolah" : a.target_role === "teacher" ? "Bapak/Ibu Guru" : "Siswa"}
                  </span>
                  <span className="text-slate-400 flex items-center gap-1">
                    <Calendar size={13} />
                    {a.created_at ? new Date(a.created_at).toLocaleDateString("id-ID", { dateStyle: "long" }) : "Terbaru"}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isAdmin && (
                    <button
                      onClick={() => handleOpenEdit(a)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit Pengumuman"
                    >
                      <Edit3 size={15} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title={isAdmin ? "Hapus Pengumuman (Permanen)" : "Hapus Pengumuman dari Tampilan"}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {a.title}
              </h2>

              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                {a.content}
              </p>

              {a.author_name && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-400 flex items-center gap-1.5">
                  <UserCheck size={13} className="text-brand-600 dark:text-brand-400" />
                  <span>Diterbitkan oleh: <strong className="text-slate-600 dark:text-slate-300">{a.author_name}</strong></span>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Admin Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Edit Pengumuman Sekolah" : "Buat Pengumuman Sekolah Baru"}
        description="Pengumuman akan langsung tampil di dashboard dan halaman pengumuman bagi pengguna yang ditargetkan."
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          <Input
            label="Judul Pengumuman *"
            placeholder="Contoh: Jadwal Ujian Akhir Semester Genap Tahun Ajaran 2025/2026"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Kategori *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              >
                <option value="Informasi">Informasi Umum</option>
                <option value="Penting">Penting (Mendesak)</option>
                <option value="Kegiatan">Agenda Kegiatan Sekolah</option>
                <option value="Ujian">Jadwal Ujian / Asesmen</option>
                <option value="Libur">Hari Libur / Cuti Bersama</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Target Penerima *
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              >
                <option value="ALL">Semua Pengguna (Guru & Siswa)</option>
                <option value="student">Khusus Siswa</option>
                <option value="teacher">Khusus Guru</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Isi Pengumuman Lengkap *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tuliskan rincian instruksi, waktu pelaksanaan, ketentuan pakaian/peralatan, atau hal penting lainnya..."
              rows={5}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={saving}
            >
              {editingId ? "Perbarui Pengumuman" : "Terbitkan Pengumuman"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AnnouncementsPage;
