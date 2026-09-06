import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Camera,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RotateCcw,
  MapPin,
  Fingerprint,
  Radio,
  Clock,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  SwitchCamera,
  Check,
} from "lucide-react";
import { getStudentActiveSessions, photoAttendance, AttendanceResult } from "../../api/studentService";
import { verifyBiometric } from "../../api/webauthnService";
import { ApiRequestError } from "../../api/client";
import { formatWibTime } from "../../utils/date";
import { ActiveSessionItem } from "../../types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import StatusBadge from "../../components/StatusBadge";
import { Skeleton } from "../../components/ui/Skeleton";

type FlowStep = "select_session" | "camera" | "preview" | "submitting" | "success" | "failed";

export default function StudentPhotoAttendance() {
  const [step, setStep] = useState<FlowStep>("select_session");
  const [sessions, setSessions] = useState<ActiveSessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [selectedSession, setSelectedSession] = useState<ActiveSessionItem | null>(null);

  // Camera states
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Validation / Submission progress
  const [submittingStep, setSubmittingStep] = useState<string>("");
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [failError, setFailError] = useState<{ title: string; message: string }>({
    title: "",
    message: "",
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const navigate = useNavigate();

  // Load active sessions on mount
  function loadSessions() {
    setLoadingSessions(true);
    getStudentActiveSessions()
      .then((res) => {
        setSessions(res.sessions || []);
        // If there is only one active, un-attended session, auto select it
        const validSessions = (res.sessions || []).filter(
          (s) => s.status === "active" && !s.has_checked_in
        );
        if (validSessions.length === 1) {
          setSelectedSession(validSessions[0]);
        }
      })
      .catch((e) => {
        console.error("Failed to load active sessions:", e);
      })
      .finally(() => setLoadingSessions(false));
  }

  useEffect(() => {
    loadSessions();
  }, []);

  // Camera cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function startCamera(desiredFacing: "user" | "environment" = facingMode) {
    stopCamera();
    setCameraError(null);

    try {
      if (!window.isSecureContext) {
        throw new Error("Kamera memerlukan koneksi aman (HTTPS).");
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Browser ini tidak mendukung fitur kamera.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: desiredFacing,
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraStream(stream);
      setFacingMode(desiredFacing);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      let msg = "Kamera tidak dapat diakses.";
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        msg = "Izin kamera ditolak. Harap izinkan akses kamera di pengaturan browser Anda.";
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        msg = "Kamera tidak ditemukan pada perangkat Anda.";
      } else if (err?.name === "NotReadableError" || err?.name === "TrackStartError") {
        msg = "Kamera sedang digunakan oleh aplikasi lain.";
      } else if (err?.message) {
        msg = err.message;
      }
      setCameraError(msg);
    }
  }

  function toggleCamera() {
    const nextFacing = facingMode === "user" ? "environment" : "user";
    startCamera(nextFacing);
  }

  function handleChooseSession(session: ActiveSessionItem) {
    setSelectedSession(session);
    setStep("camera");
    startCamera("user");
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError("Kamera sedang bersiap. Harap tunggu sebentar lalu coba lagi.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // If front camera, mirror horizontally for natural selfie preview
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError("Gagal mengambil foto. Silakan ulangi.");
          return;
        }
        setPhotoBlob(blob);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        setPhotoDataUrl(dataUrl);
        stopCamera();
        setStep("preview");
      },
      "image/jpeg",
      0.85
    );
  }

  function handleRetake() {
    setPhotoBlob(null);
    setPhotoDataUrl(null);
    setStep("camera");
    startCamera(facingMode);
  }

  async function handleConfirmAndSubmit() {
    if (!selectedSession || !photoBlob) return;

    setStep("submitting");
    setSubmittingStep("Menyiapkan data presensi...");

    let latitude: number | undefined;
    let longitude: number | undefined;
    let biometricToken: string | undefined;

    try {
      // 1. GPS Validation if required
      if (selectedSession.require_gps) {
        setSubmittingStep("Memverifikasi koordinat lokasi GPS...");
        try {
          const position = await getCurrentGpsPosition();
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } catch (gpsErr: any) {
          throw new ApiRequestError(
            "LOCATION_REQUIRED",
            "Izin lokasi GPS diperlukan untuk sesi ini. Pastikan GPS aktif dan izin lokasi diizinkan di browser."
          );
        }
      }

      // 2. Biometric Verification if required
      if (selectedSession.require_biometric) {
        setSubmittingStep("Memverifikasi biometrik (Fingerprint / Face ID)...");
        try {
          biometricToken = await verifyBiometric();
        } catch (bioErr: any) {
          throw new ApiRequestError(
            "BIOMETRIC_VERIFICATION_FAILED",
            "Verifikasi biometrik gagal atau dibatalkan. Pastikan perangkat Anda sudah didaftarkan."
          );
        }
      }

      // 3. Submit to server
      setSubmittingStep("Mengirim presensi dan bukti foto ke server...");
      const res = await photoAttendance({
        sessionId: selectedSession.id,
        photoBlob,
        latitude,
        longitude,
        biometricToken,
      });

      setResult(res);
      setStep("success");
    } catch (err: any) {
      console.error("Attendance submission error:", err);
      let title = "Presensi Gagal";
      let message = "Terjadi kesalahan saat mencatat presensi. Silakan coba lagi.";

      if (err instanceof ApiRequestError) {
        message = err.friendlyMessage;
        if (err.code === "OUTSIDE_AREA") {
          title = "Di Luar Area Sekolah";
        } else if (err.code === "WRONG_CLASS") {
          title = "Kelas Tidak Sesuai";
        } else if (err.code === "ALREADY_RECORDED") {
          title = "Sudah Melakukan Presensi";
        } else if (err.code === "SESSION_EXPIRED") {
          title = "Sesi Telah Berakhir";
        } else if (err.code === "BIOMETRIC_VERIFICATION_FAILED") {
          title = "Verifikasi Biometrik Gagal";
        }
      } else if (err?.message) {
        message = err.message;
      }

      setFailError({ title, message });
      setStep("failed");
    }
  }

  function resetAll() {
    stopCamera();
    setStep("select_session");
    setSelectedSession(null);
    setPhotoBlob(null);
    setPhotoDataUrl(null);
    setResult(null);
    setCameraError(null);
    loadSessions();
  }

  // Helper for GPS coordinates
  function getCurrentGpsPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Perangkat ini tidak mendukung GPS Geolocation."));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      });
    });
  }

  const activeValidSessions = sessions.filter(
    (s) => s.status === "active" && !s.has_checked_in
  );

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Back Button */}
      <Link
        to="/student"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} /> Kembali ke Dashboard
      </Link>

      {/* ========================================================================= */}
      {/* STEP 1: SELECT ACTIVE SESSION */}
      {/* ========================================================================= */}
      {step === "select_session" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <Camera className="text-brand-400" size={24} /> Absen dengan Foto
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Pilih sesi kelas yang sedang aktif untuk melakukan presensi selfie.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadSessions}
              leftIcon={<RefreshCw size={14} className={loadingSessions ? "animate-spin" : ""} />}
            >
              Segarkan
            </Button>
          </div>

          {loadingSessions ? (
            <div className="space-y-3">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ) : activeValidSessions.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Clock size={24} />
              </div>
              <h3 className="font-bold text-white text-base">Tidak Ada Sesi Presensi Aktif</h3>
              <p className="text-sm text-slate-400 mt-1.5 max-w-sm mx-auto">
                Belum ada sesi presensi aktif untuk kelas Anda saat ini, atau Anda sudah melakukan presensi pada sesi hari ini.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center">
                <Button variant="secondary" onClick={loadSessions} leftIcon={<RefreshCw size={16} />}>
                  Cek Ulang
                </Button>
                <Link to="/student" className="w-full sm:w-auto">
                  <Button variant="outline" fullWidth>
                    Kembali ke Dashboard
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Sesi Aktif Tersedia ({activeValidSessions.length})
              </p>
              {activeValidSessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleChooseSession(s)}
                  className="group relative cursor-pointer rounded-2xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/80 hover:border-brand-500/50 p-5 transition-all duration-150 shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                          Sesi Aktif
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-white mt-1 group-hover:text-brand-300 transition-colors">
                        {s.subject_name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {s.class_name} • {s.teacher_name || "Guru Pengampu"}
                      </p>
                    </div>
                    <span className="text-xs font-mono bg-slate-800 px-2.5 py-1 rounded-lg text-slate-300 border border-slate-700">
                      {s.start_time} – {s.end_time}
                    </span>
                  </div>

                  {/* Requirements chips */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {s.require_gps && (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-slate-800 px-2 py-0.5 rounded-md text-slate-300 border border-slate-700">
                          <MapPin size={12} className="text-amber-400" /> GPS Radius
                        </span>
                      )}
                      {s.require_biometric && (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-slate-800 px-2 py-0.5 rounded-md text-slate-300 border border-slate-700">
                          <Fingerprint size={12} className="text-brand-400" /> Biometrik
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[11px] bg-slate-800 px-2 py-0.5 rounded-md text-slate-300 border border-slate-700">
                        <Camera size={12} className="text-emerald-400" /> Bukti Foto
                      </span>
                    </div>

                    <Button size="sm" variant="primary" rightIcon={<Camera size={14} />}>
                      Pilih Sesi
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: CAMERA CAPTURE */}
      {/* ========================================================================= */}
      {step === "camera" && selectedSession && (
        <Card className="overflow-hidden border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Ambil Foto Presensi</CardTitle>
                <CardDescription>
                  {selectedSession.subject_name} ({selectedSession.class_name})
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep("select_session")}>
                Ganti Sesi
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {cameraError ? (
              <div className="p-6 text-center space-y-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                <AlertTriangle className="mx-auto text-rose-400" size={36} />
                <h4 className="font-bold text-white">Tidak Dapat Mengakses Kamera</h4>
                <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{cameraError}</p>
                <Button variant="secondary" size="sm" onClick={() => startCamera(facingMode)}>
                  Coba Akses Lagi
                </Button>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-w-sm mx-auto shadow-inner">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />

                {/* Face Guide Oval Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-[72%] h-[78%] rounded-[50%] border-2 border-dashed border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                </div>

                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                  <span className="text-[11px] bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-white font-medium">
                    Posisikan wajah di dalam bingkai
                  </span>
                  <button
                    type="button"
                    onClick={toggleCamera}
                    aria-label="Putar kamera"
                    className="pointer-events-auto p-2 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition-colors"
                  >
                    <SwitchCamera size={18} />
                  </button>
                </div>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />

            {!cameraError && (
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={capturePhoto}
                  leftIcon={<Camera size={20} />}
                >
                  Ambil Foto Sekarang
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: PREVIEW & CONFIRM */}
      {/* ========================================================================= */}
      {step === "preview" && photoDataUrl && selectedSession && (
        <Card className="overflow-hidden border-slate-700">
          <CardHeader>
            <CardTitle>Tinjau Foto Presensi</CardTitle>
            <CardDescription>
              Pastikan wajah terlihat jelas dan pencahayaan memadai sebelum mengirim.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-w-sm mx-auto border border-slate-700/80 shadow-2xl">
              <img
                src={photoDataUrl}
                alt="Preview Presensi"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-3 right-3 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl text-center">
                <p className="text-xs text-slate-200 font-medium truncate">
                  {selectedSession.subject_name} • {selectedSession.class_name}
                </p>
              </div>
            </div>

            {/* Session Requirements Notice */}
            <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-1.5 text-xs text-slate-300">
              <p className="font-semibold text-white">Validasi yang akan dijalankan:</p>
              <ul className="space-y-1 text-slate-400">
                <li className="flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-400" /> Foto bukti kehadiran terlampir
                </li>
                {selectedSession.require_gps && (
                  <li className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-amber-400" /> Validasi radius GPS sekolah
                  </li>
                )}
                {selectedSession.require_biometric && (
                  <li className="flex items-center gap-1.5">
                    <Fingerprint size={14} className="text-brand-400" /> Verifikasi biometrik (Fingerprint/Face ID)
                  </li>
                )}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={handleRetake}
                leftIcon={<RotateCcw size={16} />}
              >
                Ambil Ulang
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleConfirmAndSubmit}
                leftIcon={<Check size={16} />}
              >
                Gunakan Foto
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: SUBMITTING / PROGRESS */}
      {/* ========================================================================= */}
      {step === "submitting" && (
        <Card className="p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center mx-auto animate-pulse">
            <Radio size={32} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Memproses Presensi...</h3>
            <p className="text-xs text-slate-400 mt-1">Harap jangan menutup halaman ini.</p>
          </div>

          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl text-left max-w-sm mx-auto">
            <p className="text-xs font-semibold text-brand-300 font-mono animate-pulse flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-400 animate-ping" />
              {submittingStep}
            </p>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* STEP 5: SUCCESS RESULT */}
      {/* ========================================================================= */}
      {step === "success" && result && selectedSession && (
        <Card className="p-6 sm:p-8 text-center border-emerald-500/40 shadow-emerald-500/10 space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <CheckCircle2 size={36} />
          </div>

          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-emerald-400">
              Presensi Berhasil
            </span>
            <h2 className="text-2xl font-black text-white mt-1">{result.subject_name}</h2>
            <p className="text-sm text-slate-400 mt-0.5">{selectedSession.class_name}</p>
          </div>

          {/* Details Box */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-left space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <span className="text-xs text-slate-400">Status Kehadiran</span>
              <StatusBadge status={result.status} />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Nama Siswa</span>
              <span className="font-semibold text-white">{result.student_name}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Waktu Presensi</span>
              <span className="font-mono text-white">
                {new Date(result.checked_in_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {formatWibTime(result.checked_in_at)} WIB
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Metode</span>
              <span className="font-medium text-brand-300 flex items-center gap-1">
                <Camera size={12} /> Absen Foto
              </span>
            </div>

            {result.location_verified !== null && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Lokasi GPS</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Check size={12} /> Terverifikasi Area Sekolah
                </span>
              </div>
            )}

            {result.biometric_verified && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Biometrik</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Check size={12} /> Fingerprint / Face ID Valid
                </span>
              </div>
            )}
          </div>

          {result.status === "late" && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left flex items-start gap-2.5">
              <Clock size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300 leading-relaxed">
                Presensi Anda tercatat sebagai <strong>TERLAMBAT</strong> karena melewati batas toleransi
                waktu yang ditentukan guru ({selectedSession.late_threshold_minutes} menit).
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <Link to="/student" className="w-full">
              <Button variant="primary" fullWidth>
                Kembali ke Dashboard
              </Button>
            </Link>
            <Link to="/student/history" className="w-full">
              <Button variant="outline" fullWidth>
                Lihat Riwayat
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* STEP 6: FAILED RESULT */}
      {/* ========================================================================= */}
      {step === "failed" && (
        <Card className="p-6 sm:p-8 text-center border-rose-500/40 shadow-rose-500/10 space-y-5">
          <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20">
            <XCircle size={36} />
          </div>

          <div>
            <h2 className="text-2xl font-black text-white">{failError.title || "Presensi Gagal"}</h2>
            <p className="text-sm text-slate-300 mt-2 max-w-sm mx-auto whitespace-pre-line leading-relaxed">
              {failError.message}
            </p>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 text-left">
            <p className="font-semibold text-slate-300 mb-1">Tips penyelesaian:</p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-400">
              <li>Pastikan Anda berada di lingkungan area sekolah jika GPS diaktifkan.</li>
              <li>Pastikan koneksi internet stabil dan izin perangkat telah diberikan.</li>
              <li>Jika kendala berlanjut, hubungi guru mata pelajaran Anda.</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <Button variant="secondary" fullWidth onClick={resetAll} leftIcon={<RotateCcw size={16} />}>
              Coba Lagi
            </Button>
            <Link to="/student" className="w-full">
              <Button variant="outline" fullWidth>
                Ke Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

