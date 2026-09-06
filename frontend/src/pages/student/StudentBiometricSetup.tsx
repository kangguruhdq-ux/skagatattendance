import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Fingerprint,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  AlertTriangle,
  ArrowLeft,
  Trash2,
  Link2,
  Plus,
  RefreshCw,
} from "lucide-react";
import {
  getBiometricStatus,
  enrollBiometric,
  relinkBiometric,
  deleteBiometricDevice,
  isBiometricSupported,
} from "../../api/webauthnService";
import type { BiometricStatus, BiometricDevice } from "../../api/webauthnService";
import { ApiRequestError } from "../../api/client";
import { Card, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";
import Modal from "../../components/ui/Modal";

export default function StudentBiometricSetup() {
  const [status, setStatus] = useState<BiometricStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [relinking, setRelinking] = useState(false);
  const [deviceLabel, setDeviceLabel] = useState("Smartphone Saya");

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<BiometricDevice | null>(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    setLoading(true);
    getBiometricStatus()
      .then((data) => {
        setStatus(data);
        setError(null);
      })
      .catch((e) =>
        setError(e instanceof ApiRequestError ? e.friendlyMessage : "Gagal memuat status biometrik.")
      )
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function handleWebAuthnError(e: any): string {
    if (e instanceof ApiRequestError) return e.friendlyMessage;
    if (e?.name === "NotAllowedError") return "Verifikasi biometrik dibatalkan oleh pengguna.";
    if (e?.name === "NotSupportedError") return "Perangkat ini tidak mendukung biometrik yang diperlukan.";
    if (e?.name === "SecurityError") return "Terjadi kesalahan keamanan. Pastikan Anda mengakses melalui HTTPS.";
    if (e?.name === "InvalidStateError") return "Perangkat biometrik ini sudah terdaftar sebelumnya.";
    return e?.message || "Pendaftaran biometrik gagal atau dibatalkan.";
  }

  async function handleEnroll() {
    setError(null);
    setSuccess(null);
    setEnrolling(true);
    try {
      await enrollBiometric(deviceLabel || "Perangkat Saya");
      setSuccess("Perangkat berhasil didaftarkan!");
      load();
    } catch (e: any) {
      setError(handleWebAuthnError(e));
    } finally {
      setEnrolling(false);
    }
  }

  async function handleRelink() {
    setError(null);
    setSuccess(null);
    setRelinking(true);
    try {
      await relinkBiometric(deviceLabel || "Perangkat Saya");
      setSuccess("Biometrik berhasil ditautkan ulang pada domain ini!");
      load();
    } catch (e: any) {
      setError(handleWebAuthnError(e));
    } finally {
      setRelinking(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBiometricDevice(deleteTarget.id);
      setDeleteTarget(null);
      setSuccess("Perangkat berhasil dihapus.");
      load();
    } catch (e: any) {
      setError(e instanceof ApiRequestError ? e.friendlyMessage : "Gagal menghapus perangkat.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const supported = isBiometricSupported();
  const isProcessing = enrolling || relinking;

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <Link
        to="/student"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} /> Kembali ke Dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <Fingerprint className="text-brand-400" size={26} /> Pendaftaran Biometrik
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Gunakan fingerprint, Face ID, atau PIN perangkat untuk presensi instan dan aman.
        </p>
      </div>

      {/* WebAuthn not supported warning */}
      {!supported && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm flex items-start gap-3">
          <AlertTriangle size={20} className="shrink-0 mt-0.5 text-amber-400" />
          <p className="text-xs sm:text-sm leading-relaxed">
            Perangkat atau browser ini tidak mendukung biometric attendance (WebAuthn). Pastikan Anda membuka aplikasi melalui browser modern dan koneksi HTTPS aman.
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
          <AlertTriangle size={20} className="shrink-0 mt-0.5 text-rose-400" />
          <p className="text-xs sm:text-sm leading-relaxed">{error}</p>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-brand-300 text-sm flex items-start gap-3">
          <CheckCircle2 size={20} className="shrink-0 mt-0.5 text-brand-400" />
          <p className="text-xs sm:text-sm leading-relaxed">{success}</p>
        </div>
      )}

      {/* Status Card */}
      <Card className="p-6 sm:p-8 text-center space-y-5 border-slate-700">
        <div className="p-4 rounded-3xl bg-brand-500/10 text-brand-400 w-fit mx-auto border border-brand-500/20 shadow-glow">
          <Fingerprint size={44} />
        </div>

        <div>
          <h2 className="text-xl font-bold text-white">Autentikasi Cepat & Aman</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
            Dengan mendaftarkan biometrik, Anda dapat memverifikasi presensi kehadiran kelas hanya dengan menempelkan sidik jari atau memindai wajah pada perangkat ini.
          </p>
        </div>

        {loading ? (
          <Skeleton className="h-20 w-full" />
        ) : status?.enrolled ? (
          <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-brand-400 text-sm font-semibold flex items-center justify-center gap-2">
            <CheckCircle2 size={20} /> Biometrik Terdaftar & Aktif
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-semibold flex items-center justify-center gap-2">
            <AlertTriangle size={20} /> Belum Ada Biometrik Terdaftar
          </div>
        )}

        {/* RP ID info */}
        {!loading && status?.rp_id && (
          <p className="text-[11px] text-slate-500">
            Domain aktif: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{status.rp_id}</code>
          </p>
        )}
      </Card>

      {/* Action Card — Enroll / Relink */}
      {!loading && (
        <Card className="p-5 sm:p-6 space-y-4 border-slate-700">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Fingerprint size={16} className="text-brand-400" /> Daftarkan / Tautkan Ulang
          </h3>

          <div className="space-y-3 max-w-sm mx-auto">
            <Input
              label="Nama / Label Perangkat"
              placeholder="Contoh: HP Samsung Andi"
              value={deviceLabel}
              onChange={(e) => setDeviceLabel(e.target.value)}
            />

            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!supported || isProcessing}
              isLoading={enrolling}
              loadingText="Menunggu Sentuhan Jari / Wajah..."
              onClick={handleEnroll}
              leftIcon={<Plus size={18} />}
            >
              Daftarkan Perangkat Baru
            </Button>

            <Button
              variant="secondary"
              size="lg"
              fullWidth
              disabled={!supported || isProcessing}
              isLoading={relinking}
              loadingText="Menautkan Ulang..."
              onClick={handleRelink}
              leftIcon={<Link2 size={18} />}
            >
              Tautkan Ulang Biometrik
            </Button>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              <strong>Tautkan Ulang:</strong> Gunakan fitur ini jika domain aplikasi berubah (misalnya URL Cloudflare Tunnel baru) dan biometrik lama tidak dapat digunakan lagi. Ini akan mendaftarkan credential baru pada domain yang sedang aktif.
            </p>
          </div>
        </Card>
      )}

      {/* Registered Devices */}
      {!loading && status && status.devices.length > 0 && (
        <Card className="p-5 sm:p-6 space-y-3 border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Smartphone size={16} className="text-brand-400" /> Perangkat Terdaftar ({status.devices.length})
          </h3>
          <div className="space-y-2">
            {status.devices.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400 shrink-0">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white text-sm truncate">{d.label}</p>
                    <p className="text-[11px] text-slate-500">
                      Terdaftar pada {new Date(d.created_at).toLocaleDateString("id-ID")}
                    </p>
                    <p className="text-[10px] text-slate-600 font-mono truncate">
                      ID: {d.credential_id.slice(0, 16)}...
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-[10px] font-semibold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/20">
                    Aktif
                  </span>
                  <button
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    onClick={() => setDeleteTarget(d)}
                    title="Hapus perangkat"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Privacy Notice */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-3 text-xs text-slate-400">
        <ShieldCheck size={18} className="shrink-0 text-brand-400 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Privasi Terjamin:</strong> Data sidik jari dan biometrik wajah Anda tidak pernah
          dikirim ke server sekolah. Verifikasi dilakukan sepenuhnya di dalam perangkat keras aman (secure enclave) perangkat Anda.
        </p>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Perangkat Biometrik"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Apakah Anda yakin ingin menghapus perangkat <strong className="text-white">"{deleteTarget?.label}"</strong>?
          </p>
          <p className="text-xs text-slate-500">
            Perangkat yang dihapus tidak dapat digunakan untuk verifikasi biometrik. Anda dapat mendaftarkan ulang perangkat kapan saja.
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={handleDelete}
              isLoading={deleting}
              loadingText="Menghapus..."
              className="!bg-rose-600 hover:!bg-rose-500"
              leftIcon={<Trash2 size={16} />}
            >
              Hapus
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
