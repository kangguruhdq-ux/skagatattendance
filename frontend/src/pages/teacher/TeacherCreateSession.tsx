import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Camera,
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  BookOpen,
  Users,
} from "lucide-react";
import { getSubjects, getClasses, createSession } from "../../api/teacherService";
import { ApiRequestError } from "../../api/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { Input } from "../../components/ui/Input";
import { Switch } from "../../components/ui/Switch";

export default function TeacherCreateSession() {
  const [subjects, setSubjects] = useState<{ id: number; name: string }[]>([]);
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [form, setForm] = useState({
    subject_id: "",
    class_id: "",
    date: new Date().toISOString().slice(0, 10),
    start_time: "07:00",
    end_time: "08:30",
    late_threshold_minutes: 10,
    require_gps: false,
    require_photo: false,
    require_biometric: false,
  });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getSubjects()
      .then((res) => setSubjects(res.subjects || []))
      .catch(() => {});
    getClasses()
      .then((res) => setClasses(res.classes || []))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Form validations
    if (!form.subject_id) {
      setError("Silakan pilih mata pelajaran.");
      return;
    }
    if (!form.class_id) {
      setError("Silakan pilih kelas sasaran.");
      return;
    }
    if (!form.date) {
      setError("Tanggal sesi wajib diisi.");
      return;
    }
    if (form.start_time >= form.end_time) {
      setError("Waktu selesai sesi harus setelah waktu mulai.");
      return;
    }
    if (form.late_threshold_minutes < 0) {
      setError("Toleransi keterlambatan tidak boleh bernilai negatif.");
      return;
    }

    setSubmitting(true);
    try {
      const session = await createSession({
        subject_id: Number(form.subject_id),
        class_id: Number(form.class_id),
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        late_threshold_minutes: Number(form.late_threshold_minutes),
        require_gps: form.require_gps,
        require_photo: form.require_photo,
        require_biometric: form.require_biometric,
      });

      navigate(`/teacher/sessions/${session.id}`);
    } catch (err: any) {
      setError(
        err instanceof ApiRequestError ? err.friendlyMessage : "Gagal membuat sesi presensi."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Selected subject & class names for summary
  const selectedSubject = subjects.find((s) => String(s.id) === form.subject_id)?.name;
  const selectedClass = classes.find((c) => String(c.id) === form.class_id)?.name;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        to="/teacher"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} /> Kembali ke Dashboard
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Buat Sesi Presensi Baru</h1>
          <p className="text-sm text-slate-400 mt-1">
            Konfigurasikan mata pelajaran, kelas, jadwal, dan syarat presensi siswa.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form (2 cols) */}
        <div className="lg:col-span-2 space-y-5">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-2.5">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Group 1: BASIC INFORMATION */}
          <Card className="p-5 sm:p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <BookOpen size={14} className="text-brand-400" /> Informasi Dasar
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Mata Pelajaran *"
                value={form.subject_id}
                onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
              >
                <option value="">Pilih mata pelajaran...</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>

              <Select
                label="Kelas *"
                value={form.class_id}
                onChange={(e) => setForm({ ...form, class_id: e.target.value })}
              >
                <option value="">Pilih kelas...</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          </Card>

          {/* Group 2: SCHEDULE */}
          <Card className="p-5 sm:p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Calendar size={14} className="text-brand-400" /> Jadwal Sesi
            </h3>

            <Input
              type="date"
              label="Tanggal Pelaksanaan *"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                type="time"
                label="Jam Mulai *"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              />
              <Input
                type="time"
                label="Jam Selesai *"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              />
            </div>
          </Card>

          {/* Group 3: ATTENDANCE REQUIREMENTS */}
          <Card className="p-5 sm:p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 size={14} className="text-brand-400" /> Syarat & Validasi Kehadiran
            </h3>

            <div className="space-y-4 divide-y divide-slate-800/80">
              <Switch
                checked={form.require_gps}
                onChange={(checked) => setForm({ ...form, require_gps: checked })}
                label="Validasi Radius GPS Sekolah"
                description="Siswa wajib berada dalam radius 150 meter dari sekolah saat presensi."
              />

              <div className="pt-3">
                <Switch
                  checked={form.require_photo}
                  onChange={(checked) => setForm({ ...form, require_photo: checked })}
                  label="Wajib Bukti Foto Wajah (Selfie)"
                  description="Siswa wajib mengambil foto selfie saat melakukan presensi via QR."
                />
              </div>

              <div className="pt-3">
                <Switch
                  checked={form.require_biometric}
                  onChange={(checked) => setForm({ ...form, require_biometric: checked })}
                  label="Verifikasi Biometrik (Fingerprint / Face ID)"
                  description="Siswa wajib mengonfirmasi identitas menggunakan biometrik perangkat WebAuthn."
                />
                {form.require_biometric && (
                  <p className="text-[11px] text-amber-400/90 pl-14 mt-1">
                    Catatan: Siswa harus sudah mendaftarkan perangkat di menu Fingerprint/Face ID sebelum melakukan presensi.
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Group 4: ADVANCED */}
          <Card className="p-5 sm:p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Clock size={14} className="text-brand-400" /> Toleransi Keterlambatan
            </h3>

            <Input
              type="number"
              min={0}
              label="Toleransi Terlambat (Menit)"
              helperText="Siswa yang presensi setelah menit ini sejak sesi dimulai akan otomatis tercatat 'TERLAMBAT'."
              value={form.late_threshold_minutes}
              onChange={(e) =>
                setForm({ ...form, late_threshold_minutes: Number(e.target.value) })
              }
            />
          </Card>
        </div>

        {/* Live Summary Sidebar (1 col) */}
        <div className="space-y-5">
          <Card className="p-5 sm:p-6 sticky top-6 space-y-5 border-brand-500/30">
            <div>
              <h3 className="text-base font-bold text-white">Ringkasan Sesi</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Pratinjau detail sesi sebelum diterbitkan.
              </p>
            </div>

            <div className="space-y-3 text-xs bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Mapel:</span>
                <span className="font-semibold text-white truncate max-w-[140px]">
                  {selectedSubject || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Kelas:</span>
                <span className="font-semibold text-white">{selectedClass || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tanggal:</span>
                <span className="font-mono text-slate-300">{form.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Waktu:</span>
                <span className="font-mono text-brand-300 font-semibold">
                  {form.start_time} - {form.end_time}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Toleransi:</span>
                <span className="text-slate-300">{form.late_threshold_minutes} Menit</span>
              </div>
            </div>

            {/* Requirements pills */}
            <div className="space-y-2 text-xs">
              <p className="text-slate-400 font-medium">Syarat Aktif:</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-slate-300">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      form.require_gps ? "bg-emerald-400" : "bg-slate-600"
                    }`}
                  />
                  <span>GPS Radius {form.require_gps ? "✓ Aktif" : "(Nonaktif)"}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      form.require_photo ? "bg-emerald-400" : "bg-slate-600"
                    }`}
                  />
                  <span>Bukti Foto Wajah {form.require_photo ? "✓ Aktif" : "(Opsional)"}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      form.require_biometric ? "bg-emerald-400" : "bg-slate-600"
                    }`}
                  />
                  <span>Biometrik WebAuthn {form.require_biometric ? "✓ Aktif" : "(Nonaktif)"}</span>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={submitting}
              loadingText="Membuat Sesi..."
              leftIcon={<PlusCircle size={18} />}
            >
              Terbitkan Sesi Presensi
            </Button>
          </Card>
        </div>
      </form>
    </div>
  );
}
