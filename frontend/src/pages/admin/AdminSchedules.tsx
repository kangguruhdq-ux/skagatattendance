import React, { useEffect, useState, useMemo } from "react";
import {
  CalendarClock,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Clock,
  MapPin,
  GraduationCap,
  BookOpen,
  User,
  Filter,
} from "lucide-react";
import {
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  listClasses,
  listSubjects,
  listTeachers,
} from "../../api/adminService";
import type { ScheduleRow, ClassRow, SubjectRow, TeacherRow } from "../../types";
import { ApiRequestError } from "../../api/client";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Skeleton } from "../../components/ui/Skeleton";

const DAYS = [
  { value: 0, label: "Senin" },
  { value: 1, label: "Selasa" },
  { value: 2, label: "Rabu" },
  { value: 3, label: "Kamis" },
  { value: 4, label: "Jumat" },
  { value: 5, label: "Sabtu" },
];

export default function AdminSchedules() {
  const [schedules, setSchedules] = useState<ScheduleRow[] | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedDay, setSelectedDay] = useState<number | "all">("all");
  const [selectedClassFilter, setSelectedClassFilter] = useState<number | "all">("all");
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<number | "all">("all");

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState<ScheduleRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScheduleRow | null>(null);

  // Form State
  const [formState, setFormState] = useState({
    class_id: 0,
    subject_id: 0,
    teacher_id: 0,
    day_of_week: 0,
    start_time: "07:00",
    end_time: "08:30",
    room: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [schedRes, classRes, subRes, teachRes] = await Promise.all([
        listSchedules(),
        listClasses(),
        listSubjects(),
        listTeachers(),
      ]);
      setSchedules(schedRes.schedules);
      setClasses(classRes.classes || []);
      setSubjects(subRes.subjects || []);
      setTeachers(teachRes.teachers || []);
    } catch (err: any) {
      setError(err instanceof ApiRequestError ? err.friendlyMessage : "Gagal memuat data jadwal pelajaran.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function openCreateModal() {
    setActionError(null);
    setFormState({
      class_id: classes[0]?.id || 0,
      subject_id: subjects[0]?.id || 0,
      teacher_id: teachers[0]?.id || 0,
      day_of_week: typeof selectedDay === "number" ? selectedDay : 0,
      start_time: "07:00",
      end_time: "08:30",
      room: "",
    });
    setCreateModal(true);
  }

  function openEditModal(item: ScheduleRow) {
    setActionError(null);
    setEditTarget(item);
    setFormState({
      class_id: item.class_id,
      subject_id: item.subject_id,
      teacher_id: item.teacher_id,
      day_of_week: item.day_of_week,
      start_time: item.start_time,
      end_time: item.end_time,
      room: item.room || "",
    });
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (formState.start_time >= formState.end_time) {
      setActionError("Waktu mulai harus lebih awal dari waktu selesai.");
      return;
    }
    if (!formState.class_id || !formState.subject_id || !formState.teacher_id) {
      setActionError("Kelas, mata pelajaran, dan guru pengampu wajib dipilih.");
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      await createSchedule({
        class_id: Number(formState.class_id),
        subject_id: Number(formState.subject_id),
        teacher_id: Number(formState.teacher_id),
        day_of_week: Number(formState.day_of_week),
        start_time: formState.start_time,
        end_time: formState.end_time,
        room: formState.room.trim() || undefined,
      });
      setCreateModal(false);
      loadData();
    } catch (err: any) {
      setActionError(err instanceof ApiRequestError ? err.friendlyMessage : "Gagal menambahkan jadwal pelajaran.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;

    if (formState.start_time >= formState.end_time) {
      setActionError("Waktu mulai harus lebih awal dari waktu selesai.");
      return;
    }
    if (!formState.class_id || !formState.subject_id || !formState.teacher_id) {
      setActionError("Kelas, mata pelajaran, dan guru pengampu wajib dipilih.");
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      await updateSchedule(editTarget.id, {
        class_id: Number(formState.class_id),
        subject_id: Number(formState.subject_id),
        teacher_id: Number(formState.teacher_id),
        day_of_week: Number(formState.day_of_week),
        start_time: formState.start_time,
        end_time: formState.end_time,
        room: formState.room.trim() || "",
      });
      setEditTarget(null);
      loadData();
    } catch (err: any) {
      setActionError(err instanceof ApiRequestError ? err.friendlyMessage : "Gagal memperbarui jadwal.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteSubmit() {
    if (!deleteTarget) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await deleteSchedule(deleteTarget.id);
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      setActionError(err instanceof ApiRequestError ? err.friendlyMessage : "Gagal menghapus jadwal.");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredSchedules = useMemo(() => {
    if (!schedules) return [];
    return schedules.filter((s) => {
      if (selectedDay !== "all" && s.day_of_week !== selectedDay) return false;
      if (selectedClassFilter !== "all" && s.class_id !== selectedClassFilter) return false;
      if (selectedTeacherFilter !== "all" && s.teacher_id !== selectedTeacherFilter) return false;
      return true;
    });
  }, [schedules, selectedDay, selectedClassFilter, selectedTeacherFilter]);

  // Group filtered schedules by day
  const schedulesByDay = useMemo(() => {
    const grouped: Record<number, ScheduleRow[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] };
    filteredSchedules.forEach((s) => {
      if (grouped[s.day_of_week]) {
        grouped[s.day_of_week].push(s);
      }
    });
    return grouped;
  }, [filteredSchedules]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <CalendarClock className="text-brand-400" size={26} />
            Jadwal Pelajaran
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Kelola jadwal pelajaran mingguan sekolah, alokasi guru pengampu, kelas, dan ruangan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadData}
            isLoading={loading}
            leftIcon={<RefreshCw size={14} />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={openCreateModal}
            leftIcon={<Plus size={16} />}
          >
            Tambah Jadwal
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <AlertTriangle className="text-rose-400 shrink-0" size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Filters Card */}
      <Card className="p-4 border-slate-800">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Day Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 flex-1">
            <button
              type="button"
              onClick={() => setSelectedDay("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedDay === "all"
                  ? "bg-brand-600 text-white"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
              }`}
            >
              Semua Hari
            </button>
            {DAYS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setSelectedDay(d.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedDay === d.value
                    ? "bg-brand-600 text-white"
                    : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Secondary Dropdown Filters */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500 cursor-pointer"
            >
              <option value="all">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={selectedTeacherFilter}
              onChange={(e) => setSelectedTeacherFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500 cursor-pointer"
            >
              <option value="all">Semua Guru</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      )}

      {/* Content */}
      {!loading && (
        <div className="space-y-6">
          {filteredSchedules.length === 0 ? (
            <Card className="p-12 text-center border-slate-800">
              <CalendarClock className="mx-auto text-slate-600 mb-3" size={42} />
              <p className="text-base font-semibold text-slate-300">Belum ada jadwal pelajaran</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Belum ada jadwal yang sesuai dengan filter. Klik tombol &ldquo;Tambah Jadwal&rdquo; untuk membuat jadwal baru.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={openCreateModal}
                leftIcon={<Plus size={15} />}
              >
                Tambah Jadwal Sekarang
              </Button>
            </Card>
          ) : selectedDay === "all" ? (
            // Grouped By Day View
            DAYS.map((day) => {
              const daySchedules = schedulesByDay[day.value] || [];
              if (daySchedules.length === 0) return null;

              return (
                <div key={day.value} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                    <h2 className="text-base font-bold text-white uppercase tracking-wider">
                      {day.label}
                    </h2>
                    <span className="text-xs font-mono text-slate-400">
                      ({daySchedules.length} mata pelajaran)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {daySchedules.map((item) => (
                      <Card
                        key={item.id}
                        className="p-4 border-slate-800 hover:border-slate-700 transition-all space-y-3 relative group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-md mb-1">
                              <GraduationCap size={12} /> {item.class_name}
                            </span>
                            <h3 className="text-sm font-bold text-white leading-tight">
                              {item.subject_name}
                            </h3>
                          </div>
                          <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              title="Edit Jadwal"
                              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteTarget(item);
                                setActionError(null);
                              }}
                              title="Hapus Jadwal"
                              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-300">
                          <div className="flex items-center gap-2">
                            <Clock size={13} className="text-amber-400 shrink-0" />
                            <span className="font-mono text-slate-200">
                              {item.start_time} - {item.end_time} WIB
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User size={13} className="text-blue-400 shrink-0" />
                            <span className="truncate">{item.teacher_name}</span>
                          </div>
                          {item.room && (
                            <div className="flex items-center gap-2 text-slate-400">
                              <MapPin size={13} className="text-emerald-400 shrink-0" />
                              <span>{item.room}</span>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            // Single Day Table / Card View
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredSchedules.map((item) => (
                <Card
                  key={item.id}
                  className="p-4 border-slate-800 hover:border-slate-700 transition-all space-y-3 relative group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-md mb-1">
                        <GraduationCap size={12} /> {item.class_name}
                      </span>
                      <h3 className="text-sm font-bold text-white leading-tight">
                        {item.subject_name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        title="Edit Jadwal"
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTarget(item);
                          setActionError(null);
                        }}
                        title="Hapus Jadwal"
                        className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-amber-400 shrink-0" />
                      <span className="font-mono text-slate-200">
                        {item.start_time} - {item.end_time} WIB
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User size={13} className="text-blue-400 shrink-0" />
                      <span className="truncate">{item.teacher_name}</span>
                    </div>
                    {item.room && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <MapPin size={13} className="text-emerald-400 shrink-0" />
                        <span>{item.room}</span>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE SCHEDULE */}
      {/* ========================================================================= */}
      <Modal
        isOpen={createModal}
        onClose={() => {
          if (!submitting) setCreateModal(false);
        }}
        title="Tambah Jadwal Pelajaran"
        description="Tetapkan waktu belajar, kelas, mata pelajaran, dan guru pengampu"
        size="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {actionError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-400" />
              <span>{actionError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Hari"
              value={formState.day_of_week}
              onChange={(e) => setFormState({ ...formState, day_of_week: Number(e.target.value) })}
              required
            >
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </Select>

            <Input
              label="Ruangan (Opsional)"
              placeholder="Misal: Lab Komputer 1"
              value={formState.room}
              onChange={(e) => setFormState({ ...formState, room: e.target.value })}
              leftIcon={<MapPin size={15} />}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              type="time"
              label="Jam Mulai"
              value={formState.start_time}
              onChange={(e) => setFormState({ ...formState, start_time: e.target.value })}
              required
            />

            <Input
              type="time"
              label="Jam Selesai"
              value={formState.end_time}
              onChange={(e) => setFormState({ ...formState, end_time: e.target.value })}
              required
            />
          </div>

          <Select
            label="Kelas"
            value={formState.class_id}
            onChange={(e) => setFormState({ ...formState, class_id: Number(e.target.value) })}
            required
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.major ? `(${c.major})` : ""}
              </option>
            ))}
          </Select>

          <Select
            label="Mata Pelajaran"
            value={formState.subject_id}
            onChange={(e) => setFormState({ ...formState, subject_id: Number(e.target.value) })}
            required
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.code ? `[${s.code}]` : ""}
              </option>
            ))}
          </Select>

          <Select
            label="Guru Pengampu"
            value={formState.teacher_id}
            onChange={(e) => setFormState({ ...formState, teacher_id: Number(e.target.value) })}
            required
          >
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name} {t.subject_specialty ? `(${t.subject_specialty})` : ""}
              </option>
            ))}
          </Select>

          <div className="pt-2 flex gap-2">
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
              loadingText="Menyimpan..."
            >
              Simpan Jadwal
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: EDIT SCHEDULE */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(editTarget)}
        onClose={() => {
          if (!submitting) setEditTarget(null);
        }}
        title="Edit Jadwal Pelajaran"
        description="Perbarui informasi waktu atau pengampu jadwal"
        size="md"
      >
        {editTarget && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {actionError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Hari"
                value={formState.day_of_week}
                onChange={(e) => setFormState({ ...formState, day_of_week: Number(e.target.value) })}
                required
              >
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </Select>

              <Input
                label="Ruangan (Opsional)"
                placeholder="Misal: Lab Komputer 1"
                value={formState.room}
                onChange={(e) => setFormState({ ...formState, room: e.target.value })}
                leftIcon={<MapPin size={15} />}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                type="time"
                label="Jam Mulai"
                value={formState.start_time}
                onChange={(e) => setFormState({ ...formState, start_time: e.target.value })}
                required
              />

              <Input
                type="time"
                label="Jam Selesai"
                value={formState.end_time}
                onChange={(e) => setFormState({ ...formState, end_time: e.target.value })}
                required
              />
            </div>

            <Select
              label="Kelas"
              value={formState.class_id}
              onChange={(e) => setFormState({ ...formState, class_id: Number(e.target.value) })}
              required
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.major ? `(${c.major})` : ""}
                </option>
              ))}
            </Select>

            <Select
              label="Mata Pelajaran"
              value={formState.subject_id}
              onChange={(e) => setFormState({ ...formState, subject_id: Number(e.target.value) })}
              required
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.code ? `[${s.code}]` : ""}
                </option>
              ))}
            </Select>

            <Select
              label="Guru Pengampu"
              value={formState.teacher_id}
              onChange={(e) => setFormState({ ...formState, teacher_id: Number(e.target.value) })}
              required
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name} {t.subject_specialty ? `(${t.subject_specialty})` : ""}
                </option>
              ))}
            </Select>

            <div className="pt-2 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                fullWidth
                disabled={submitting}
                onClick={() => setEditTarget(null)}
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
      {/* MODAL: DELETE SCHEDULE */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          if (!submitting) setDeleteTarget(null);
        }}
        title="Hapus Jadwal Pelajaran"
        description="Konfirmasi penghapusan slot jadwal"
        size="sm"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 text-xs text-amber-300 flex items-start gap-2.5">
              <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={16} />
              <div>
                <span className="font-semibold text-amber-200 block mb-1">Peringatan:</span>
                Jadwal <strong className="text-white">{deleteTarget.subject_name}</strong> kelas <strong className="text-white">{deleteTarget.class_name}</strong> pada hari <strong className="text-white">{DAYS.find((d) => d.value === deleteTarget.day_of_week)?.label}</strong> ({deleteTarget.start_time} - {deleteTarget.end_time} WIB) akan dihapus.
              </div>
            </div>

            {actionError && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0 text-rose-400" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                fullWidth
                disabled={submitting}
                onClick={() => setDeleteTarget(null)}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="danger"
                size="md"
                fullWidth
                isLoading={submitting}
                onClick={handleDeleteSubmit}
                leftIcon={<Trash2 size={15} />}
              >
                Hapus Jadwal
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
