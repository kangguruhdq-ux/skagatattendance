import { useEffect, useState, useMemo } from "react";
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Search,
  AlertTriangle,
  X,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  listClasses,
} from "../../api/adminService";
import type { UserRow, ClassRow, Role } from "../../types";
import { ApiRequestError } from "../../api/client";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Skeleton } from "../../components/ui/Skeleton";

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: "",
    password: "",
    role: "student" as Role,
    full_name: "",
    student_code: "",
    class_id: "" as string,
    teacher_code: "",
    subject_specialty: "",
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    role: "student" as Role,
    is_active: true,
    password: "",
    student_code: "",
    class_id: "" as string,
    teacher_code: "",
    subject_specialty: "",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Deactivate / Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, classesRes] = await Promise.all([
        listUsers(),
        listClasses(),
      ]);
      setUsers(usersRes.users);
      setClasses(classesRes.classes);
    } catch (err: any) {
      setError(err instanceof ApiRequestError ? err.friendlyMessage : "Gagal memuat data pengguna.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => {
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !searchQuery ||
        u.username.toLowerCase().includes(q) ||
        u.full_name.toLowerCase().includes(q) ||
        (u.code && u.code.toLowerCase().includes(q)) ||
        (u.class_name && u.class_name.toLowerCase().includes(q));
      return matchRole && matchSearch;
    });
  }, [users, roleFilter, searchQuery]);

  // Handle Create User
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      await createUser({
        username: createForm.username.trim(),
        password: createForm.password,
        role: createForm.role,
        full_name: createForm.full_name.trim(),
        student_code: createForm.role === "student" ? createForm.student_code.trim() : undefined,
        class_id:
          createForm.role === "student" && createForm.class_id
            ? Number(createForm.class_id)
            : undefined,
        teacher_code: createForm.role === "teacher" ? createForm.teacher_code.trim() : undefined,
        subject_specialty:
          createForm.role === "teacher" ? createForm.subject_specialty.trim() : undefined,
      });

      setCreateModalOpen(false);
      setCreateForm({
        username: "",
        password: "",
        role: "student",
        full_name: "",
        student_code: "",
        class_id: "",
        teacher_code: "",
        subject_specialty: "",
      });
      loadData();
    } catch (err: any) {
      setCreateError(err instanceof ApiRequestError ? err.friendlyMessage : "Gagal menambahkan pengguna.");
    } finally {
      setCreateSubmitting(false);
    }
  }

  // Open Edit Modal
  function openEdit(user: UserRow) {
    setEditTarget(user);
    setEditForm({
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      password: "",
      student_code: user.code || "",
      class_id: user.class_id ? String(user.class_id) : "",
      teacher_code: user.code || "",
      subject_specialty: user.subject_specialty || "",
    });
    setEditError(null);
    setEditModalOpen(true);
  }

  // Handle Update User
  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;

    setEditSubmitting(true);
    setEditError(null);
    try {
      await updateUser(editTarget.id, {
        full_name: editForm.full_name.trim(),
        role: editForm.role,
        is_active: editForm.is_active,
        password: editForm.password.trim() ? editForm.password.trim() : undefined,
        student_code: editForm.role === "student" ? editForm.student_code.trim() : undefined,
        class_id:
          editForm.role === "student" && editForm.class_id
            ? Number(editForm.class_id)
            : undefined,
        teacher_code: editForm.role === "teacher" ? editForm.teacher_code.trim() : undefined,
        subject_specialty:
          editForm.role === "teacher" ? editForm.subject_specialty.trim() : undefined,
      });

      setEditModalOpen(false);
      setEditTarget(null);
      loadData();
    } catch (err: any) {
      setEditError(err instanceof ApiRequestError ? err.friendlyMessage : "Gagal memperbarui pengguna.");
    } finally {
      setEditSubmitting(false);
    }
  }

  // Handle Deactivate / Delete User
  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      await deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      setDeleteError(err instanceof ApiRequestError ? err.friendlyMessage : "Gagal menonaktifkan pengguna.");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  async function handleToggleActive(user: UserRow, active: boolean) {
    try {
      await updateUser(user.id, { is_active: active });
      loadData();
    } catch (err: any) {
      setError(err instanceof ApiRequestError ? err.friendlyMessage : "Gagal mengubah status aktif pengguna.");
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Users className="text-brand-400" size={26} /> Kelola Pengguna Sistem
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manajemen akun administrator, guru pengajar, dan siswa dengan hak akses terintegrasi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            leftIcon={<RefreshCw size={14} />}
          >
            Segarkan
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setCreateError(null);
              setCreateModalOpen(true);
            }}
            leftIcon={<UserPlus size={16} />}
          >
            Tambah Pengguna
          </Button>
        </div>
      </div>

      {/* Role Counts */}
      {users && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm">
            <p className="text-xs text-slate-400">Total Pengguna</p>
            <p className="text-2xl font-black text-white mt-1">{users.length}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-brand-500/10 border border-brand-500/20 shadow-sm">
            <p className="text-xs text-brand-300">Siswa (Student)</p>
            <p className="text-2xl font-black text-brand-400 mt-1">
              {users.filter((u) => u.role === "student").length}
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-sm">
            <p className="text-xs text-emerald-300">Guru (Teacher)</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              {users.filter((u) => u.role === "teacher").length}
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 shadow-sm">
            <p className="text-xs text-purple-300">Admin (Staff)</p>
            <p className="text-2xl font-black text-purple-400 mt-1">
              {users.filter((u) => u.role === "admin").length}
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Role tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 border border-slate-800 rounded-2xl w-fit">
          {[
            { key: "all", label: "Semua" },
            { key: "student", label: "Siswa" },
            { key: "teacher", label: "Guru" },
            { key: "admin", label: "Admin" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setRoleFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                roleFilter === tab.key
                  ? "bg-brand-600 text-white shadow-md shadow-brand-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Cari nama, NIS, NIP, username..."
            className="input-field pl-10 text-xs sm:text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : error ? (
        <Card className="p-8 text-center border-rose-500/30">
          <AlertTriangle className="mx-auto text-rose-400 mb-3" size={36} />
          <h3 className="font-bold text-white text-base">Gagal Memuat Data</h3>
          <p className="text-xs text-slate-400 mt-1">{error}</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={loadData}>
            Coba Lagi
          </Button>
        </Card>
      ) : filteredUsers.length === 0 ? (
        <Card className="p-12 text-center border-slate-800">
          <Users className="mx-auto text-slate-600 mb-3" size={40} />
          <h3 className="font-bold text-white text-base">Pengguna Tidak Ditemukan</h3>
          <p className="text-xs text-slate-400 mt-1">
            Tidak ada pengguna yang cocok dengan kriteria pencarian atau filter yang dipilih.
          </p>
        </Card>
      ) : (
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800/80 bg-slate-950/40">
                  <th className="px-5 py-3.5">Nama & Identitas</th>
                  <th className="px-5 py-3.5">Username</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Kelas / Spesialisasi</th>
                  <th className="px-5 py-3.5">Status Akun</th>
                  <th className="px-5 py-3.5 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            u.role === "admin"
                              ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                              : u.role === "teacher"
                              ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-brand-600/20 text-brand-300 border border-brand-500/30"
                          }`}
                        >
                          {u.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase() || "U"}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{u.full_name}</p>
                          {u.code && (
                            <p className="text-[11px] text-slate-400 font-mono">{u.code}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-slate-300 font-mono text-xs whitespace-nowrap">
                      @{u.username}
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          u.role === "admin"
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                            : u.role === "teacher"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-brand-500/10 text-brand-400 border-brand-500/30"
                        }`}
                      >
                        {u.role === "admin"
                          ? "Admin"
                          : u.role === "teacher"
                          ? "Guru"
                          : "Siswa"}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-slate-300 whitespace-nowrap text-xs">
                      {u.role === "student" ? (
                        u.class_name ? (
                          <span className="font-medium text-white">{u.class_name}</span>
                        ) : (
                          <span className="text-slate-500 italic">Belum diatur</span>
                        )
                      ) : u.role === "teacher" ? (
                        u.subject_specialty ? (
                          <span className="text-slate-300">{u.subject_specialty}</span>
                        ) : (
                          <span className="text-slate-500 italic">Umum</span>
                        )
                      ) : (
                        <span className="text-slate-500">Akses Penuh</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          u.is_active
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : "bg-slate-700/40 text-slate-400 border-slate-700"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.is_active ? "bg-emerald-400" : "bg-slate-500"
                          }`}
                        />
                        {u.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          title="Edit Pengguna"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <Edit2 size={15} />
                        </button>
                        {u.is_active ? (
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteTarget(u);
                              setDeleteError(null);
                            }}
                            title="Nonaktifkan Akun"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(u, true)}
                            title="Aktifkan Kembali Akun"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH PENGGUNA BARU */}
      {/* ========================================================================= */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Tambah Pengguna Baru"
        description="Daftarkan akun admin, guru, atau siswa baru ke sistem SKAGATA."
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Role Akun
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["student", "teacher", "admin"] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setCreateForm({ ...createForm, role: r })}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                    createForm.role === r
                      ? "bg-brand-600 text-white border-brand-500 shadow-md"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {r === "student" ? "Siswa" : r === "teacher" ? "Guru" : "Admin"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Nama Lengkap
            </label>
            <input
              required
              className="input-field"
              placeholder="Contoh: Budi Santoso"
              value={createForm.full_name}
              onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Username Login
              </label>
              <input
                required
                className="input-field"
                placeholder="Contoh: budi_s"
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                required
                type="password"
                className="input-field"
                placeholder="Minimal 6 karakter"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              />
            </div>
          </div>

          {/* Role specific fields */}
          {createForm.role === "student" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  NIS / Kode Siswa
                </label>
                <input
                  className="input-field"
                  placeholder="Contoh: 202401"
                  value={createForm.student_code}
                  onChange={(e) => setCreateForm({ ...createForm, student_code: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Kelas
                </label>
                <select
                  className="input-field"
                  value={createForm.class_id}
                  onChange={(e) => setCreateForm({ ...createForm, class_id: e.target.value })}
                >
                  <option value="">-- Pilih Kelas --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {createForm.role === "teacher" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  NIP / Kode Guru
                </label>
                <input
                  className="input-field"
                  placeholder="Contoh: 198503..."
                  value={createForm.teacher_code}
                  onChange={(e) => setCreateForm({ ...createForm, teacher_code: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Spesialisasi Mapel
                </label>
                <input
                  className="input-field"
                  placeholder="Contoh: Matematika"
                  value={createForm.subject_specialty}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, subject_specialty: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          {createError && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0 text-rose-400" />
              <span>{createError}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setCreateModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              isLoading={createSubmitting}
            >
              Simpan Pengguna
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: EDIT PENGGUNA */}
      {/* ========================================================================= */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Data Pengguna"
        description={`Mengubah data akun @${editTarget?.username || ""}`}
        size="md"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Role Akun
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["student", "teacher", "admin"] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setEditForm({ ...editForm, role: r })}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                    editForm.role === r
                      ? "bg-brand-600 text-white border-brand-500 shadow-md"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {r === "student" ? "Siswa" : r === "teacher" ? "Guru" : "Admin"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Nama Lengkap
            </label>
            <input
              required
              className="input-field"
              value={editForm.full_name}
              onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Reset Password (Opsional)</span>
              <span className="text-[10px] text-slate-500 font-normal">Kosongkan jika tidak diubah</span>
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="Masukkan password baru..."
              value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
            />
          </div>

          {/* Role specific updates */}
          {editForm.role === "student" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  NIS / Kode Siswa
                </label>
                <input
                  className="input-field"
                  value={editForm.student_code}
                  onChange={(e) => setEditForm({ ...editForm, student_code: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Kelas
                </label>
                <select
                  className="input-field"
                  value={editForm.class_id}
                  onChange={(e) => setEditForm({ ...editForm, class_id: e.target.value })}
                >
                  <option value="">-- Pilih Kelas --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {editForm.role === "teacher" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  NIP / Kode Guru
                </label>
                <input
                  className="input-field"
                  value={editForm.teacher_code}
                  onChange={(e) => setEditForm({ ...editForm, teacher_code: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Spesialisasi Mapel
                </label>
                <input
                  className="input-field"
                  value={editForm.subject_specialty}
                  onChange={(e) =>
                    setEditForm({ ...editForm, subject_specialty: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          <div>
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-brand-600 focus:ring-brand-500"
                checked={editForm.is_active}
                onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
              />
              <span className="text-xs font-semibold text-slate-300">
                Akun Aktif (Dapat Login ke Sistem)
              </span>
            </label>
          </div>

          {editError && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0 text-rose-400" />
              <span>{editError}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setEditModalOpen(false)}
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

      {/* ========================================================================= */}
      {/* MODAL: KONFIRMASI NONAKTIFKAN / HAPUS PENGGUNA */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Konfirmasi Penonaktifan Pengguna"
        description={`Anda yakin ingin menonaktifkan akun @${deleteTarget?.username || ""}?`}
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-300">
            <p className="font-bold text-rose-200 text-sm mb-1">Peringatan Keamanan:</p>
            Akun yang dinonaktifkan tidak akan dapat login lagi ke aplikasi, namun data riwayat presensi dan nilai tetap tersimpan aman di database.
          </div>

          {deleteError && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0 text-rose-400" />
              <span>{deleteError}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setDeleteTarget(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              fullWidth
              onClick={handleDeleteConfirm}
              isLoading={deleteSubmitting}
            >
              Ya, Nonaktifkan Akun
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

