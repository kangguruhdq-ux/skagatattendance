import { useEffect, useState } from "react";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { listTeachers, createTeacher, updateTeacher, deleteTeacher } from "../../api/adminService";
import type { TeacherRow } from "../../types";
import LoadingState, { EmptyState, ErrorState } from "../../components/LoadingState";
import { ApiRequestError } from "../../api/client";

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState<TeacherRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", teacher_code: "", full_name: "", subject_specialty: "" });
  const [submitting, setSubmitting] = useState(false);

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
                    {t.is_active ? (
                      <button
                        onClick={() => handleDeactivate(t.id)}
                        title="Nonaktifkan Akun"
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(t.id)}
                        title="Aktifkan Kembali Akun"
                        className="text-slate-500 hover:text-emerald-400 p-1"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
