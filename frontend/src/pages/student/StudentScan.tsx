import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  CheckCircle2,
  XCircle,
  ArrowLeft,
  MapPin,
  ScanLine,
  Fingerprint,
  Camera,
  RotateCcw,
  Clock,
  Radio,
  Sparkles,
  ShieldAlert,
  AlertCircle,
  Check,
  Image as ImageIcon,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  getScanRequirements,
  scanAttendance,
  AttendanceResult,
} from "../../api/studentService";
import { verifyBiometric } from "../../api/webauthnService";
import { ApiRequestError } from "../../api/client";
import { formatWibTime } from "../../utils/date";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import StatusBadge from "../../components/StatusBadge";

type Phase = "idle" | "scanning" | "detected" | "verifying" | "camera" | "photo_preview" | "success" | "failed";

interface ScanRequirements {
  status: string;
  require_gps: boolean;
  require_photo: boolean;
  require_biometric: boolean;
  subject_name?: string;
}

const SCANNER_ID = "qr-reader";

export default function StudentScan() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [verifyingMsg, setVerifyingMsg] = useState<string>("Memeriksa kode QR...");
  const [requirements, setRequirements] = useState<ScanRequirements | null>(null);
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [failReason, setFailReason] = useState<{ title: string; message: string }>({
    title: "Presensi Gagal",
    message: "",
  });

  // Photo proof states if required
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const GALLERY_SCANNER_ID = "qr-gallery-reader";

  const pendingRef = useRef<{
    token: string;
    reqs: ScanRequirements;
    biometricToken?: string;
  } | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      stopAllCameras();
    };
  }, []);

  function stopAllCameras() {
    try {
      scannerRef.current?.stop().catch(() => {});
    } catch {}
    scannerRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  // --------------------------------------------------
  // START QR SCANNER
  // --------------------------------------------------
  async function startScanning() {
    setPhase("scanning");
    setPhotoBlob(null);
    setPhotoDataUrl(null);
    setFailReason({ title: "Presensi Gagal", message: "" });

    try {
      if (!window.isSecureContext) {
        throw new Error("Kamera memerlukan koneksi HTTPS yang aman.");
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Browser ini tidak mendukung fitur kamera.");
      }

      // Quick permission probe
      const testStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      testStream.getTracks().forEach((track) => track.stop());

      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        throw new Error("Tidak ada kamera yang terdeteksi pada perangkat ini.");
      }

      const backCamera =
        cameras.find((c) => c.label.toLowerCase().includes("back")) ||
        cameras.find((c) => c.label.toLowerCase().includes("rear")) ||
        cameras.find((c) => c.label.toLowerCase().includes("environment")) ||
        cameras[0];

      const scanner = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = scanner;

      await scanner.start(
        backCamera.id,
        {
          fps: 12,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1,
        },
        async (decodedText) => {
          // QR detected
          setPhase("detected");
          await scanner.stop().catch(() => {});
          scannerRef.current = null;
          await handleToken(decodedText);
        },
        () => {
          // scanning frames
        }
      );
    } catch (error: any) {
      console.error("QR CAMERA ERROR:", error);
      let message = "Kamera tidak dapat diakses.";
      if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
        message = "Izin kamera ditolak. Harap izinkan kamera di pengaturan browser Anda.";
      } else if (error?.name === "NotFoundError") {
        message = "Kamera tidak ditemukan pada perangkat Anda.";
      } else if (error?.message) {
        message = error.message;
      }
      setFailReason({ title: "Kamera Tidak Dapat Dibuka", message });
      setPhase("failed");
      stopAllCameras();
    }
  }

  // --------------------------------------------------
  // GALLERY QR SCANNER
  // --------------------------------------------------
  function triggerGallerySelect() {
    stopAllCameras();
    fileInputRef.current?.click();
  }

  async function handleGalleryScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input value so selecting the same file again triggers onChange
    e.target.value = "";

    stopAllCameras();
    setPhase("verifying");
    setVerifyingMsg("Membaca kode QR dari gambar...");
    setFailReason({ title: "Presensi Gagal", message: "" });

    try {
      const scanner = new Html5Qrcode(GALLERY_SCANNER_ID);
      const decodedText = await scanner.scanFile(file, false);
      await scanner.clear();
      await handleToken(decodedText);
    } catch (err: any) {
      console.error("Gallery QR scan error:", err);
      setFailReason({
        title: "QR Code Tidak Ditemukan",
        message:
          "Tidak dapat mendeteksi kode QR pada gambar yang dipilih. Pastikan gambar memuat QR code presensi yang jelas, fokus, dan tidak terpotong.",
      });
      setPhase("failed");
    }
  }

  // --------------------------------------------------
  // HANDLE DECODED QR TOKEN
  // --------------------------------------------------
  async function handleToken(token: string) {
    setPhase("verifying");
    setVerifyingMsg("Memvalidasi QR code & syarat presensi...");

    let reqs: ScanRequirements;
    try {
      reqs = await getScanRequirements(token);
      setRequirements(reqs);
    } catch (err: any) {
      const msg = err instanceof ApiRequestError ? err.friendlyMessage : "Kode QR ini tidak valid.";
      setFailReason({ title: "Kode QR Tidak Valid", message: msg });
      setPhase("failed");
      return;
    }

    // Check session timing
    if (reqs.status === "not_started") {
      setFailReason({
        title: "Sesi Belum Dimulai",
        message: "Sesi presensi untuk mata pelajaran ini belum dimulai oleh guru.",
      });
      setPhase("failed");
      return;
    }
    if (reqs.status === "expired") {
      setFailReason({
        title: "Sesi Telah Berakhir",
        message: "Sesi presensi ini telah ditutup atau sudah melewati batas waktu.",
      });
      setPhase("failed");
      return;
    }

    // Biometric WebAuthn check if required
    let biometricToken: string | undefined;
    if (reqs.require_biometric) {
      setVerifyingMsg("Memverifikasi biometrik (Fingerprint / Face ID)...");
      try {
        biometricToken = await verifyBiometric();
      } catch (err: any) {
        let msg = "Verifikasi biometrik gagal. Pastikan perangkat Anda sudah didaftarkan.";
        if (err instanceof ApiRequestError) {
          msg = err.friendlyMessage;
        } else if (
          err?.name === "NotFoundError" ||
          err?.message?.toLowerCase().includes("no passkey") ||
          err?.message?.toLowerCase().includes("credential")
        ) {
          msg =
            "Tidak ditemukan passkey atau biometrik yang cocok untuk domain ini.\n\nHal ini biasanya terjadi jika domain aplikasi berganti (misalnya URL tunnel baru). Silakan buka menu 'Pendaftaran Biometrik' lalu pilih 'Tautkan Ulang Biometrik'.";
        } else if (err?.name === "NotAllowedError") {
          msg = "Verifikasi biometrik dibatalkan oleh pengguna atau waktu habis.";
        } else if (err?.message) {
          msg = err.message;
        }
        setFailReason({ title: "Verifikasi Biometrik Gagal", message: msg });
        setPhase("failed");
        return;
      }
    }

    // Photo proof if required
    if (reqs.require_photo) {
      pendingRef.current = { token, reqs, biometricToken };
      setPhase("camera");
      await openFrontCamera();
      return;
    }

    // Finish attendance directly
    await finishAttendance(token, reqs, biometricToken, undefined);
  }

  // --------------------------------------------------
  // FRONT CAMERA FOR PHOTO PROOF
  // --------------------------------------------------
  async function openFrontCamera() {
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("Kamera tidak tersedia.");
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        await videoRef.current.play().catch(() => {});
      }
    } catch (error: any) {
      console.error("PHOTO CAMERA ERROR:", error);
      setFailReason({
        title: "Gagal Mengakses Kamera Depan",
        message: "Kamera depan untuk foto bukti kehadiran tidak dapat dibuka.",
      });
      setPhase("failed");
      stopAllCameras();
    }
  }

  function captureProofPhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror horizontally for natural selfie
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setPhotoBlob(blob);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setPhotoDataUrl(dataUrl);
        stopAllCameras();
        setPhase("photo_preview");
      },
      "image/jpeg",
      0.85
    );
  }

  function handleRetakeProofPhoto() {
    setPhotoBlob(null);
    setPhotoDataUrl(null);
    setPhase("camera");
    openFrontCamera();
  }

  async function handleConfirmProofPhoto() {
    const pending = pendingRef.current;
    if (!pending || !photoBlob) {
      setFailReason({
        title: "Data Presensi Hilang",
        message: "Informasi sesi presensi terputus. Silakan scan ulang.",
      });
      setPhase("failed");
      return;
    }

    setPhase("verifying");
    await finishAttendance(pending.token, pending.reqs, pending.biometricToken, photoBlob);
  }

  // --------------------------------------------------
  // FINISH ATTENDANCE SUBMISSION
  // --------------------------------------------------
  async function finishAttendance(
    token: string,
    reqs: ScanRequirements,
    biometricToken: string | undefined,
    photo: Blob | undefined
  ) {
    let latitude: number | undefined;
    let longitude: number | undefined;

    // GPS validation
    if (reqs.require_gps) {
      setVerifyingMsg("Memeriksa lokasi GPS Anda...");
      try {
        const position = await getGpsPosition();
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch (error) {
        console.error("GPS ERROR:", error);
        setFailReason({
          title: "Izin Lokasi Diperlukan",
          message: "Sesi ini mewajibkan validasi radius GPS sekolah. Aktifkan GPS dan izinkan lokasi pada browser.",
        });
        setPhase("failed");
        return;
      }
    }

    // Submit to server
    setVerifyingMsg("Mencatat presensi Anda ke sistem...");
    try {
      const data = await scanAttendance({
        token,
        latitude,
        longitude,
        biometricToken,
        photoBlob: photo,
      });

      setResult(data);
      setPhase("success");
    } catch (err: any) {
      console.error("Attendance submission error:", err);
      let title = "Presensi Gagal";
      let message = "Terjadi kesalahan saat memproses presensi.";
      if (err instanceof ApiRequestError) {
        message = err.friendlyMessage;
        if (err.code === "OUTSIDE_AREA") title = "Di Luar Area Sekolah";
        else if (err.code === "WRONG_CLASS") title = "Bukan Sesi Kelas Anda";
        else if (err.code === "ALREADY_RECORDED") title = "Sudah Absen Sebelumnya";
        else if (err.code === "SESSION_EXPIRED") title = "Sesi Telah Berakhir";
      } else if (err?.message) {
        message = err.message;
      }
      setFailReason({ title, message });
      setPhase("failed");
    }
  }

  function reset() {
    stopAllCameras();
    setPhase("idle");
    setResult(null);
    setFailReason({ title: "Presensi Gagal", message: "" });
    setRequirements(null);
    setPhotoBlob(null);
    setPhotoDataUrl(null);
    pendingRef.current = null;
  }

  function getGpsPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Perangkat tidak mendukung GPS."));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Back button & Alternative Attendance Link */}
      <div className="flex items-center justify-between">
        <Link
          to="/student"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Dashboard
        </Link>
        <Link to="/student/photo">
          <Button variant="ghost" size="sm" leftIcon={<Camera size={14} className="text-emerald-400" />}>
            Absen dengan Foto
          </Button>
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* 1. IDLE / WAITING STATE */}
      {/* ========================================================================= */}
      {phase === "idle" && (
        <Card className="p-7 sm:p-8 text-center space-y-6 border-slate-700">
          <div className="p-4 rounded-3xl bg-brand-500/10 text-brand-400 w-fit mx-auto border border-brand-500/20 shadow-glow">
            <ScanLine size={40} />
          </div>

          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Scan QR Presensi</h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Arahkan kamera smartphone ke kode QR yang ditampilkan di layar guru Anda.
            </p>
          </div>

          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl text-left space-y-2 text-xs text-slate-400">
            <p className="font-semibold text-slate-300">Pemberitahuan:</p>
            <ul className="space-y-1">
              <li className="flex items-center gap-2">
                <Check size={13} className="text-brand-400" /> Pastikan izin kamera browser telah aktif.
              </li>
              <li className="flex items-center gap-2">
                <Check size={13} className="text-brand-400" /> Beberapa sesi mungkin mewajibkan GPS atau foto selfie.
              </li>
            </ul>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={startScanning}
              leftIcon={<ScanLine size={18} />}
            >
              Buka Kamera & Mulai Scan
            </Button>

            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={triggerGallerySelect}
              leftIcon={<ImageIcon size={18} className="text-brand-400" />}
            >
              Pilih QR dari Galeri
            </Button>

            <Link to="/student/photo" className="block w-full">
              <Button
                variant="ghost"
                size="md"
                fullWidth
                leftIcon={<Camera size={16} className="text-brand-400" />}
              >
                Gunakan Metode "Absen dengan Foto"
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 2. SCANNING VIEWPORT */}
      {/* ========================================================================= */}
      {phase === "scanning" && (
        <Card className="p-4 sm:p-5 text-center space-y-4 border-brand-500/30">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
              <Radio size={14} className="animate-pulse" /> Memindai QR Code
            </span>
            <Button variant="ghost" size="sm" onClick={reset}>
              Batal
            </Button>
          </div>

          <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-700 shadow-2xl">
            <div id={SCANNER_ID} className="w-full aspect-square" />
            <div className="absolute inset-0 pointer-events-none border-2 border-brand-500/50 rounded-2xl m-8" />
          </div>

          <p className="text-xs text-slate-400">Posisikan kode QR di dalam kotak pemindai.</p>

          <div className="pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={triggerGallerySelect}
              leftIcon={<ImageIcon size={14} className="text-brand-400" />}
            >
              Atau Pilih dari Galeri
            </Button>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 3. QR DETECTED / VERIFYING */}
      {/* ========================================================================= */}
      {(phase === "detected" || phase === "verifying") && (
        <Card className="p-8 text-center space-y-5 border-brand-500/40">
          <div className="w-16 h-16 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center mx-auto animate-pulse">
            <Radio size={32} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Memverifikasi Presensi...</h3>
            <p className="text-xs text-slate-400 mt-1 font-mono text-brand-300 animate-pulse">
              {verifyingMsg}
            </p>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 4. CAMERA FOR MANDATORY PHOTO PROOF */}
      {/* ========================================================================= */}
      {phase === "camera" && (
        <Card className="p-5 text-center space-y-4">
          <CardHeader className="p-0 pb-3 border-none">
            <CardTitle>Ambil Foto Bukti Kehadiran</CardTitle>
            <CardDescription>Sesi ini mewajibkan foto selfie siswa.</CardDescription>
          </CardHeader>

          <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-w-xs mx-auto border border-slate-700">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-[75%] h-[80%] rounded-[50%] border-2 border-dashed border-white/60" />
            </div>
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={captureProofPhoto}
            leftIcon={<Camera size={18} />}
          >
            Ambil Foto
          </Button>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 5. PHOTO PROOF PREVIEW & CONFIRM */}
      {/* ========================================================================= */}
      {phase === "photo_preview" && photoDataUrl && (
        <Card className="p-5 text-center space-y-4">
          <CardHeader className="p-0 pb-3 border-none">
            <CardTitle>Tinjau Foto Kehadiran</CardTitle>
            <CardDescription>Pastikan wajah terlihat jelas.</CardDescription>
          </CardHeader>

          <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-w-xs mx-auto border border-slate-700">
            <img src={photoDataUrl} alt="Bukti Kehadiran" className="w-full h-full object-cover" />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button variant="secondary" size="md" onClick={handleRetakeProofPhoto} leftIcon={<RotateCcw size={16} />}>
              Ambil Ulang
            </Button>
            <Button variant="primary" size="md" onClick={handleConfirmProofPhoto} leftIcon={<Check size={16} />}>
              Gunakan Foto
            </Button>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 6. SUCCESS RESULT (SECTION 7 COMPLIANT) */}
      {/* ========================================================================= */}
      {phase === "success" && result && (
        <Card className="p-7 sm:p-8 text-center border-emerald-500/40 shadow-emerald-500/10 space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <CheckCircle2 size={36} />
          </div>

          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-emerald-400">
              Presensi Berhasil Dicatat
            </span>
            <h2 className="text-2xl font-black text-white mt-1">{result.subject_name}</h2>
            {result.class_name && <p className="text-sm text-slate-400 mt-0.5">{result.class_name}</p>}
          </div>

          {/* Details */}
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
                <ScanLine size={12} /> Scan QR Code
              </span>
            </div>

            {result.location_verified !== null && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Lokasi GPS</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Check size={12} /> Di Dalam Area Sekolah
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
                Presensi Anda tercatat sebagai <strong>TERLAMBAT</strong> karena melewati ambang toleransi waktu.
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
      {/* 7. FAILURE STATE (SECTION 8 COMPLIANT) */}
      {/* ========================================================================= */}
      {phase === "failed" && (
        <Card className="p-7 sm:p-8 text-center border-rose-500/40 shadow-rose-500/10 space-y-5">
          <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20">
            <XCircle size={36} />
          </div>

          <div>
            <h2 className="text-2xl font-black text-white">{failReason.title}</h2>
            <p className="text-sm text-slate-300 mt-2 max-w-sm mx-auto whitespace-pre-line leading-relaxed">
              {failReason.message}
            </p>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            {failReason.title.toLowerCase().includes("biometrik") && (
              <Link to="/student/biometric" className="w-full">
                <Button variant="primary" fullWidth leftIcon={<Fingerprint size={16} />}>
                  Buka Menu Pendaftaran Biometrik
                </Button>
              </Link>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5">
              <Button variant="secondary" fullWidth onClick={reset} leftIcon={<RotateCcw size={16} />}>
                Coba Lagi
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={triggerGallerySelect}
                leftIcon={<ImageIcon size={16} className="text-brand-400" />}
              >
                Pilih dari Galeri
              </Button>
            </div>

            <Link to="/student" className="w-full">
              <Button variant="outline" fullWidth>
                Ke Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Hidden elements for gallery QR scanning */}
      <div id={GALLERY_SCANNER_ID} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleGalleryScan}
      />
    </div>
  );
}
