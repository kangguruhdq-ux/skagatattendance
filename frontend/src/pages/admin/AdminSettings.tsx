import React, { useState, useEffect } from "react";
import { 
  Sliders, MapPin, Save, RefreshCw, CheckCircle2, 
  AlertCircle, School, Shield, Navigation 
} from "lucide-react";
import { getSystemSettings, updateSystemSettings, type SettingsResponse } from "../../api/settingsService";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Switch } from "../../components/ui/Switch";

export const AdminSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [schoolName, setSchoolName] = useState("SMKN 3 Yogyakarta");
  const [schoolAddress, setSchoolAddress] = useState("Jl. RW. Monginsidi No.2, Jetis, Kota Yogyakarta");
  const [latitude, setLatitude] = useState(-7.777500);
  const [longitude, setLongitude] = useState(110.365900);
  const [radiusMeters, setRadiusMeters] = useState(150);
  const [geofenceEnabled, setGeofenceEnabled] = useState(true);
  const [academicYear, setAcademicYear] = useState("2025/2026");
  const [semester, setSemester] = useState("Genap");

  const fetchSettings = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getSystemSettings();
      if (data.school_location) {
        setLatitude(data.school_location.latitude);
        setLongitude(data.school_location.longitude);
        setRadiusMeters(data.school_location.radius_meters);
        setGeofenceEnabled(data.school_location.enabled);
        setSchoolName(data.school_location.school_name || "SMKN 3 Yogyakarta");
        setSchoolAddress(data.school_location.school_address || "");
      }
      if (data.settings) {
        if (data.settings.academic_year) setAcademicYear(data.settings.academic_year);
        if (data.settings.semester) setSemester(data.settings.semester);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal memuat pengaturan sistem.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const payload = {
        school_name: schoolName,
        school_address: schoolAddress,
        school_latitude: String(latitude),
        school_longitude: String(longitude),
        school_radius_meters: String(radiusMeters),
        school_geofence_enabled: geofenceEnabled ? "true" : "false",
        academic_year: academicYear,
        semester: semester,
      };

      await updateSystemSettings(payload);
      setSuccessMsg("Pengaturan sistem dan geofence sekolah berhasil disimpan!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal memperbarui pengaturan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Sliders className="text-brand-600 dark:text-brand-400" size={28} />
            Pengaturan Sistem & Geofence
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Konfigurasi pusat sekolah, koordinat batas presensi SMKN 3 Yogyakarta, dan parameter umum aplikasi.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={fetchSettings}
          leftIcon={<RefreshCw size={15} className={loading ? "animate-spin" : ""} />}
        >
          Refresh
        </Button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-2.5 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-2.5 text-sm text-rose-700 dark:text-rose-300">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <Card className="p-12 text-center bg-white dark:bg-slate-900">
          <RefreshCw className="animate-spin mx-auto text-brand-600 mb-3" size={32} />
          <p className="text-sm text-slate-500">Memuat data konfigurasi...</p>
        </Card>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* School Identity */}
          <Card className="p-5 sm:p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
              <School className="text-brand-600 dark:text-brand-400" size={22} />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Identitas Lembaga Sekolah</h2>
                <p className="text-xs text-slate-400">Nama resmi instansi dan alamat operasional</p>
              </div>
            </div>

            <Input
              label="Nama Sekolah *"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Alamat Lengkap Sekolah
              </label>
              <textarea
                value={schoolAddress}
                onChange={(e) => setSchoolAddress(e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Tahun Ajaran Aktif"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Semester Aktif
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                >
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Centralized Geofence Settings */}
          <Card className="p-5 sm:p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <MapPin className="text-rose-600 dark:text-rose-400" size={22} />
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Geofence GPS SMKN 3 Yogyakarta</h2>
                  <p className="text-xs text-slate-400">Batas toleransi radius presensi siswa</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {geofenceEnabled ? "Aktif" : "Nonaktif"}
                </span>
                <Switch
                  checked={geofenceEnabled}
                  onChange={(val) => setGeofenceEnabled(val)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Latitude Titik Pusat Sekolah *"
                  type="number"
                  step="any"
                  value={String(latitude)}
                  onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">Default SMKN 3 Yogya: -7.777500</p>
              </div>

              <div>
                <Input
                  label="Longitude Titik Pusat Sekolah *"
                  type="number"
                  step="any"
                  value={String(longitude)}
                  onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">Default SMKN 3 Yogya: 110.365900</p>
              </div>
            </div>

            {/* Radius Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Radius Toleransi Jarak: <strong className="text-brand-600 dark:text-brand-400 text-sm">{radiusMeters} meter</strong>
                </label>
                <span className="text-xs text-slate-400">Rentang: 50m - 500m</span>
              </div>
              <input
                type="range"
                min={50}
                max={500}
                step={10}
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(parseInt(e.target.value, 10))}
                className="w-full accent-brand-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>50m (Ketat)</span>
                <span>150m (Rekomendasi Area Sekolah)</span>
                <span>500m (Longgar)</span>
              </div>
            </div>

            {/* Geofence Info Alert */}
            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2.5">
              <Navigation className="shrink-0 mt-0.5" size={16} />
              <span>
                Saat Geofence aktif, setiap siswa yang melakukan presensi pada sesi yang mewajibkan GPS akan dihitung jarak Haversine terhadap koordinat <code>{latitude}, {longitude}</code>. Jika jarak melebihi <code>{radiusMeters}m</code>, presensi otomatis ditolak oleh backend.
              </span>
            </div>
          </Card>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              isLoading={saving}
              leftIcon={<Save size={16} />}
            >
              Simpan Pengaturan
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AdminSettings;
