import React, { useState } from "react";
import { 
  HelpCircle, QrCode, MapPin, Camera, FileCheck, 
  ShieldCheck, Search, ChevronDown, ExternalLink, LifeBuoy, ArrowRight 
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

interface FAQItem {
  question: string;
  category: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    category: "GPS & Lokasi",
    question: "Mengapa lokasi GPS saya ditolak atau dinyatakan di luar radius sekolah?",
    answer: "Aplikasi SKAGATA Attendance mewajibkan presensi berada dalam radius resmi SMKN 3 Yogyakarta (default 150 meter dari titik koordinat sekolah). Pastikan: 1) Fitur 'Lokasi / Location' di HP Anda aktif, 2) Mode akurasi lokasi diatur ke 'Tinggi / High Accuracy' (bukan hemat daya), 3) Berikan izin akses lokasi (Allow) saat browser meminta izin. Jika Anda menggunakan laptop/PC tanpa GPS hardware, browser menggunakan perkiraan IP provider yang seringkali melenceng.",
  },
  {
    category: "QR & Kamera",
    question: "Kamera tidak terbuka saat ingin scan QR atau mengambil foto kehadiran?",
    answer: "Pastikan Anda memberikan izin kamera pada peramban web (Chrome, Edge, Safari). Jika sebelumnya menolak (Block), buka Pengaturan Browser > Pengaturan Situs (Site Settings) > Kamera > Izinkan untuk situs ini. Pastikan juga tidak ada aplikasi lain yang sedang mengunci kamera.",
  },
  {
    category: "Presensi & Sesi",
    question: "Sesi presensi berstatus 'Expired' / Waktu Habis?",
    answer: "Setiap sesi presensi dibuka oleh guru pengampu sesuai jadwal jam pelajaran. Jika sesi telah melewati batas waktu toleransi yang ditentukan guru, Anda tidak dapat lagi melakukan check-in mandiri. Segera hubungi guru pengampu atau ajukan 'Koreksi Presensi' disertai alasan yang jelas.",
  },
  {
    category: "Koreksi Presensi",
    question: "Kapan saya boleh mengajukan Koreksi Presensi?",
    answer: "Koreksi presensi ditujukan bagi siswa yang mengalami kendala teknis saat sesi berlangsung (misal HP mati, GPS error di kelas) atau memiliki surat keterangan resmi (Surat Dokter, Dispensasi Lomba, Surat Izin Orang Tua). Pengajuan akan diverifikasi oleh guru pengampu atau admin.",
  },
  {
    category: "Akun & Keamanan",
    question: "Bagaimana cara mengganti kata sandi atau memperbarui foto profil?",
    answer: "Buka menu 'Profil & Pengaturan' di pojok kanan atas atau sidebar. Di sana Anda dapat mengunggah foto avatar formal dan memperbarui kata sandi dengan verifikasi kata sandi lama.",
  },
  {
    category: "Biometrik",
    question: "Apakah saya wajib mengaktifkan biometrik (Face ID / Fingerprint)?",
    answer: "Biometrik (WebAuthn) mempermudah login dan verifikasi kehadiran tanpa repot memasukkan kata sandi setiap saat. Fitur ini dapat diaktifkan di menu 'Biometrik' pada perangkat yang memiliki sensor sidik jari atau Face Unlock yang didukung browser.",
  },
];

export const HelpCenterPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const categories = ["ALL", "GPS & Lokasi", "QR & Kamera", "Presensi & Sesi", "Koreksi Presensi", "Akun & Keamanan", "Biometrik"];

  const filteredFaqs = FAQS.filter((faq) => {
    const matchCat = selectedCategory === "ALL" || faq.category === selectedCategory;
    const matchSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Hero Banner */}
      <div className="text-center py-6 px-4 rounded-3xl bg-gradient-to-b from-brand-50 to-transparent dark:from-brand-950/40 dark:to-transparent border border-brand-100 dark:border-brand-900/40">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-600/30">
          <HelpCircle size={32} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Pusat Bantuan & Panduan Sistem
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xl mx-auto">
          Temukan jawaban atas kendala teknis presensi, panduan penggunaan fitur, serta panduan verifikasi GPS & Kamera di SMKN 3 Yogyakarta.
        </p>

        {/* Search Input */}
        <div className="relative max-w-xl mx-auto mt-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Cari pertanyaan, kendala GPS, kamera, atau presensi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
          />
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
            <MapPin size={22} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Geofence SMKN 3 Yogya</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Radius aman presensi 150m di koordinat -7.777500, 110.365900.
            </p>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Camera size={22} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Verifikasi Foto Wajah</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Pastikan wajah terlihat jelas tanpa masker dan di tempat cukup cahaya.
            </p>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 shrink-0">
            <LifeBuoy size={22} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Tiket Bantuan</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Kirim laporan langsung ke administrator jika butuh penanganan khusus.
            </p>
          </div>
        </Card>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? "bg-brand-600 text-white shadow-md shadow-brand-600/20"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {cat === "ALL" ? "Semua Kategori" : cat}
          </button>
        ))}
      </div>

      {/* Accordion FAQ List */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <Card className="p-8 text-center bg-white dark:bg-slate-900">
            <p className="text-sm text-slate-500">Tidak ada pertanyaan yang sesuai dengan pencarian Anda.</p>
          </Card>
        ) : (
          filteredFaqs.map((faq, idx) => {
            const isExpanded = expandedIndex === idx;
            return (
              <Card
                key={idx}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="space-y-1 pr-2">
                    <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                      {faq.category}
                    </span>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      {faq.question}
                    </h2>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                      isExpanded ? "rotate-180 text-brand-600" : ""
                    }`}
                  />
                </button>

                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 pt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800">
                    {faq.answer}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Need More Help Footer Card */}
      <Card className="p-6 bg-gradient-to-r from-brand-600 to-brand-700 text-white border-0 shadow-xl shadow-brand-600/15 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h2 className="text-lg font-bold">Masih Mengalami Kendala?</h2>
          <p className="text-xs sm:text-sm text-brand-100 max-w-md">
            Buka tiket laporan kendala di Support Desk agar staf kami dapat memeriksa histori presensi akun Anda secara langsung.
          </p>
        </div>

        <Link to="/support">
          <Button
            variant="secondary"
            className="bg-white text-brand-700 hover:bg-brand-50 border-0 font-bold shrink-0 shadow-md"
            rightIcon={<ArrowRight size={16} />}
          >
            Buka Tiket Pengaduan
          </Button>
        </Link>
      </Card>
    </div>
  );
};

export default HelpCenterPage;
