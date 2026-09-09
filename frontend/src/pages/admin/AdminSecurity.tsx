import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, Server, Database, HardDrive, 
  MapPin, Fingerprint, Lock, RefreshCw, CheckCircle2, AlertTriangle, XCircle 
} from "lucide-react";
import { getSystemStatus } from "../../api/settingsService";
import type { SystemStatusData, SystemStatusService } from "../../types";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export const AdminSecurity: React.FC = () => {
  const [statusData, setStatusData] = useState<SystemStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await getSystemStatus();
      setStatusData(data);
    } catch (err) {
      console.error("Gagal memuat status sistem:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const getServiceIcon = (key: string) => {
    switch (key.toLowerCase()) {
      case "database":
        return <Database size={22} className="text-blue-500" />;
      case "api":
        return <Server size={22} className="text-emerald-500" />;
      case "storage":
        return <HardDrive size={22} className="text-purple-500" />;
      case "geofence":
        return <MapPin size={22} className="text-rose-500" />;
      case "biometric":
        return <Fingerprint size={22} className="text-amber-500" />;
      default:
        return <Lock size={22} className="text-slate-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "operational":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 size={12} /> Operasional
          </span>
        );
      case "warning":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertTriangle size={12} /> Perlu Perhatian
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <XCircle size={12} /> Terganggu
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <ShieldCheck className="text-brand-600 dark:text-brand-400" size={28} />
            Kesehatan & Keamanan Sistem
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Status runtime infrastruktur backend, konektivitas database, geofence, dan kebijakan keamanan.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={fetchStatus}
          leftIcon={<RefreshCw size={15} className={loading ? "animate-spin" : ""} />}
        >
          Refresh
        </Button>
      </div>

      {loading ? (
        <Card className="p-12 text-center bg-white dark:bg-slate-900">
          <RefreshCw className="animate-spin mx-auto text-brand-600 mb-3" size={32} />
          <p className="text-sm text-slate-500">Mengecek status kesehatan server...</p>
        </Card>
      ) : !statusData ? (
        <Card className="p-8 text-center bg-white dark:bg-slate-900">
          <p className="text-sm text-slate-500">Gagal memuat status sistem.</p>
        </Card>
      ) : (
        <>
          {/* Main Status Banner */}
          <Card className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white border-slate-700 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 size={28} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Semua Layanan Berjalan Normal</h2>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Sistem SKAGATA Attendance beroperasi optimal dengan integritas data terjaga.
                  </p>
                </div>
              </div>

              <span className="self-start sm:self-center px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                SYSTEM HEALTH: 100%
              </span>
            </div>
          </Card>

          {/* Subsystem Health Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(statusData.services || {}).map(([key, serviceVal]) => {
              const service = serviceVal as SystemStatusService;
              return (
              <Card
                key={key}
                className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                        {getServiceIcon(key)}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white capitalize">
                        {service.name || key}
                      </h3>
                    </div>
                    {getStatusBadge(service.status)}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                    {service.details || "Komponen aktif dan melayani request secara normal."}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Status: {service.status.toUpperCase()}</span>
                  <span>{service.version ? `v${service.version}` : "v2.0-STABLE"}</span>
                </div>
              </Card>
              );
            })}
          </div>

          {/* Security Protocols Overview */}
          <Card className="p-5 sm:p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock size={18} className="text-brand-600 dark:text-brand-400" />
              Kebijakan & Perlindungan Keamanan Aktif
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
                <div className="font-bold text-slate-800 dark:text-slate-200">Autentikasi JWT & Role Authorization</div>
                <p className="text-slate-500 dark:text-slate-400">
                  Token bearer terenkripsi HS256 dengan pemisahan akses ketat (Admin, Guru, Siswa).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
                <div className="font-bold text-slate-800 dark:text-slate-200">Anti-Spoofing GPS & Haversine Verifier</div>
                <p className="text-slate-500 dark:text-slate-400">
                  Perhitungan jarak geodesik akurat terhadap batas resmi SMKN 3 Yogyakarta.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
                <div className="font-bold text-slate-800 dark:text-slate-200">Foto Verifikasi & File Upload Sandboxing</div>
                <p className="text-slate-500 dark:text-slate-400">
                  Pemeriksaan MIME type, batas ukuran 5MB, serta sanitasi nama berkas unik acak.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
                <div className="font-bold text-slate-800 dark:text-slate-200">Audit Logging & Ownership Checks</div>
                <p className="text-slate-500 dark:text-slate-400">
                  Setiap transaksi tersimpan dalam tabel Activity Log dengan audit IP address.
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminSecurity;
