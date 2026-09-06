import { useEffect, useState } from "react";
import { Search, Plus, Trash2 } from "lucide-react";
import { listStudents, createStudent, deleteStudent, listClasses } from "../../api/adminService";
import type { StudentRow, ClassRow } from "../../types";
import LoadingState, { EmptyState, ErrorState } from "../../components/LoadingState";
import { ApiRequestError } from "../../api/client";

export default function AdminStudents() {
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", student_code: "", full_name: "", class_id: "" });
  const [submitting, setSubmitting] = useState(false);

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

  async function handleDeactivate(id: number) {
    if (!confirm("Deactivate this student? Their attendance history will be preserved.")) return;
    await deleteStudent(id);
    load();
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
                    {s.is_active && (
                      <button onClick={() => handleDeactivate(s.id)} className="text-slate-500 hover:text-rose-400">
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
