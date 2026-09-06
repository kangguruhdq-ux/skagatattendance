import { useEffect, useState } from "react";
import {
  BookOpen,
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  listClasses,
  createClass,
  updateClass,
  deleteClass,
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} from "../../api/adminService";
import type { ClassRow, SubjectRow } from "../../types";
import { ApiRequestError } from "../../api/client";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Skeleton } from "../../components/ui/Skeleton";

export default function AdminClasses() {
  const [classes, setClasses] = useState<ClassRow[] | null>(null);
  const [subjects, setSubjects] = useState<SubjectRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Class Modals
  const [createClassModal, setCreateClassModal] = useState(false);
  const [editClassTarget, setEditClassTarget] = useState<ClassRow | null>(null);
  const [deleteClassTarget, setDeleteClassTarget] = useState<ClassRow | null>(null);
  const [classForm, setClassForm] = useState({
    name: "",
    major: "",
    grade: "",
    academic_year: "",
  });
  const [classSubmitting, setClassSubmitting] = useState(false);
  const [classActionError, setClassActionError] = useState<string | null>(null);

  // Subject Modals
  const [createSubjectModal, setCreateSubjectModal] = useState(false);
  const [editSubjectTarget, setEditSubjectTarget] = useState<SubjectRow | null>(null);
  const [deleteSubjectTarget, setDeleteSubjectTarget] = useState<SubjectRow | null>(null);
  const [subjectForm, setSubjectForm] = useState({ name: "", code: "" });
  const [subjectSubmitting, setSubjectSubmitting] = useState(false);
  const [subjectActionError, setSubjectActionError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [classRes, subRes] = await Promise.all([listClasses(), listSubjects()]);
      setClasses(classRes.classes);
      setSubjects(subRes.subjects);
    } catch (err: any) {
      setError(err instanceof ApiRequestError ? err.friendlyMessage : "Gagal memuat data kelas dan mata pelajaran.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Class Handlers
  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    setClassSubmitting(true);
    setClassActionError(null);
    try {
      await createClass(classForm);
      setCreateClassModal(false);
      setClassForm({ name: "", major: "", grade: "", academic_year: "" });
      loadData();
    } catch (err: any) {
      setClassActionError(err instanceof ApiRequestError ? err.friendlyMessage : "Gagal membuat kelas.");
    } finally {
      setClassSubmitting(false);
    }
  }

  function openEditClass(c: ClassRow) {
    setEditClassTarget(c);
    setClassForm({
      name: c.name,
      major: c.major || "",
      grade: c.grade || "",
      academic_year: c.academic_year || "",
    });
    setClassActionError(null);
  }

  async function handleUpdateClass(e: React.FormEvent) {
    e.preventDefault();
    if (!editClassTarget) return;
    setClassSubmitting(true);
    setClassActionError(null);
    try {
      await updateClass(editClassTarget.id, classForm);
      setEditClassTarget(null);
      loadData();
    } catch (err: any) {
      setClassActionError(err instanceof ApiRequestError ? err.friendlyMessage : "Gagal memperbarui kelas.");
    } finally {
      setClassSubmitting(false);
    }
  }

  async function handleDeleteClassConfirm() {
    if (!deleteClassTarget) return;
    setClassSubmitting(true);
    setClassActionError(null);
    try {
      await deleteClass(deleteClassTarget.id);
      setDeleteClassTarget(null);
      loadData();
    } catch (err: any) {
      setClassActionError(err instanceof ApiRequestError ? err.friendlyMessage : "Gagal menghapus kelas.");
    } finally {
      setClassSubmitting(false);
    }
  }

  // Subject Handlers
  async function handleCreateSubject(e: React.FormEvent) {
    e.preventDefault();
    setSubjectSubmitting(true);
    setSubjectActionError(null);
    try {
      await createSubject(subjectForm);
      setCreateSubjectModal(false);
      setSubjectForm({ name: "", code: "" });
      loadData();
    } catch (err: any) {
      setSubjectActionError(err instanceof ApiRequestError ? err.friendlyMessage : "Gagal membuat mata pelajaran.");
    } finally {
      setSubjectSubmitting(false);
    }
  }

  function openEditSubject(s: SubjectRow) {
    setEditSubjectTarget(s);
    setSubjectForm({ name: s.name, code: s.code || "" });
    setSubjectActionError(null);
  }

  async function handleUpdateSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!editSubjectTarget) return;
    setSubjectSubmitting(true);
    setSubjectActionError(null);
    try {
      await updateSubject(editSubjectTarget.id, subjectForm);
      setEditSubjectTarget(null);
      loadData();
    } catch (err: any) {
      setSubjectActionError(err instanceof ApiRequestError ? err.friendlyMessage : "Gagal memperbarui mata pelajaran.");
    } finally {
      setSubjectSubmitting(false);
    }
  }

  async function handleDeleteSubjectConfirm() {
    if (!deleteSubjectTarget) return;
    setSubjectSubmitting(true);
    setSubjectActionError(null);
    try {
      await deleteSubject(deleteSubjectTarget.id);
      setDeleteSubjectTarget(null);
      loadData();
    } catch (err: any) {
      setSubjectActionError(err instanceof ApiRequestError ? err.friendlyMessage : "Gagal menghapus mata pelajaran.");
    } finally {
      setSubjectSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <BookOpen className="text-brand-400" size={26} /> Kelola Kelas & Mata Pelajaran
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Pengaturan rombongan belajar, program keahlian, dan kurikulum mata pelajaran SMK Negeri 3 Yogyakarta.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          leftIcon={<RefreshCw size={14} />}
        >
          Segarkan Data
        </Button>
      </div>

      {error && (
        <Card className="p-6 border-rose-500/30 text-center">
          <AlertTriangle className="mx-auto text-rose-400 mb-2" size={32} />
          <p className="text-sm text-rose-300">{error}</p>
        </Card>
      )}

      {/* SECTION 1: CLASSES */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <GraduationCap className="text-brand-400" size={20} /> Data Kelas & Rombel
            </h2>
            <p className="text-xs text-slate-400">Total {classes?.length || 0} kelas terdaftar</p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setClassForm({ name: "", major: "", grade: "", academic_year: "" });
              setClassActionError(null);
              setCreateClassModal(true);
            }}
            leftIcon={<Plus size={15} />}
          >
            Tambah Kelas
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !classes || classes.length === 0 ? (
          <Card className="p-8 text-center border-slate-800">
            <p className="text-sm text-slate-400">Belum ada kelas terdaftar.</p>
          </Card>
        ) : (
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800/80 bg-slate-950/40">
                    <th className="px-5 py-3.5">Nama Kelas</th>
                    <th className="px-5 py-3.5">Jurusan / Keahlian</th>
                    <th className="px-5 py-3.5">Tingkat</th>
                    <th className="px-5 py-3.5">Tahun Ajaran</th>
                    <th className="px-5 py-3.5">Jumlah Siswa</th>
                    <th className="px-5 py-3.5 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {classes.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-white whitespace-nowrap">
                        {c.name}
                      </td>
                      <td className="px-5 py-3.5 text-slate-300 whitespace-nowrap">
                        {c.major || "-"}
                      </td>
                      <td className="px-5 py-3.5 text-slate-300 whitespace-nowrap">
                        {c.grade ? `Kelas ${c.grade}` : "-"}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap font-mono text-xs">
                        {c.academic_year || "-"}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold font-mono">
                          {c.student_count} Siswa
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditClass(c)}
                            title="Edit Kelas"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteClassTarget(c);
                              setClassActionError(null);
                            }}
                            title="Hapus Kelas"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* SECTION 2: SUBJECTS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="text-brand-400" size={20} /> Data Mata Pelajaran
            </h2>
            <p className="text-xs text-slate-400">Total {subjects?.length || 0} mata pelajaran</p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setSubjectForm({ name: "", code: "" });
              setSubjectActionError(null);
              setCreateSubjectModal(true);
            }}
            leftIcon={<Plus size={15} />}
          >
            Tambah Mapel
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !subjects || subjects.length === 0 ? (
          <Card className="p-8 text-center border-slate-800">
            <p className="text-sm text-slate-400">Belum ada mata pelajaran terdaftar.</p>
          </Card>
        ) : (
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800/80 bg-slate-950/40">
                    <th className="px-5 py-3.5">Nama Mata Pelajaran</th>
                    <th className="px-5 py-3.5">Kode Mapel</th>
                    <th className="px-5 py-3.5 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {subjects.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-white whitespace-nowrap">
                        {s.name}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 font-mono text-xs whitespace-nowrap">
                        {s.code || "-"}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditSubject(s)}
                            title="Edit Mapel"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteSubjectTarget(s);
                              setSubjectActionError(null);
                            }}
                            title="Hapus Mapel"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* MODAL: TAMBAH KELAS */}
      <Modal
        isOpen={createClassModal}
        onClose={() => setCreateClassModal(false)}
        title="Tambah Kelas Baru"
        description="Masukkan identitas rombongan belajar baru."
        size="md"
      >
        <form onSubmit={handleCreateClass} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Nama Kelas (Wajib)
            </label>
            <input
              required
              className="input-field"
              placeholder="Contoh: XII TKJ 1"
              value={classForm.name}
              onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Jurusan / Kompetensi Keahlian
            </label>
            <input
              className="input-field"
              placeholder="Contoh: Teknik Komputer dan Jaringan"
              value={classForm.major}
              onChange={(e) => setClassForm({ ...classForm, major: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Tingkat
              </label>
              <input
                className="input-field"
                placeholder="Contoh: 12"
                value={classForm.grade}
                onChange={(e) => setClassForm({ ...classForm, grade: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Tahun Ajaran
              </label>
              <input
                className="input-field"
                placeholder="Contoh: 2024/2025"
                value={classForm.academic_year}
                onChange={(e) => setClassForm({ ...classForm, academic_year: e.target.value })}
              />
            </div>
          </div>

          {classActionError && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0 text-rose-400" />
              <span>{classActionError}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setCreateClassModal(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              isLoading={classSubmitting}
            >
              Simpan Kelas
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: EDIT KELAS */}
      <Modal
        isOpen={Boolean(editClassTarget)}
        onClose={() => setEditClassTarget(null)}
        title="Edit Data Kelas"
        description={`Mengubah informasi kelas ${editClassTarget?.name || ""}`}
        size="md"
      >
        <form onSubmit={handleUpdateClass} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Nama Kelas
            </label>
            <input
              required
              className="input-field"
              value={classForm.name}
              onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Jurusan / Kompetensi Keahlian
            </label>
            <input
              className="input-field"
              value={classForm.major}
              onChange={(e) => setClassForm({ ...classForm, major: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Tingkat
              </label>
              <input
                className="input-field"
                value={classForm.grade}
                onChange={(e) => setClassForm({ ...classForm, grade: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Tahun Ajaran
              </label>
              <input
                className="input-field"
                value={classForm.academic_year}
                onChange={(e) => setClassForm({ ...classForm, academic_year: e.target.value })}
              />
            </div>
          </div>

          {classActionError && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0 text-rose-400" />
              <span>{classActionError}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setEditClassTarget(null)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              isLoading={classSubmitting}
            >
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: HAPUS KELAS */}
      <Modal
        isOpen={Boolean(deleteClassTarget)}
        onClose={() => setDeleteClassTarget(null)}
        title="Hapus Kelas"
        description={`Anda yakin ingin menghapus kelas '${deleteClassTarget?.name || ""}'?`}
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-300">
            <p className="font-bold text-rose-200 text-sm mb-1">Perhatian:</p>
            Kelas tidak dapat dihapus jika masih ada siswa yang terdaftar atau memiliki riwayat sesi presensi untuk menjaga integritas data.
          </div>

          {classActionError && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0 text-rose-400" />
              <span>{classActionError}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setDeleteClassTarget(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              fullWidth
              onClick={handleDeleteClassConfirm}
              isLoading={classSubmitting}
            >
              Ya, Hapus Kelas
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: TAMBAH MAPEL */}
      <Modal
        isOpen={createSubjectModal}
        onClose={() => setCreateSubjectModal(false)}
        title="Tambah Mata Pelajaran"
        description="Daftarkan mata pelajaran baru ke kurikulum sekolah."
        size="md"
      >
        <form onSubmit={handleCreateSubject} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Nama Mata Pelajaran (Wajib)
            </label>
            <input
              required
              className="input-field"
              placeholder="Contoh: Administrasi Infrastruktur Jaringan"
              value={subjectForm.name}
              onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Kode Mata Pelajaran
            </label>
            <input
              className="input-field"
              placeholder="Contoh: AIJ-01"
              value={subjectForm.code}
              onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
            />
          </div>

          {subjectActionError && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0 text-rose-400" />
              <span>{subjectActionError}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setCreateSubjectModal(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              isLoading={subjectSubmitting}
            >
              Simpan Mapel
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: EDIT MAPEL */}
      <Modal
        isOpen={Boolean(editSubjectTarget)}
        onClose={() => setEditSubjectTarget(null)}
        title="Edit Mata Pelajaran"
        description={`Mengubah data mapel ${editSubjectTarget?.name || ""}`}
        size="md"
      >
        <form onSubmit={handleUpdateSubject} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Nama Mata Pelajaran
            </label>
            <input
              required
              className="input-field"
              value={subjectForm.name}
              onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Kode Mata Pelajaran
            </label>
            <input
              className="input-field"
              value={subjectForm.code}
              onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
            />
          </div>

          {subjectActionError && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0 text-rose-400" />
              <span>{subjectActionError}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setEditSubjectTarget(null)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              isLoading={subjectSubmitting}
            >
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: HAPUS MAPEL */}
      <Modal
        isOpen={Boolean(deleteSubjectTarget)}
        onClose={() => setDeleteSubjectTarget(null)}
        title="Hapus Mata Pelajaran"
        description={`Anda yakin ingin menghapus '${deleteSubjectTarget?.name || ""}'?`}
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-300">
            <p className="font-bold text-rose-200 text-sm mb-1">Perhatian:</p>
            Mata pelajaran tidak dapat dihapus jika telah memiliki riwayat sesi presensi di sekolah.
          </div>

          {subjectActionError && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0 text-rose-400" />
              <span>{subjectActionError}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setDeleteSubjectTarget(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              fullWidth
              onClick={handleDeleteSubjectConfirm}
              isLoading={subjectSubmitting}
            >
              Ya, Hapus Mapel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
