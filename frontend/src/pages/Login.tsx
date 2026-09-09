import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, LogIn, Lock, User, Sparkles, AlertCircle, UserPlus, GraduationCap, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApiRequestError } from "../api/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import SchoolLogo from "../components/SchoolLogo";
import ThemeToggle from "../components/ThemeToggle";
import { getPublicClasses, registerStudent } from "../api/authService";
import type { PublicClass } from "../types";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { login, role: currentRole, token } = useAuth();
  const navigate = useNavigate();

  // Registration Modal States
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regFullName, setRegFullName] = useState("");
  const [regStudentCode, setRegStudentCode] = useState("");
  const [regClassId, setRegClassId] = useState<number | "">("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [classesList, setClassesList] = useState<PublicClass[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (token && currentRole) {
      navigate(`/${currentRole}`, { replace: true });
    }
  }, [token, currentRole, navigate]);

  async function openRegisterModal() {
    setIsRegisterOpen(true);
    setRegError(null);
    setRegSuccess(null);
    if (classesList.length === 0) {
      setLoadingClasses(true);
      try {
        const res = await getPublicClasses();
        setClassesList(res.classes || []);
        if (res.classes && res.classes.length > 0) {
          setRegClassId(res.classes[0].id);
        }
      } catch {
        setRegError("Gagal memuat daftar kelas untuk registrasi.");
      } finally {
        setLoadingClasses(false);
      }
    }
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!regClassId) {
      setRegError("Silakan pilih kelas terlebih dahulu.");
      return;
    }
    setRegError(null);
    setRegSubmitting(true);
    try {
      await registerStudent({
        username: regUsername.trim(),
        password: regPassword,
        full_name: regFullName.trim(),
        student_code: regStudentCode.trim(),
        class_id: Number(regClassId),
      });
      setRegSuccess("Pendaftaran berhasil! Silakan login dengan akun Anda.");
      setUsername(regUsername.trim());
      setPassword("");
      setTimeout(() => {
        setIsRegisterOpen(false);
        setRegSuccess(null);
      }, 2000);
    } catch (err: any) {
      if (err instanceof ApiRequestError) {
        setRegError(err.friendlyMessage || err.message);
      } else {
        setRegError("Gagal mendaftar. Pastikan NIS dan username belum terdaftar.");
      }
    } finally {
      setRegSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err: any) {
      if (err instanceof ApiRequestError) {
        setError(err.friendlyMessage || err.message);
      } else {
        setError("Username atau password salah. Silakan coba lagi.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-4 py-8 relative overflow-hidden transition-colors duration-200">
      {/* Theme Toggle Top Right */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Background glow effects — responsive & floating */}
      <div className="absolute top-1/4 -left-32 w-64 h-64 sm:w-96 sm:h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none animate-float" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 sm:w-96 sm:h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none animate-float" style={{ animationDelay: '3s' }} />

      <div className="w-full max-w-md space-y-6 relative z-10 animate-fadeIn">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <SchoolLogo size="lg" className="mb-3" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">SKAGATA ATTENDANCE</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Sistem Presensi Digital SMK Negeri 3 Yogyakarta
          </p>
        </div>

        {/* Login Card */}
        <Card className="p-6 sm:p-7 border-slate-200 dark:border-slate-800 shadow-2xl bg-white/90 dark:bg-slate-900/70">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Input
              label="Username Akun"
              placeholder="Contoh: student01"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              leftIcon={<User size={16} />}
              autoFocus
              required
            />

            <Input
              type="password"
              label="Kata Sandi (Password)"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock size={16} />}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={submitting}
              loadingText="Memverifikasi Akun..."
              leftIcon={<LogIn size={18} />}
            >
              Masuk ke Aplikasi
            </Button>
          </form>

          {/* Registration Section for Students */}
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800/80 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2.5">
              Belum punya akun siswa?
            </p>
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={openRegisterModal}
              leftIcon={<UserPlus size={16} />}
            >
              Daftar Akun Siswa Baru
            </Button>
          </div>
        </Card>

        <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
          SKAGATA Presensi Pintar • SMK Negeri 3 Yogyakarta
        </p>
      </div>

      {/* Modal: Register Siswa */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => {
          if (!regSubmitting) setIsRegisterOpen(false);
        }}
        title="Pendaftaran Akun Siswa"
        description="Pendaftaran khusus siswa SMK Negeri 3 Yogyakarta"
        size="md"
      >
        <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
          {regError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{regError}</span>
            </div>
          )}

          {regSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <span>{regSuccess}</span>
            </div>
          )}

          <Input
            label="Nama Lengkap Siswa"
            placeholder="Contoh: Muhammad Budi"
            value={regFullName}
            onChange={(e) => setRegFullName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="NIS / Nomor Induk Siswa"
              placeholder="Contoh: 202401001"
              value={regStudentCode}
              onChange={(e) => setRegStudentCode(e.target.value)}
              required
            />

            <Select
              label="Kelas"
              value={regClassId}
              onChange={(e) => setRegClassId(Number(e.target.value))}
              disabled={loadingClasses}
              required
            >
              {loadingClasses ? (
                <option value="">Memuat kelas...</option>
              ) : (
                classesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.major ? `(${c.major})` : ""}
                  </option>
                ))
              )}
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Username Akun"
              placeholder="Contoh: budi24"
              value={regUsername}
              onChange={(e) => setRegUsername(e.target.value)}
              leftIcon={<User size={15} />}
              required
            />

            <Input
              type="password"
              label="Password Baru"
              placeholder="Minimal 6 karakter"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              leftIcon={<Lock size={15} />}
              required
            />
          </div>

          <div className="pt-3 flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              disabled={regSubmitting}
              onClick={() => setIsRegisterOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              isLoading={regSubmitting}
              loadingText="Mendaftarkan..."
              leftIcon={<UserPlus size={16} />}
            >
              Daftar Sekarang
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
