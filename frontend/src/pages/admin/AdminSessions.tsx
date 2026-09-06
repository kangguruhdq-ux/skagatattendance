import React, { useEffect, useState, useMemo } from "react";
import {
  CalendarClock,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  Camera,
  MapPin,
  Fingerprint,
  AlertTriangle,
  CheckCircle2,
  QrCode,
  Sparkles,
} from "lucide-react";
import {
  listAllSessions,
  createSession,
  getSessionDetail,
  updateSession,
  deleteSession,
  listClasses,
  listSubjects,
  listTeachers,
  listSchedules,
} from "../../api/adminService";
import type {
  AdminSessionItem,
  ClassRow,
  SubjectRow,
  TeacherRow,
  ScheduleRow,
  SessionDetailResponse,
  AdminSessionCreatePayload,
  AdminSessionUpdatePayload,
} from "../../types";
import { ApiRequestError } from "../../api/client";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import StatusBadge from "../../components/StatusBadge";
import LoadingState, { EmptyState, ErrorState } from "../../components/LoadingState";

export default function AdminSessions() {
  const [sessions, setSessions] = useState<AdminSessionItem[] | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState<AdminSessionItem | null>(null);
  const [deleteModal, setDeleteModal] = useState<AdminSessionItem | null>(null);
  const [detailModal, setDetailModal] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<SessionDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailPhotoPreview, setDetailPhotoPreview] = useState<string | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState<AdminSessionCreatePayload>({
    subject_id: 0,
    class_id: 0,
    teacher_id: 0,
    date: new Date().toISOString().slice(0, 10),
    start_time: "07:00",
    end_time: "08:30",
    room: "",
    late_threshold_minutes: 15,
    require_gps: false,
    require_photo: false,
    require_biometric: false,
    schedule_id: undefined,
  });

  const [editForm, setEditForm] = useState<AdminSessionUpdatePayload>({
    room: "",
    start_time: "",
    end_time: "",
    late_threshold_minutes: 15,
    require_gps: false,
    require_photo: false,
    require_biometric: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [sessionsRes, classesRes, subjectsRes, teachersRes, schedulesRes] = await Promise.all([
        listAllSessions({
          date: dateFilter || undefined,
          class_id: classFilter ? Number(classFilter) : undefined,
          teacher_id: teacherFilter ? Number(teacherFilter) : undefined,
          subject_id: subjectFilter ? Number(subjectFilter) : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
        }),
        listClasses(),
        listSubjects(),
        listTeachers(),
        listSchedules(),
      ]);
      setSessions(sessionsRes.sessions || []);
      setClasses(classesRes.classes || []);
      setSubjects(subjectsRes.subjects || []);
      setTeachers(teachersRes.teachers || []);
      setSchedules(schedulesRes.schedules || []);
    } catch (err: any) {
      setError(err instanceof ApiRequestError ? err.friendlyMessage : "Gagal memuat daftar sesi presensi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [dateFilter, classFilter, teacherFilter, subjectFilter, statusFilter]);

  async function openDetailModal(sessionId: number) {
    setDetailModal(sessionId);
    setDetailData(null);
    setDetailLoading(true);
    try {
      const res = await getSessionDetail(sessionId);
      setDetailData(res);
    } catch (err: any) {
      setError(err instanceof ApiRequestError ? err.friendlyMessage : "Gagal memuat detail sesi.");
    } finally {
      setDetailLoading(false);
    }
  }

  function handleScheduleSelect(scheduleIdStr: string) {
    if (!scheduleIdStr) {
      setCreateForm((prev) => ({ ...prev, schedule_id: undefined }));
      return;
    }
    const sched = schedules.find((s) => s.id === Number(scheduleIdStr));
    if (sched) {
      setCreateForm((prev) => ({
        ...prev,
        schedule_id: sched.id,
        class_id: sched.class_id,
        subject_id: sched.subject_id,
        teacher_id: sched.teacher_id,
        start_time: sched.start_time,
        end_time: sched.end_time,
        room: sched.room || "",
      }));
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.class_id || !createForm.subject_id || !createForm.teacher_id) {
      setActionError("Pilih kelas, mata pelajaran, dan guru pengampu.");
      return;
    }
    if (createForm.start_time >= createForm.end_time) {
      setActionError("Jam selesai harus lebih akhir dari jam mulai.");
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      await createSession(createForm);
      setCreateModal(false);
      setSuccessToast("Sesi presensi baru berhasil dibuat.");
      setTimeout(() => setSuccessToast(null), 3000);
      loadData();
    } catch (err: any) {
      setActionError(err instanceof ApiRequestError ? err.friendlyMessage : "Gagal membuat sesi.");
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(session: AdminSessionItem) {
    setEditModal(session);
    setActionError(null);
    setEditForm({
      room: session.room || "",
      start_time: session.start_time,
      end_time: session.end_time,
      late_threshold_minutes: session.late_threshold_minutes,
      require_gps: session.require_gps,
      require_photo: session.require_photo,
      require_biometric: session.require_biometric,
    });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editModal) return;
    if (editForm.start_time && editForm.end_time && editForm.start_time >= editForm.end_time) {
      setActionError("Jam selesai harus lebih akhir dari jam mulai.");
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      await updateSession(editModal.id, editForm);
      setEditModal(null);
      setSuccessToast("Sesi presensi berhasil diperbarui.");
      setTimeout(() => setSuccessToast(null), 3000);
      loadData();
    } catch (err: any) {
      setActionError(err instanceof ApiRequestError ? err.friendlyMessage : "Gagal memperbarui sesi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteModal) return;
    setSubmitting(true);
    try {
      await deleteSession(deleteModal.id);
      setDeleteModal(null);
      setSuccessToast("Sesi presensi berhasil dihapus (riwayat kehadiran tetap aman).");
      setTimeout(() => setSuccessToast(null), 3000);
      loadData();
    } catch (err: any) {
      setError(err instanceof ApiRequestError ? err.friendlyMessage : "Gagal menghapus sesi.");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter((s) => {
      const matchStatus = statusFilter === "all" || s.status === statusFilter;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !searchQuery ||
        (s.subject_name && s.subject_name.toLowerCase().includes(q)) ||
        (s.class_name && s.class_name.toLowerCase().includes(q)) ||
        (s.teacher_name && s.teacher_name.toLowerCase().includes(q)) ||
        (s.room && s.room.toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });
  }, [sessions, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    if (!sessions) return { total: 0, active: 0, expired: 0, notStarted: 0, totalPendingPhotos: 0 };
    return {
      total: sessions.length,
      active: sessions.filter((s) => s.status === "active").length,
      expired: sessions.filter((s) => s.status === "expired").length,
      notStarted: sessions.filter((s) => s.status === "not_started").length,
      totalPendingPhotos: sessions.reduce((acc, s) => acc + (s.pending_photos || 0), 0),
    };
  }, [sessions]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <CalendarClock className="text-brand-400" size={26} /> Monitoring Seluruh Sesi Presensi
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Pantau status kehadiran langsung, buat sesi instan/terjadwal, koreksi data, dan tinjau bukti foto presensi.
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
              setActionError(null);
              setCreateModal(true);
            }}
            leftIcon={<Plus size={16} />}
          >
            Buat Sesi Presensi
          </Button>
        </div>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm">
          <p className="text-xs text-slate-400">Total Sesi</p>
          <p className="text-2xl font-black text-white mt-1">{stats.total}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-emerald-300">Sedang Berlangsung</p>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-1">{stats.active}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm">
          <p className="text-xs text-slate-400">Selesai (Expired)</p>
          <p className="text-2xl font-black text-slate-300 mt-1">{stats.expired}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm">
          <p className="text-xs text-slate-400">Belum Mulai</p>
          <p className="text-2xl font-black text-slate-400 mt-1">{stats.notStarted}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-sm">
          <p className="text-xs text-amber-300">Foto Menunggu Review</p>
          <p className="text-2xl font-black text-amber-400 mt-1">{stats.totalPendingPhotos}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Cari mapel, kelas, guru, ruangan..."
              className="input-field pl-9 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Date Picker */}
          <div>
            <input
              type="date"
              className="input-field text-xs text-slate-300"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>

          {/* Class Dropdown */}
          <div>
            <select
              className="input-field text-xs"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Teacher Dropdown */}
          <div>
            <select
              className="input-field text-xs"
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
            >
              <option value="">Semua Guru</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              className="input-field text-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Semua Status</option>
              <option value="active">🟢 Sedang Berlangsung</option>
              <option value="not_started">⚪ Belum Mulai</option>
              <option value="expired">🔴 Selesai / Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && <ErrorState message={error} />}

      {/* Table / List */}
      {loading || sessions === null ? (
        <LoadingState />
      ) : filteredSessions.length === 0 ? (
        <EmptyState label="Belum ada sesi presensi yang sesuai dengan kriteria filter." />
      ) : (
        <Card className="border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="px-4 py-3.5">Tanggal & Waktu</th>
                  <th className="px-4 py-3.5">Mata Pelajaran & Ruang</th>
                  <th className="px-4 py-3.5">Kelas</th>
                  <th className="px-4 py-3.5">Guru Pengajar</th>
                  <th className="px-4 py-3.5">Kehadiran</th>
                  <th className="px-4 py-3.5">Metode</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredSessions.map((s) => {
                  const rate = s.total_students > 0 ? Math.min(100, Math.round((s.present_count / s.total_students) * 100)) : 0;
                  return (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="text-white font-medium">{s.date}</p>
                        <p className="text-xs font-mono text-slate-400">
                          {s.start_time} - {s.end_time} WIB
                        </p>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="font-semibold text-white">{s.subject_name || "-"}</p>
                        {s.room && (
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={11} className="text-emerald-400" /> {s.room}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-300">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-medium">
                          {s.class_name || "-"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-300 text-xs">
                        {s.teacher_name || "-"}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white font-mono">
                            {s.present_count} / {s.total_students}
                          </span>
                          <span className="text-[11px] text-slate-400">({rate}%)</span>
                        </div>
                        {s.pending_photos > 0 && (
                          <span className="inline-block px-2 py-0.5 mt-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-semibold">
                            🟡 {s.pending_photos} review
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-slate-400">
                          {s.require_gps && (
                            <span title="Wajib GPS" className="p-1 rounded bg-slate-800 text-amber-400">
                              <MapPin size={12} />
                            </span>
                          )}
                          {s.require_photo && (
                            <span title="Wajib Foto" className="p-1 rounded bg-slate-800 text-emerald-400">
                              <Camera size={12} />
                            </span>
                          )}
                          {s.require_biometric && (
                            <span title="Wajib Biometrik" className="p-1 rounded bg-slate-800 text-brand-400">
                              <Fingerprint size={12} />
                            </span>
                          )}
                          {!s.require_gps && !s.require_photo && !s.require_biometric && (
                            <span className="text-xs text-slate-600">Scan QR</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StatusBadge status={s.status} size="sm" />
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openDetailModal(s.id)}
                            title="Detail & Monitor Siswa"
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(s)}
                            title="Edit Pengaturan Sesi"
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-300 transition-colors"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteModal(s)}
                            title="Hapus Sesi"
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE NEW SESSION */}
      {/* ========================================================================= */}
      <Modal
        isOpen={createModal}
        onClose={() => {
          if (!submitting) setCreateModal(false);
        }}
        title="Buat Sesi Presensi Baru"
        description="Membuka sesi presensi untuk kelas dan mata pelajaran tertentu"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {actionError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-400" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Schedule Template Selector */}
          <div className="p-3 rounded-2xl bg-brand-500/10 border border-brand-500/20 space-y-1.5">
            <label className="text-xs font-bold text-brand-300 flex items-center gap-1.5">
              <Sparkles size={14} /> Pilih dari Jadwal Pelajaran (Otomatis Mengisi Data):
            </label>
            <select
              className="input-field text-xs bg-slate-900 border-brand-500/30"
              value={createForm.schedule_id || ""}
              onChange={(e) => handleScheduleSelect(e.target.value)}
            >
              <option value="">-- Buat Sesi Manual (Tanpa Template Jadwal) --</option>
              {schedules.map((sc) => {
                const dayLabels = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
                const dayStr = sc.day_name || dayLabels[sc.day_of_week] || `Hari ${sc.day_of_week}`;
                return (
                  <option key={sc.id} value={sc.id}>
                    {dayStr}: {sc.subject_name} ({sc.class_name}) - {sc.teacher_name} [{sc.start_time}-{sc.end_time}]
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Kelas"
              value={createForm.class_id || ""}
              onChange={(e) => setCreateForm({ ...createForm, class_id: Number(e.target.value) })}
              required
            >
              <option value="">Pilih Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            <Select
              label="Mata Pelajaran"
              value={createForm.subject_id || ""}
              onChange={(e) => setCreateForm({ ...createForm, subject_id: Number(e.target.value) })}
              required
            >
              <option value="">Pilih Mata Pelajaran</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>

            <Select
              label="Guru Pengampu"
              value={createForm.teacher_id || ""}
              onChange={(e) => setCreateForm({ ...createForm, teacher_id: Number(e.target.value) })}
              required
            >
              <option value="">Pilih Guru</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              type="date"
              label="Tanggal Sesi"
              value={createForm.date}
              onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
              required
            />
            <Input
              type="time"
              label="Jam Mulai"
              value={createForm.start_time}
              onChange={(e) => setCreateForm({ ...createForm, start_time: e.target.value })}
              required
            />
            <Input
              type="time"
              label="Jam Selesai"
              value={createForm.end_time}
              onChange={(e) => setCreateForm({ ...createForm, end_time: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Ruangan / Lab (Opsional)"
              placeholder="Contoh: Lab Komputer 2 / Ruang Teori 1"
              value={createForm.room || ""}
              onChange={(e) => setCreateForm({ ...createForm, room: e.target.value })}
            />
            <Input
              type="number"
              label="Batas Toleransi Keterlambatan (Menit)"
              value={createForm.late_threshold_minutes || 15}
              onChange={(e) =>
                setCreateForm({ ...createForm, late_threshold_minutes: Number(e.target.value) })
              }
              min={0}
              max={180}
            />
          </div>

          {/* Security Checkboxes */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
            <p className="text-xs font-semibold text-white">Metode Verifikasi Presensi Siswa:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createForm.require_photo}
                  onChange={(e) => setCreateForm({ ...createForm, require_photo: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-brand-500 focus:ring-0"
                />
                <Camera size={14} className="text-emerald-400" />
                <span>Wajib Foto Selfie</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createForm.require_gps}
                  onChange={(e) => setCreateForm({ ...createForm, require_gps: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-brand-500 focus:ring-0"
                />
                <MapPin size={14} className="text-amber-400" />
                <span>Wajib Radius GPS</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createForm.require_biometric}
                  onChange={(e) => setCreateForm({ ...createForm, require_biometric: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-brand-500 focus:ring-0"
                />
                <Fingerprint size={14} className="text-brand-400" />
                <span>Wajib Biometrik</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              disabled={submitting}
              onClick={() => setCreateModal(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              isLoading={submitting}
              loadingText="Membuat Sesi..."
            >
              Buat Sesi Sekarang
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: EDIT SESSION */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(editModal)}
        onClose={() => {
          if (!submitting) setEditModal(null);
        }}
        title="Edit Sesi Presensi"
        description={`Mengubah pengaturan sesi: ${editModal?.subject_name || ""} (${editModal?.class_name || ""})`}
        size="md"
      >
        {editModal && (
          <form onSubmit={handleEdit} className="space-y-4">
            {actionError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                type="time"
                label="Jam Mulai"
                value={editForm.start_time}
                onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                required
              />
              <Input
                type="time"
                label="Jam Selesai"
                value={editForm.end_time}
                onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Ruangan / Lab"
                placeholder="Contoh: Lab TKJ 1"
                value={editForm.room || ""}
                onChange={(e) => setEditForm({ ...editForm, room: e.target.value })}
              />
              <Input
                type="number"
                label="Toleransi Terlambat (Menit)"
                value={editForm.late_threshold_minutes || 15}
                onChange={(e) =>
                  setEditForm({ ...editForm, late_threshold_minutes: Number(e.target.value) })
                }
                min={0}
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.require_photo}
                  onChange={(e) => setEditForm({ ...editForm, require_photo: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-brand-500 focus:ring-0"
                />
                <Camera size={14} className="text-emerald-400" />
                <span>Wajib Foto Selfie</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.require_gps}
                  onChange={(e) => setEditForm({ ...editForm, require_gps: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-brand-500 focus:ring-0"
                />
                <MapPin size={14} className="text-amber-400" />
                <span>Wajib Radius GPS</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.require_biometric}
                  onChange={(e) => setEditForm({ ...editForm, require_biometric: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-brand-500 focus:ring-0"
                />
                <Fingerprint size={14} className="text-brand-400" />
                <span>Wajib Biometrik</span>
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                fullWidth
                disabled={submitting}
                onClick={() => setEditModal(null)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                isLoading={submitting}
                loadingText="Menyimpan..."
              >
                Simpan Perubahan
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: DELETE SESSION CONFIRMATION */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(deleteModal)}
        onClose={() => {
          if (!submitting) setDeleteModal(null);
        }}
        title="Hapus Sesi Presensi"
        description="Konfirmasi penghapusan sesi"
        size="sm"
      >
        {deleteModal && (
          <div className="space-y-4">
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-300 flex items-start gap-2.5">
              <AlertTriangle className="text-rose-400 shrink-0 mt-0.5" size={16} />
              <div>
                <span className="font-semibold text-rose-200 block mb-1">Perhatian:</span>
                Sesi <strong className="text-white">{deleteModal.subject_name}</strong> pada tanggal{" "}
                <strong className="text-white">{deleteModal.date}</strong> untuk kelas{" "}
                <strong className="text-white">{deleteModal.class_name}</strong> akan ditutup dan dihapus dari monitoring aktif.
                <p className="mt-1 text-slate-400">
                  Seluruh catatan kehadiran siswa yang telah tercatat akan tetap aman tersimpan untuk kebutuhan arsip dan laporan.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                fullWidth
                disabled={submitting}
                onClick={() => setDeleteModal(null)}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="danger"
                size="md"
                fullWidth
                isLoading={submitting}
                onClick={handleDelete}
                leftIcon={<Trash2 size={15} />}
              >
                Hapus Sesi
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: SESSION DETAIL & STUDENT ATTENDANCE MONITOR */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(detailModal)}
        onClose={() => {
          setDetailModal(null);
          setDetailData(null);
          setDetailPhotoPreview(null);
        }}
        title="Detail & Monitor Kehadiran Sesi"
        description="Pantau daftar seluruh siswa, status presensi, dan bukti foto secara realtime"
        size="xl"
      >
        {detailLoading || !detailData ? (
          <LoadingState />
        ) : (
          <div className="space-y-5">
            {/* Session Info Header */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Mata Pelajaran:</span>
                <span className="font-bold text-white text-sm">{detailData.session.subject_name}</span>
                {detailData.session.room && (
                  <span className="text-slate-400 block mt-0.5">Ruang: {detailData.session.room}</span>
                )}
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Kelas & Guru:</span>
                <span className="font-bold text-white block">{detailData.session.class_name}</span>
                <span className="text-slate-400 block">{detailData.session.teacher_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Waktu Sesi:</span>
                <span className="font-bold text-white block">{detailData.session.date}</span>
                <span className="text-brand-300 font-mono">
                  {detailData.session.start_time} - {detailData.session.end_time} WIB
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Status Sesi:</span>
                <div className="mt-1">
                  <StatusBadge status={detailData.session.status} size="sm" />
                </div>
              </div>
            </div>

            {/* Attendance Breakdown Stats */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Terdaftar</span>
                <span className="text-lg font-black text-white">{detailData.stats.total_students}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <span className="text-[10px] text-emerald-300 block uppercase font-semibold">Hadir</span>
                <span className="text-lg font-black text-emerald-400">{detailData.stats.present_count}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                <span className="text-[10px] text-amber-300 block uppercase font-semibold">Terlambat</span>
                <span className="text-lg font-black text-amber-400">{detailData.stats.late_count}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                <span className="text-[10px] text-blue-300 block uppercase font-semibold">Izin</span>
                <span className="text-lg font-black text-blue-400">{detailData.stats.excused_count}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                <span className="text-[10px] text-purple-300 block uppercase font-semibold">Sakit</span>
                <span className="text-lg font-black text-purple-400">{detailData.stats.sick_count}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                <span className="text-[10px] text-rose-300 block uppercase font-semibold">Rate Hadir</span>
                <span className="text-lg font-black text-white">{detailData.stats.attendance_rate}%</span>
              </div>
            </div>

            {/* Students Attendance List */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Daftar Kehadiran Siswa ({detailData.students.length} Siswa)
              </h3>
              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 sticky top-0 border-b border-slate-800 text-[11px] text-slate-400">
                    <tr>
                      <th className="px-3 py-2">NIS & Siswa</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Waktu</th>
                      <th className="px-3 py-2">Metode</th>
                      <th className="px-3 py-2">Bukti Foto</th>
                      <th className="px-3 py-2">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {detailData.students.map((st) => (
                      <tr key={st.student_id} className="hover:bg-slate-800/30">
                        <td className="px-3 py-2">
                          <span className="font-bold text-white block">{st.full_name}</span>
                          <span className="font-mono text-slate-400 text-[11px]">{st.student_code}</span>
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={st.status} size="sm" />
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-300 text-[11px]">
                          {st.check_in_time !== "-" ? `${st.check_in_time} WIB` : "-"}
                        </td>
                        <td className="px-3 py-2">
                          {st.method === "photo" ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
                              <Camera size={12} /> Selfie
                            </span>
                          ) : st.method === "qr" ? (
                            <span className="inline-flex items-center gap-1 text-brand-400 text-[11px]">
                              <QrCode size={12} /> QR
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {st.photo_path ? (
                            <button
                              type="button"
                              onClick={() => {
                                const base = (import.meta.env.VITE_API_URL || "http://localhost:8000") as string;
                                const cleanedPath = (st.photo_path || "").replace(/^uploads\//, "");
                                setDetailPhotoPreview(`${base}/api/attendance/photo/${cleanedPath}`);
                              }}
                              className="text-brand-400 hover:text-brand-300 underline font-medium text-[11px]"
                            >
                              Lihat Foto
                            </button>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-400 text-[11px]">
                          {st.manual_override ? (
                            <span className="text-amber-300">
                              (Koreksi Manual: {st.override_reason || "Admin"})
                            </span>
                          ) : st.photo_rejection_reason ? (
                            <span className="text-rose-300">Foto Ditolak: {st.photo_rejection_reason}</span>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Photo Lightbox Preview */}
            {detailPhotoPreview && (
              <div
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => setDetailPhotoPreview(null)}
              >
                <div
                  className="bg-slate-900 border border-slate-700 rounded-2xl p-4 max-w-sm w-full space-y-3 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">Foto Bukti Presensi Siswa</h4>
                    <button
                      type="button"
                      onClick={() => setDetailPhotoPreview(null)}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      Tutup
                    </button>
                  </div>
                  <div className="aspect-square bg-black rounded-xl overflow-hidden">
                    <img
                      src={detailPhotoPreview}
                      alt="Bukti Presensi"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setDetailModal(null)}
              >
                Tutup Dialog
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
