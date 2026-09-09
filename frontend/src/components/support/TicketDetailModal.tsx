import React, { useState, useEffect, useRef } from "react";
import { 
  X, Send, Paperclip, Clock, User, Shield, AlertCircle, 
  CheckCircle2, RefreshCw, Trash2, RotateCcw, FileText, Download, ExternalLink 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import type { SupportTicket, TicketMessage, TicketStatus, TicketPriority } from "../../types";
import { 
  sendTicketMessage, updateTicketStatus, updateTicketPriority, 
  deleteTicket, restoreTicket, getTicket, getAttachmentUrl,
  clearTicketMessages, deleteTicketMessage 
} from "../../api/supportService";
import { formatWibDateTime, formatWibTimeWithSuffix } from "../../utils/date";
import { Button } from "../ui/Button";

interface TicketDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: number | null;
  currentUserId?: number;
  currentUserRole?: string;
  onTicketUpdated?: () => void;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  isOpen,
  onClose,
  ticketId,
  currentUserId,
  currentUserRole,
  onTicketUpdated,
}) => {
  const auth = useAuth();
  const activeUserId = currentUserId ?? auth.userId ?? undefined;
  const activeUserRole = currentUserRole ?? auth.role ?? undefined;

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyAttachment, setReplyAttachment] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canManageStatus = activeUserRole === "admin" || activeUserRole === "teacher";
  const isTicketOwner = !!(ticket && activeUserId && ticket.user_id === activeUserId);
  const canDeleteTicket = canManageStatus || isTicketOwner;
  const canClearHistory = activeUserRole === "admin" || isTicketOwner;

  const fetchTicket = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTicket(id);
      setTicket(data);
    } catch (err: any) {
      setError(err?.message || "Gagal memuat detail tiket.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && ticketId) {
      fetchTicket(ticketId);
    } else {
      setTicket(null);
      setReplyText("");
      setReplyAttachment(null);
      setError(null);
    }
  }, [isOpen, ticketId]);

  // Keyboard Escape listener to safely close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Scroll only the chat container without moving the whole window or modal
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [ticket?.messages]);

  if (!isOpen) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || (!replyText.trim() && !replyAttachment)) return;

    setSending(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("message", replyText.trim());
      if (replyAttachment) {
        formData.append("attachment", replyAttachment);
      }
      const updated = await sendTicketMessage(ticket.id, formData);
      setTicket(updated);
      setReplyText("");
      setReplyAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onTicketUpdated?.();
    } catch (err: any) {
      setError(err?.message || "Gagal mengirim pesan.");
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!ticket) return;
    setUpdating(true);
    try {
      const updated = await updateTicketStatus(ticket.id, newStatus);
      setTicket(updated);
      onTicketUpdated?.();
    } catch (err: any) {
      setError(err?.message || "Gagal memperbarui status tiket.");
    } finally {
      setUpdating(false);
    }
  };

  const handlePriorityChange = async (newPriority: TicketPriority) => {
    if (!ticket) return;
    setUpdating(true);
    try {
      const updated = await updateTicketPriority(ticket.id, newPriority);
      setTicket(updated);
      onTicketUpdated?.();
    } catch (err: any) {
      setError(err?.message || "Gagal memperbarui prioritas.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!ticket || !window.confirm("Yakin ingin menghapus tiket ini (soft delete)?")) return;
    setUpdating(true);
    try {
      await deleteTicket(ticket.id);
      onTicketUpdated?.();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Gagal menghapus tiket.");
    } finally {
      setUpdating(false);
    }
  };

  const handleRestore = async () => {
    if (!ticket || !window.confirm("Pulihkan tiket ini kembali aktif?")) return;
    setUpdating(true);
    try {
      await restoreTicket(ticket.id);
      fetchTicket(ticket.id);
      onTicketUpdated?.();
    } catch (err: any) {
      setError(err?.message || "Gagal memulihkan tiket.");
    } finally {
      setUpdating(false);
    }
  };

  const handleClearMessages = async () => {
    if (!ticket) return;
    const confirmed = window.confirm(
      "Apakah Anda yakin ingin menghapus seluruh riwayat chat balasan pada tiket ini?\n\nKendala awal pelapor akan tetap tersimpan."
    );
    if (!confirmed) return;

    setUpdating(true);
    setError(null);
    try {
      const updated = await clearTicketMessages(ticket.id);
      setTicket(updated);
      onTicketUpdated?.();
    } catch (err: any) {
      setError(err?.message || "Gagal menghapus riwayat chat.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!ticket) return;
    if (!window.confirm("Yakin ingin menghapus pesan ini?")) return;

    setUpdating(true);
    setError(null);
    try {
      const updated = await deleteTicketMessage(ticket.id, messageId);
      setTicket(updated);
      onTicketUpdated?.();
    } catch (err: any) {
      setError(err?.message || "Gagal menghapus pesan.");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    const map: Record<TicketStatus, { label: string; bg: string; text: string }> = {
      OPEN: { label: "Terbuka", bg: "bg-blue-100 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300" },
      IN_PROGRESS: { label: "Diproses", bg: "bg-amber-100 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-300" },
      WAITING_FOR_USER: { label: "Menunggu Pengguna", bg: "bg-purple-100 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800", text: "text-purple-700 dark:text-purple-300" },
      RESOLVED: { label: "Selesai", bg: "bg-emerald-100 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300" },
      CLOSED: { label: "Ditutup", bg: "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700", text: "text-slate-600 dark:text-slate-400" },
    };
    const conf = map[status] || map.OPEN;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${conf.bg} ${conf.text}`}>
        {conf.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: TicketPriority) => {
    const map: Record<TicketPriority, { label: string; color: string }> = {
      LOW: { label: "Rendah", color: "text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700" },
      MEDIUM: { label: "Sedang", color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800" },
      HIGH: { label: "Tinggi (Mendesak)", color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800" },
    };
    const conf = map[priority] || map.MEDIUM;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${conf.color}`}>
        {conf.label}
      </span>
    );
  };

  const isImageAttachment = (path?: string | null) => {
    if (!path) return false;
    const clean = path.split("?")[0].toLowerCase();
    return clean.endsWith(".jpg") || clean.endsWith(".jpeg") || clean.endsWith(".png") || clean.endsWith(".webp") || clean.endsWith(".gif");
  };

  const initialMessage = ticket?.messages && ticket.messages.length > 0 ? ticket.messages[0] : null;
  const replyMessages = ticket?.messages && ticket.messages.length > 1 ? ticket.messages.slice(1) : [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden flex items-start sm:items-center justify-center p-2 sm:p-4">
      {/* Backdrop - Click to Close */}
      <div 
        className="fixed inset-0 bg-slate-900/70 dark:bg-black/80 backdrop-blur-sm transition-opacity cursor-pointer"
        onClick={onClose}
        aria-label="Tutup modal"
      />

      {/* Modal Container */}
      <div 
        className="relative w-full max-w-4xl h-[92vh] sm:h-[86vh] max-h-[850px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col z-10 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="min-w-0 pr-3 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-2 py-0.5 rounded border border-brand-200 dark:border-brand-800">
                {ticket?.ticket_number || "MEMUAT..."}
              </span>
              {ticket && getStatusBadge(ticket.status)}
              {ticket && getPriorityBadge(ticket.priority)}
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium truncate max-w-[130px] sm:max-w-none">
                {ticket?.category}
              </span>
              {ticket?.is_deleted && (
                <span className="text-xs px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 font-semibold border border-rose-200 dark:border-rose-800">
                  Terhapus
                </span>
              )}
            </div>
            <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-white truncate">
              {ticket?.subject || "Memuat Tiket..."}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {ticket && (
              <>
                {ticket.is_deleted && canManageStatus ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRestore}
                    disabled={updating}
                    leftIcon={<RotateCcw size={14} />}
                  >
                    Pulihkan
                  </Button>
                ) : !ticket.is_deleted && canDeleteTicket ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDelete}
                    disabled={updating}
                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    leftIcon={<Trash2 size={14} />}
                  >
                    Hapus
                  </Button>
                ) : null}
              </>
            )}

            {/* Prominent Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 text-xs font-bold shrink-0 border border-slate-300/60 dark:border-slate-700 shadow-sm cursor-pointer"
              title="Tutup jendela (ESC)"
              aria-label="Tutup jendela tiket"
            >
              <X size={18} />
              <span className="hidden sm:inline">Tutup</span>
            </button>
          </div>
        </div>

        {/* Management Controls Bar (for Admin / Teacher) */}
        {ticket && canManageStatus && !ticket.is_deleted && (
          <div className="px-4 sm:px-6 py-2.5 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap text-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-medium text-slate-600 dark:text-slate-300">Ubah Status:</span>
              <select
                value={ticket.status}
                onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                disabled={updating}
                aria-label="Ubah Status Tiket"
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium focus:ring-1 focus:ring-brand-500 text-xs"
              >
                <option value="OPEN">Terbuka (OPEN)</option>
                <option value="IN_PROGRESS">Diproses (IN PROGRESS)</option>
                <option value="WAITING_FOR_USER">Menunggu Pengguna</option>
                <option value="RESOLVED">Selesai (RESOLVED)</option>
                <option value="CLOSED">Tutup Tiket (CLOSED)</option>
              </select>

              <span className="font-medium text-slate-600 dark:text-slate-300 ml-1">Prioritas:</span>
              <select
                value={ticket.priority}
                onChange={(e) => handlePriorityChange(e.target.value as TicketPriority)}
                disabled={updating}
                aria-label="Ubah Prioritas Tiket"
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium focus:ring-1 focus:ring-brand-500 text-xs"
              >
                <option value="LOW">Rendah</option>
                <option value="MEDIUM">Sedang</option>
                <option value="HIGH">Tinggi</option>
              </select>
            </div>
            <div className="text-slate-500 dark:text-slate-400 text-xs">
              Pelapor: <span className="font-semibold text-slate-700 dark:text-slate-200">{ticket.user_name}</span> ({ticket.user_role})
            </div>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="px-4 sm:px-6 py-2.5 bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-900/60 flex items-center justify-between text-xs text-rose-600 dark:text-rose-400">
            <span className="flex items-center gap-1.5">
              <AlertCircle size={15} /> {error}
            </span>
            <button onClick={() => setError(null)} className="hover:underline font-medium">Tutup</button>
          </div>
        )}

        {/* Conversation Body */}
        <div 
          ref={chatBodyRef}
          className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-5 space-y-4 bg-slate-50/40 dark:bg-slate-950/40"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3 py-16">
              <RefreshCw className="animate-spin text-brand-600" size={32} />
              <p className="text-sm font-medium">Memuat percakapan tiket...</p>
            </div>
          ) : !ticket ? (
            <div className="text-center py-16 text-slate-400 text-sm">Tiket tidak ditemukan.</div>
          ) : (
            <>
              {/* Initial Report Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-xs pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-brand-600/15 text-brand-700 dark:text-brand-300 font-bold flex items-center justify-center text-xs shrink-0">
                      {ticket.user_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{ticket.user_name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 uppercase font-semibold text-slate-600 dark:text-slate-300">
                          {ticket.user_role}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock size={11} /> Dilaporkan: {formatWibDateTime(ticket.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                    Detail Kendala Awal:
                  </span>
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                    {initialMessage ? initialMessage.message : ticket.subject}
                  </p>
                </div>

                {/* Attachment of the initial ticket */}
                {(ticket.attachment_path || initialMessage?.attachment_path) && (
                  <div className="pt-1">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                      Lampiran Bukti Awal:
                    </span>
                    {isImageAttachment(ticket.attachment_path || initialMessage?.attachment_path) ? (
                      <a
                        href={getAttachmentUrl(ticket.attachment_path || initialMessage?.attachment_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block group overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-black/5 dark:bg-black/20"
                      >
                        <img
                          src={getAttachmentUrl(ticket.attachment_path || initialMessage?.attachment_path)}
                          alt="Lampiran Tiket"
                          className="max-h-48 max-w-full sm:max-w-xs object-cover rounded-xl group-hover:scale-102 transition-transform"
                        />
                        <div className="p-2 flex items-center justify-between text-[11px] bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                          <span className="flex items-center gap-1"><Paperclip size={12} /> Buka Gambar</span>
                          <ExternalLink size={12} className="text-slate-400" />
                        </div>
                      </a>
                    ) : (
                      <a
                        href={getAttachmentUrl(ticket.attachment_path || initialMessage?.attachment_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors font-medium shadow-sm"
                      >
                        <FileText size={14} className="text-brand-600" />
                        <span>Unduh / Lihat Dokumen Lampiran</span>
                        <Download size={13} className="text-slate-400" />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Replies Timeline Divider & Clear History Action */}
              <div className="flex items-center justify-between gap-2 my-4 pt-2 border-b border-slate-200/80 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-[11px] font-semibold text-slate-600 dark:text-slate-300 shadow-xs">
                    {replyMessages.length > 0 ? `${replyMessages.length} Pesan Balasan` : "Percakapan Balasan"}
                  </span>
                </div>

                {replyMessages.length > 0 && canClearHistory && !ticket.is_deleted && (
                  <button
                    type="button"
                    onClick={handleClearMessages}
                    disabled={updating}
                    className="inline-flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 px-2.5 py-1 rounded-lg transition-colors font-semibold border border-transparent hover:border-rose-200 dark:hover:border-rose-900 cursor-pointer disabled:opacity-50"
                    title="Hapus seluruh riwayat chat balasan pada tiket ini"
                  >
                    <Trash2 size={13} />
                    <span>Hapus Riwayat Chat</span>
                  </button>
                )}
              </div>

              {/* Message bubbles */}
              {replyMessages.length > 0 ? (
                replyMessages.map((msg: TicketMessage) => {
                  const isMine = activeUserId ? msg.sender_id === activeUserId : msg.sender_role === activeUserRole;
                  const canDeleteMsg = !ticket.is_deleted && (
                    isMine ||
                    (activeUserId && ticket.user_id === activeUserId) ||
                    activeUserRole === "admin"
                  );
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col group ${isMine ? "items-end ml-auto" : "items-start mr-auto"} max-w-[90%] sm:max-w-[80%]`}
                    >
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1 px-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {isMine ? "Anda" : msg.sender_name}
                        </span>
                        <span className="text-[9px] uppercase px-1 py-0.2 bg-slate-200 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 font-bold">
                          {msg.sender_role}
                        </span>
                        <span>•</span>
                        <span>{formatWibTimeWithSuffix(msg.created_at)}</span>

                        {canDeleteMsg && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            disabled={updating}
                            className="ml-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 p-1 rounded-md transition-all cursor-pointer disabled:opacity-50"
                            title="Hapus pesan ini"
                            aria-label="Hapus pesan"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>

                      <div
                        className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                          isMine
                            ? "bg-brand-600 text-white rounded-tr-xs"
                            : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 rounded-tl-xs"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.message}</p>

                        {msg.attachment_path && (
                          <div className={`mt-2 pt-2 border-t ${isMine ? "border-white/20" : "border-slate-100 dark:border-slate-700/60"}`}>
                            {isImageAttachment(msg.attachment_path) ? (
                              <a
                                href={getAttachmentUrl(msg.attachment_path)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block rounded-lg overflow-hidden mt-1"
                              >
                                <img
                                  src={getAttachmentUrl(msg.attachment_path)}
                                  alt="Lampiran balasan"
                                  className="max-h-40 max-w-full rounded-lg object-cover"
                                />
                              </a>
                            ) : (
                              <a
                                href={getAttachmentUrl(msg.attachment_path)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-1.5 text-xs underline font-medium ${
                                  isMine ? "text-white hover:text-brand-100" : "text-brand-600 dark:text-brand-400 hover:underline"
                                }`}
                              >
                                <Paperclip size={12} />
                                <span>Unduh Berkas Lampiran</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-slate-400 bg-white/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-4">
                  Belum ada balasan lanjutan. Tulis balasan atau penjelasan di bawah untuk berkomunikasi.
                </div>
              )}
            </>
          )}
        </div>

        {/* Message Composer Footer */}
        {ticket && !ticket.is_deleted && ticket.status !== "CLOSED" ? (
          <form
            onSubmit={handleSendMessage}
            className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 space-y-2.5"
          >
            {replyAttachment && (
              <div className="flex items-center justify-between text-xs px-3 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                <span className="flex items-center gap-1.5 truncate">
                  <Paperclip size={13} />
                  <span className="truncate">{replyAttachment.name} ({(replyAttachment.size / 1024).toFixed(0)} KB)</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setReplyAttachment(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="hover:text-rose-500 ml-2"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="flex items-end gap-2">
              <div className="relative flex-1">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder="Tulis balasan di sini... (Tekan Enter untuk kirim, Shift+Enter untuk baris baru)"
                  rows={2}
                  disabled={sending}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none transition-all"
                />
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    if (file.size > 5 * 1024 * 1024) {
                      setError("Ukuran berkas maksimal 5MB.");
                      e.target.value = "";
                      return;
                    }
                    setReplyAttachment(file);
                    setError(null);
                  }
                }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                title="Unggah Lampiran"
              >
                <Paperclip size={18} />
              </button>

              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={onClose}
                className="hidden sm:inline-flex shrink-0"
              >
                Tutup
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={sending}
                disabled={!replyText.trim() && !replyAttachment}
                leftIcon={<Send size={15} />}
                className="shrink-0"
              >
                Kirim
              </Button>
            </div>
          </form>
        ) : ticket?.status === "CLOSED" ? (
          <div className="p-4 bg-slate-100 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Tiket ini telah ditutup (CLOSED). Hubungi staf atau buat tiket baru bila membutuhkan bantuan.</span>
            <Button size="sm" variant="outline" onClick={onClose}>Tutup</Button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default TicketDetailModal;
