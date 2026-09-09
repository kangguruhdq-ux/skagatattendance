import { useEffect, useState } from "react";
import { Plus, Trash2, CheckCircle2, Edit2 } from "lucide-react";
import { listTeachers, createTeacher, updateTeacher, deleteTeacher } from "../../api/adminService";
import type { TeacherRow } from "../../types";
import LoadingState, { EmptyState, ErrorState } from "../../components/LoadingState";
import { ApiRequestError } from "../../api/client";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState<TeacherRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", teacher_code: "", full_name: "", subject_specialty: "" });
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal State
  const [editTarget, setEditTarget] = useState<TeacherRow | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", subject_specialty: "" });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await listTeachers();
      setTeachers(res.teachers);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "Failed to load teachers.");
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createTeacher(form);
      setForm({ username: "", password: "", teacher_code: "", full_name: "", subject_specialty: "" });
      setShowForm(false);
      load();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "Failed to create teacher.");
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(t: TeacherRow) {
    setEditTarget(t);
    setEditForm({
      full_name: t.full_name,
      subject_specialty: t.subject_specialty || "",
    });
    setEditError(null);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      await updateTeacher(editTarget.id, {
        full_name: editForm.full_name.trim(),
        subject_specialty: editForm.subject_specialty.trim(),
      });
      setEditTarget(null);
      load();
    } catch (e: any) {
      setEditError(e instanceof ApiRequestError ? e.message : "Gagal memperbarui data guru.");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDeactivate(id: number) {
    if (!confirm("Nonaktifkan akun guru ini? Sesi presensi dan riwayat mengajar akan tetap tersimpan aman di database.")) return;
    await deleteTeacher(id);
    load();
  }

  async function handleReactivate(id: number) {
    if (!confirm("Aktifkan kembali akun guru ini?")) return;
    try {
      await updateTeacher(id, { is_active: true });
      load();
    } catch (e: any) {
      setError(e instanceof ApiRequestError ? e.message : "Gagal mengaktifkan kembali akun guru.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Data Guru</h1>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
          <Plus size={16} /> Tambah Guru
        </button>
      </div>

      {error && <ErrorState message={error} />}

      {showForm && (
        <form onSubmit={handleCreate} className="glass-card p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input required placeholder="Nama Lengkap" className="input-field" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <input required placeholder="Kode Guru (NIP)" className="input-field" value={form.teacher_code} onChange={(e) => setForm({ ...form, teacher_code: e.target.value })} />
          <input required placeholder="Username" className="input-field" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <input required placeholder="Password" type="password" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <input placeholder="Spesialisasi Mapel" className="input-field sm:col-span-2" value={form.subject_specialty} onChange={(e) => setForm({ ...form, subject_specialty: e.target.value })} />
          <button type="submit" disabled={submitting} className="btn-primary sm:col-span-2">
            {submitting ? "Menyimpan..." : "Simpan Data Guru"}
          </button>
        </form>
      )}

      {!teachers ? (
        <LoadingState />
      ) : teachers.length === 0 ? (
        <EmptyState label="Belum ada data guru." />
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-800">
                <th className="px-4 py-3 font-medium">NIP</th>
                <th className="px-4 py-3 font-medium">Nama Guru</th>
                <th className="px-4 py-3 font-medium">Keahlian</th>
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id} className="border-b border-slate-800/60 last:border-0">
                  <td className="px-4 py-3 text-slate-400 font-mono whitespace-nowrap">{t.teacher_code}</td>
                  <td className="px-4 py-3 text-white whitespace-nowrap">{t.full_name}</td>
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{t.subject_specialty || "-"}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono whitespace-nowrap">{t.username}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${t.is_active ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-slate-500/15 text-slate-400 border border-slate-500/30"}`}>
                      {t.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(t)}
                        title="Edit Data Guru"
                        className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        <Edit2 size={15} />
                      </button>
                      {t.is_active ? (
                        <button
                          onClick={() => handleDeactivate(t.id)}
                          title="Nonaktifkan Akun"
                          className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(t.id)}
                          title="Aktifkan Kembali Akun"
                          className="text-slate-500 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors"
                        >
                          <CheckCircle2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: EDIT DATA GURU */}
      <Modal
        isOpen={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title="Edit Data Guru"
        description={`Mengubah data guru ${editTarget?.full_name || ""} (${editTarget?.teacher_code || ""})`}
        size="md"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Nama Lengkap Guru
            </label>
            <input
              required
              className="input-field"
              value={editForm.full_name}
              onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Spesialisasi Mata Pelajaran
            </label>
            <input
              className="input-field"
              placeholder="Contoh: Pemrograman Web & Bergerak"
              value={editForm.subject_specialty}
              onChange={(e) => setEditForm({ ...editForm, subject_specialty: e.target.value })}
            />
          </div>

          {editError && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-center gap-2">
              <span>{editError}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setEditTarget(null)}
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
