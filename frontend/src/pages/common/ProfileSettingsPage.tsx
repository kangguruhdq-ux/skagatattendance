import React, { useState, useEffect, useRef } from "react";
import {
  User,
  Mail,
  ShieldCheck,
  Camera,
  Trash2,
  Lock,
  Sun,
  Moon,
  Monitor,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Save,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { getProfile, updateProfile, uploadAvatar, deleteAvatar, changePassword, getAvatarUrl } from "../../api/profileService";
import type { UserProfile } from "../../types";
import clsx from "clsx";

export default function ProfileSettingsPage() {
  const { role } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Feedback states
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const data = await getProfile();
      setProfile(data);
      setFullName(data.full_name || "");
      setEmail(data.email || "");
    } catch {
      setProfileError("Gagal memuat profil pengguna.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess(null);
    setProfileError(null);
    try {
      const updated = await updateProfile({ full_name: fullName, email: email || undefined });
      setProfile(updated);
      setProfileSuccess("Profil berhasil diperbarui.");
      setTimeout(() => setProfileSuccess(null), 3000);
    } catch (err: any) {
      setProfileError(err.message || "Gagal memperbarui profil.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setProfileError("Ukuran foto profil maksimal 5MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Instant local preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setImgError(false);

    setUploadingAvatar(true);
    setProfileError(null);
    try {
      const updated = await uploadAvatar(file);
      setProfile(updated);
      setProfileSuccess("Foto profil berhasil diperbarui. Memperbarui halaman...");
      const cacheBustUrl = updated.avatar_url ? `${updated.avatar_url}?t=${Date.now()}` : "";
      if (cacheBustUrl) {
        localStorage.setItem("skagata_avatar", cacheBustUrl);
        window.dispatchEvent(new Event("avatar_updated"));
      }
      // Auto refresh the page so user sees new avatar everywhere immediately
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (err: any) {
      setProfileError(err.friendlyMessage || err.message || "Gagal mengunggah foto profil.");
      setPreviewUrl(null);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteAvatar() {
    if (!confirm("Hapus foto profil ini?")) return;
    setUploadingAvatar(true);
    try {
      const updated = await deleteAvatar();
      setProfile(updated);
      setPreviewUrl(null);
      setImgError(false);
      localStorage.removeItem("skagata_avatar");
      window.dispatchEvent(new Event("avatar_updated"));
      setProfileSuccess("Foto profil berhasil dihapus. Memperbarui halaman...");
      // Auto refresh the page
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (err: any) {
      setProfileError(err.friendlyMessage || err.message || "Gagal menghapus foto profil.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdSuccess(null);
    setPwdError(null);

    if (newPassword.length < 6) {
      setPwdError("Kata sandi baru minimal 6 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(oldPassword, newPassword);
      setPwdSuccess("Kata sandi berhasil diubah.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwdSuccess(null), 3500);
    } catch (err: any) {
      setPwdError(err.friendlyMessage || err.message || "Gagal mengubah kata sandi.");
    } finally {
      setSavingPassword(false);
    }
  }

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "SK";

  const resolvedAvatarSrc = previewUrl || (profile?.avatar_url && !imgError ? getAvatarUrl(profile.avatar_url) : null);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Pengaturan & Profil Akun
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Kelola informasi identitas, foto profil, keamanan kata sandi, dan preferensi tema.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Memuat profil...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Identity & Avatar Card */}
          <div className="space-y-6">
            <Card className="text-center p-6">
              <div className="relative w-28 h-28 mx-auto mb-2 group">
                {resolvedAvatarSrc ? (
                  <img
                    src={resolvedAvatarSrc}
                    alt={profile?.full_name || "Foto profil"}
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover rounded-2xl border-2 border-brand-500 shadow-md"
                  />
                ) : (
                  <div className="w-full h-full rounded-2xl bg-brand-600/20 border-2 border-brand-500/40 text-brand-600 dark:text-brand-300 text-3xl font-black flex items-center justify-center">
                    {initials}
                  </div>
                )}

                {/* Upload overlay button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  aria-label="Ubah foto profil"
                  title="Ubah foto profil"
                  className="absolute bottom-0 right-0 p-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  {uploadingAvatar ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Camera size={16} />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              <p className="text-[11px] text-slate-400 mb-3">Mendukung JPG, PNG, WEBP (maks. 5MB)</p>

              {(profile?.avatar_url || previewUrl) && (
                <button
                  type="button"
                  onClick={handleDeleteAvatar}
                  disabled={uploadingAvatar}
                  className="text-xs text-rose-500 hover:text-rose-600 flex items-center justify-center gap-1 mx-auto mb-3 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={13} /> Hapus foto profil
                </button>
              )}

              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {profile?.full_name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">@{profile?.username}</p>

              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/30 capitalize">
                <ShieldCheck size={14} />
                Role: {profile?.role}
              </div>

              {/* Specific info badges */}
              {profile?.student_info && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-left space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">NIS:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {profile.student_info.student_code}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Kelas:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {profile.student_info.class_name || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Jurusan:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {profile.student_info.major || "-"}
                    </span>
                  </div>
                </div>
              )}

              {profile?.teacher_info && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-left space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">NIP/Kode:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {profile.teacher_info.teacher_code}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Spesialisasi:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {profile.teacher_info.subject_specialty || "-"}
                    </span>
                  </div>
                </div>
              )}
            </Card>

            {/* Appearance Card */}
            <Card className="p-6">
              <CardTitle className="text-base mb-1 flex items-center gap-2">
                <Sparkles size={16} className="text-brand-500" /> Preferensi Tema
              </CardTitle>
              <CardDescription className="mb-4">
                Pilih tampilan terang, gelap, atau mengikuti tema sistem operasi.
              </CardDescription>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={clsx(
                    "flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all",
                    theme === "light"
                      ? "bg-brand-500/15 border-brand-500 text-brand-600 dark:text-brand-400 shadow-sm"
                      : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <Sun size={20} className="mb-1 text-amber-500" />
                  Terang
                </button>

                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={clsx(
                    "flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all",
                    theme === "dark"
                      ? "bg-brand-500/15 border-brand-500 text-brand-600 dark:text-brand-400 shadow-sm"
                      : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <Moon size={20} className="mb-1 text-indigo-400" />
                  Gelap
                </button>

                <button
                  type="button"
                  onClick={() => setTheme("system")}
                  className={clsx(
                    "flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all",
                    theme === "system"
                      ? "bg-brand-500/15 border-brand-500 text-brand-600 dark:text-brand-400 shadow-sm"
                      : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <Monitor size={20} className="mb-1 text-slate-500" />
                  Sistem
                </button>
              </div>

              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3 text-center">
                Mode aktif saat ini:{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                  {resolvedTheme === "dark" ? "Mode Gelap" : "Mode Terang"}
                </span>
              </p>
            </Card>
          </div>

          {/* Column 2 & 3: Profile Form & Password Change */}
          <div className="lg:col-span-2 space-y-6">
            {/* General Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informasi Akun</CardTitle>
                <CardDescription>
                  Perbarui nama lengkap dan alamat email yang terhubung ke akun Anda.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  {profileSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs flex items-start gap-2">
                      <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                      <span>{profileSuccess}</span>
                    </div>
                  )}

                  {profileError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-2">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <span>{profileError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Username Akun"
                      value={profile?.username || ""}
                      disabled
                      helperText="Username bersifat unik dan tidak dapat diubah."
                      leftIcon={<User size={16} />}
                    />

                    <Input
                      label="Alamat Email"
                      type="email"
                      placeholder="contoh: nama@smkn3jogja.sch.id"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      leftIcon={<Mail size={16} />}
                      helperText="Digunakan untuk notifikasi dan pemulihan."
                    />
                  </div>

                  <Input
                    label="Nama Lengkap"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nama lengkap sesuai data resmi sekolah"
                    leftIcon={<User size={16} />}
                    required
                  />

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      isLoading={savingProfile}
                      loadingText="Menyimpan..."
                      leftIcon={<Save size={16} />}
                    >
                      Simpan Perubahan
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Change Password Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Keamanan & Kata Sandi</CardTitle>
                <CardDescription>
                  Ganti kata sandi secara berkala untuk menjaga keamanan akun Anda.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  {pwdSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs flex items-start gap-2">
                      <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                      <span>{pwdSuccess}</span>
                    </div>
                  )}

                  {pwdError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-2">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <span>{pwdError}</span>
                    </div>
                  )}

                  <Input
                    type="password"
                    label="Kata Sandi Saat Ini"
                    placeholder="Masukkan kata sandi lama"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    leftIcon={<Lock size={16} />}
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      type="password"
                      label="Kata Sandi Baru"
                      placeholder="Minimal 6 karakter"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      leftIcon={<Lock size={16} />}
                      required
                    />

                    <Input
                      type="password"
                      label="Konfirmasi Kata Sandi Baru"
                      placeholder="Ulangi kata sandi baru"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      leftIcon={<Lock size={16} />}
                      required
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="submit"
                      variant="secondary"
                      size="md"
                      isLoading={savingPassword}
                      loadingText="Mengubah Kata Sandi..."
                      leftIcon={<Lock size={16} />}
                    >
                      Ubah Kata Sandi
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
