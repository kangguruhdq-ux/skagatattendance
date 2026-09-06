import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Fingerprint,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import {
  getBiometricStatus,
  enrollBiometric,
  isBiometricSupported,
} from "../../api/webauthnService";
import { ApiRequestError } from "../../api/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";

export default function StudentBiometricSetup() {
  const [status, setStatus] = useState<{ enrolled: boolean; devices: any[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [deviceLabel, setDeviceLabel] = useState("Smartphone Saya");

  function load() {
    getBiometricStatus()
      .then(setStatus)
      .catch((e) =>
        setError(e instanceof ApiRequestError ? e.friendlyMessage : "Gagal memuat status biometrik.")
      );
  }

  useEffect(load, []);

  async function handleEnroll() {
    setError(null);
    setEnrolling(true);
    try {
      await enrollBiometric(deviceLabel || "Perangkat Saya");
      load();
    } catch (e: any) {
      setError(
        e instanceof ApiRequestError
          ? e.friendlyMessage
          : e?.message || "Pendaftaran biometrik dibatalkan atau tidak selesai."
      );
    } finally {
      setEnrolling(false);
    }
  }

  const supported = isBiometricSupported();

  return (
    <div className="max-w-xl mx-auto space-y-6">
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

      {!supported && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm flex items-start gap-3">
          <AlertTriangle size={20} className="shrink-0 mt-0.5 text-amber-400" />
          <p className="text-xs sm:text-sm leading-relaxed">
            Perangkat atau browser ini tidak mendukung biometric attendance (WebAuthn). Pastikan Anda membuka aplikasi melalui browser modern dan koneksi HTTPS aman.
          </p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
          <AlertTriangle size={20} className="shrink-0 mt-0.5 text-rose-400" />
          <p className="text-xs sm:text-sm leading-relaxed">{error}</p>
        </div>
      )}

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

        {!status ? (
          <Skeleton className="h-20 w-full" />
        ) : status.enrolled ? (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold flex items-center justify-center gap-2">
            <CheckCircle2 size={20} /> Perangkat Ini Telah Terdaftar & Siap Digunakan
          </div>
        ) : (
          <div className="space-y-3 pt-2 text-left max-w-sm mx-auto">
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
              disabled={!supported}
              isLoading={enrolling}
              loadingText="Menunggu Sentuhan Jari / Wajah..."
              onClick={handleEnroll}
              leftIcon={<Fingerprint size={18} />}
            >
              Daftarkan Perangkat Ini
            </Button>
          </div>
        )}
      </Card>

      {/* List of Registered Devices */}
      {status && status.devices.length > 0 && (
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
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{d.label}</p>
                    <p className="text-[11px] text-slate-500">
                      Terdaftar pada {new Date(d.created_at).toLocaleDateString("id-ID")}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Aktif
                </span>
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
    </div>
  );
}
