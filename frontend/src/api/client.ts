import axios, { AxiosError } from "axios";
import type { ApiEnvelope } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const client = axios.create({
  baseURL: API_URL,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("skagata_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If token expired, clear authentication
      const isAuthRoute = error.config?.url?.includes("/api/auth/");
      if (!isAuthRoute && localStorage.getItem("skagata_token")) {
        localStorage.removeItem("skagata_token");
        localStorage.removeItem("skagata_role");
        localStorage.removeItem("skagata_name");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export const ERROR_MESSAGES: Record<string, string> = {
  WRONG_CLASS: "Sesi presensi ini bukan untuk kelas Anda.",
  OUTSIDE_AREA: "Anda berada di luar area sekolah. Presensi hanya dapat dilakukan di dalam radius sekolah.",
  SESSION_EXPIRED: "Sesi presensi telah berakhir.",
  SESSION_NOT_STARTED: "Sesi presensi belum dimulai.",
  ALREADY_RECORDED: "Anda sudah melakukan presensi pada sesi ini.",
  BIOMETRIC_REQUIRED: "Verifikasi biometrik (Fingerprint / Face ID) diperlukan untuk sesi ini.",
  BIOMETRIC_VERIFICATION_FAILED: "Verifikasi biometrik gagal atau dibatalkan. Pastikan perangkat Anda sudah didaftarkan.",
  PHOTO_REQUIRED: "Foto bukti kehadiran wajib diambil untuk sesi ini.",
  LOCATION_REQUIRED: "Izin lokasi diperlukan. Harap aktifkan GPS dan izinkan browser mengakses lokasi.",
  RATE_LIMITED: "Terlalu banyak percobaan dalam waktu singkat. Harap tunggu sebentar lalu coba lagi.",
  INVALID_TOKEN: "Kode QR tidak valid atau sudah kedaluwarsa.",
  NOT_ENROLLED: "Perangkat ini belum terdaftar untuk biometrik. Silakan daftarkan di menu Fingerprint/Face ID.",
  STUDENT_PROFILE_MISSING: "Profil siswa tidak ditemukan pada akun ini.",
  NETWORK_ERROR: "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
  UNAUTHORIZED: "Sesi login Anda telah berakhir. Silakan login kembali.",
  FORBIDDEN: "Anda tidak memiliki izin untuk mengakses fitur ini.",
};

export function getFriendlyErrorMessage(code: string, fallbackMessage?: string): string {
  return ERROR_MESSAGES[code] || fallbackMessage || "Terjadi kesalahan. Silakan coba lagi.";
}

export class ApiRequestError extends Error {
  code: string;
  status?: number;
  friendlyMessage: string;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.friendlyMessage = getFriendlyErrorMessage(code, message);
  }
}

/** Unwraps the {success,data,error} envelope and throws a friendly error on failure. */
export async function apiCall<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  try {
    const res = await promise;
    if (!res.data.success || res.data.data === null) {
      throw new ApiRequestError(
        res.data.error?.code || "UNKNOWN_ERROR",
        res.data.error?.message || "Something went wrong."
      );
    }
    return res.data.data;
  } catch (err) {
    if (err instanceof ApiRequestError) throw err;
    const axiosErr = err as AxiosError<ApiEnvelope<T>>;
    const envelope = axiosErr.response?.data;
    if (envelope?.error) {
      throw new ApiRequestError(envelope.error.code, envelope.error.message, axiosErr.response?.status);
    }
    throw new ApiRequestError("NETWORK_ERROR", "Could not reach the server. Please check your connection.");
  }
}
