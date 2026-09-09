import { useEffect, useState } from "react";
import { Search, Plus, Trash2, CheckCircle2, Edit2 } from "lucide-react";
import { listStudents, createStudent, updateStudent, deleteStudent, listClasses } from "../../api/adminService";
import type { StudentRow, ClassRow } from "../../types";
import LoadingState, { EmptyState, ErrorState } from "../../components/LoadingState";
import { ApiRequestError } from "../../api/client";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";

export default function AdminStudents() {
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", student_code: "", full_name: "", class_id: "" });
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal State
  const [editTarget, setEditTarget] = useState<StudentRow | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", class_id: "" });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await listStudents(search);
      setStudents(res.students);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "Failed to load students.");
    }
  }

  useEffect(() => {
    load();
    listClasses().then((res) => setClasses(res.classes)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createStudent({
        ...form,
        class_id: form.class_id ? Number(form.class_id) : undefined,
      });
      setForm({ username: "", password: "", student_code: "", full_name: "", class_id: "" });
      setShowForm(false);
      load();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "Failed to create student.");
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(s: StudentRow) {
    setEditTarget(s);
    setEditForm({
      full_name: s.full_name,
      class_id: s.class_id ? String(s.class_id) : "",
    });
    setEditError(null);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      await updateStudent(editTarget.id, {
        full_name: editForm.full_name.trim(),
        class_id: editForm.class_id ? Number(editForm.class_id) : undefined,
      });
      setEditTarget(null);
      load();
    } catch (e: any) {
      setEditError(e instanceof ApiRequestError ? e.message : "Gagal memperbarui data siswa.");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDeactivate(id: number) {
    if (!confirm("Nonaktifkan akun siswa ini? Riwayat presensi akan tetap tersimpan aman di database.")) return;
    await deleteStudent(id);
    load();
  }

  async function handleReactivate(id: number) {
    if (!confirm("Aktifkan kembali akun siswa ini?")) return;
    try {
      await updateStudent(id, { is_active: true });
      load();
    } catch (e: any) {
      setError(e instanceof ApiRequestError ? e.message : "Gagal mengaktifkan kembali akun siswa.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Students</h1>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
          <Plus size={16} /> Add Student
        </button>
      </div>

      {error && <ErrorState message={error} />}

      {showForm && (
        <form onSubmit={handleCreate} className="glass-card p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input required placeholder="Full name" className="input-field" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <input required placeholder="Student code (NIS)" className="input-field" value={form.student_code} onChange={(e) => setForm({ ...form, student_code: e.target.value })} />
          <input required placeholder="Username" className="input-field" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <input required placeholder="Password" type="password" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select className="input-field" value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
            <option value="">No class</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button type="submit" disabled={submitting} className="btn-primary sm:col-span-2">
            {submitting ? "Saving..." : "Save Student"}
          </button>
        </form>
      )}

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            placeholder="Search by name..."
            className="input-field pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-secondary">Search</button>
      </form>

      {!students ? (
        <LoadingState />
      ) : students.length === 0 ? (
        <EmptyState label="No students found." />
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-800">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Class</th>
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-slate-800/60 last:border-0">
                  <td className="px-4 py-3 text-slate-400 font-mono whitespace-nowrap">{s.student_code}</td>
                  <td className="px-4 py-3 text-white whitespace-nowrap">{s.full_name}</td>
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{s.class_name || "-"}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono whitespace-nowrap">{s.username}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${s.is_active ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-slate-500/15 text-slate-400 border border-slate-500/30"}`}>
                      {s.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(s)}
                        title="Edit Data Siswa"
                        className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        <Edit2 size={15} />
                      </button>
                      {s.is_active ? (
                        <button
                          onClick={() => handleDeactivate(s.id)}
                          title="Nonaktifkan Akun"
                          className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(s.id)}
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

      {/* MODAL: EDIT DATA SISWA */}
      <Modal
        isOpen={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title="Edit Data Siswa"
        description={`Mengubah data siswa ${editTarget?.full_name || ""} (${editTarget?.student_code || ""})`}
        size="md"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Nama Lengkap Siswa
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
              Kelas Siswa
            </label>
            <select
              className="input-field"
              value={editForm.class_id}
              onChange={(e) => setEditForm({ ...editForm, class_id: e.target.value })}
            >
              <option value="">-- Tanpa Kelas / Belum Ditentukan --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
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
