import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { listClasses, createClass, listSubjects, createSubject } from "../../api/adminService";
import type { ClassRow, SubjectRow } from "../../types";
import LoadingState, { EmptyState } from "../../components/LoadingState";

export default function AdminClasses() {
  const [classes, setClasses] = useState<ClassRow[] | null>(null);
  const [subjects, setSubjects] = useState<SubjectRow[] | null>(null);
  const [showClassForm, setShowClassForm] = useState(false);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [classForm, setClassForm] = useState({ name: "", major: "", grade: "", academic_year: "" });
  const [subjectForm, setSubjectForm] = useState({ name: "", code: "" });

  function loadClasses() {
    listClasses().then((res) => setClasses(res.classes)).catch(() => setClasses([]));
  }
  function loadSubjects() {
    listSubjects().then((res) => setSubjects(res.subjects)).catch(() => setSubjects([]));
  }

  useEffect(() => { loadClasses(); loadSubjects(); }, []);

  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    await createClass(classForm);
    setClassForm({ name: "", major: "", grade: "", academic_year: "" });
    setShowClassForm(false);
    loadClasses();
  }

  async function handleCreateSubject(e: React.FormEvent) {
    e.preventDefault();
    await createSubject(subjectForm);
    setSubjectForm({ name: "", code: "" });
    setShowSubjectForm(false);
    loadSubjects();
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Classes & Subjects</h1>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Classes</h2>
          <button onClick={() => setShowClassForm((v) => !v)} className="btn-secondary text-sm">
            <Plus size={14} /> Add Class
          </button>
        </div>

        {showClassForm && (
          <form onSubmit={handleCreateClass} className="glass-card p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <input required placeholder="Name (e.g. XI TKJ 1)" className="input-field col-span-2 sm:col-span-1" value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} />
            <input placeholder="Major" className="input-field" value={classForm.major} onChange={(e) => setClassForm({ ...classForm, major: e.target.value })} />
            <input placeholder="Grade" className="input-field" value={classForm.grade} onChange={(e) => setClassForm({ ...classForm, grade: e.target.value })} />
            <input placeholder="Academic year" className="input-field" value={classForm.academic_year} onChange={(e) => setClassForm({ ...classForm, academic_year: e.target.value })} />
            <button type="submit" className="btn-primary col-span-2 sm:col-span-4">Save Class</button>
          </form>
        )}

        {!classes ? <LoadingState /> : classes.length === 0 ? <EmptyState label="No classes yet." /> : (
          <div className="glass-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-800">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Major</th>
                  <th className="px-4 py-3 font-medium">Grade</th>
                  <th className="px-4 py-3 font-medium">Students</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => (
                  <tr key={c.id} className="border-b border-slate-800/60 last:border-0">
                    <td className="px-4 py-3 text-white whitespace-nowrap">{c.name}</td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{c.major || "-"}</td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{c.grade || "-"}</td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{c.student_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Subjects</h2>
          <button onClick={() => setShowSubjectForm((v) => !v)} className="btn-secondary text-sm">
            <Plus size={14} /> Add Subject
          </button>
        </div>

        {showSubjectForm && (
          <form onSubmit={handleCreateSubject} className="glass-card p-5 grid grid-cols-2 gap-3">
            <input required placeholder="Subject name" className="input-field" value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} />
            <input placeholder="Code" className="input-field" value={subjectForm.code} onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })} />
            <button type="submit" className="btn-primary col-span-2">Save Subject</button>
          </form>
        )}

        {!subjects ? <LoadingState /> : subjects.length === 0 ? <EmptyState label="No subjects yet." /> : (
          <div className="glass-card divide-y divide-slate-800">
            {subjects.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3">
                <span className="text-white text-sm">{s.name}</span>
                <span className="text-slate-500 text-xs font-mono">{s.code}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
