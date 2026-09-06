import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { listTeachers, createTeacher, deleteTeacher } from "../../api/adminService";
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
    if (!confirm("Deactivate this teacher?")) return;
    await deleteTeacher(id);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Teachers</h1>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
          <Plus size={16} /> Add Teacher
        </button>
      </div>

      {error && <ErrorState message={error} />}

      {showForm && (
        <form onSubmit={handleCreate} className="glass-card p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input required placeholder="Full name" className="input-field" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <input required placeholder="Teacher code (NIP)" className="input-field" value={form.teacher_code} onChange={(e) => setForm({ ...form, teacher_code: e.target.value })} />
          <input required placeholder="Username" className="input-field" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <input required placeholder="Password" type="password" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <input placeholder="Subject specialty" className="input-field sm:col-span-2" value={form.subject_specialty} onChange={(e) => setForm({ ...form, subject_specialty: e.target.value })} />
          <button type="submit" disabled={submitting} className="btn-primary sm:col-span-2">
            {submitting ? "Saving..." : "Save Teacher"}
          </button>
        </form>
      )}

      {!teachers ? (
        <LoadingState />
      ) : teachers.length === 0 ? (
        <EmptyState label="No teachers found." />
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-800">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Specialty</th>
                <th className="px-4 py-3 font-medium">Username</th>
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
                  <td className="px-4 py-3 text-right">
                    {t.is_active && (
                      <button onClick={() => handleDeactivate(t.id)} className="text-slate-500 hover:text-rose-400">
                        <Trash2 size={16} />
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
