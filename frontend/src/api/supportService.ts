import { client, apiCall } from "./client";
import type { SupportTicket, TicketStats } from "../types";

export interface ListTicketParams {
  status?: string;
  category?: string;
  priority?: string;
  search?: string;
  include_deleted?: boolean;
}

export function listTickets(params?: ListTicketParams) {
  return apiCall<{ tickets: SupportTicket[] }>(
    client.get("/api/support/tickets", { params })
  );
}

export function getTicket(ticketId: number) {
  return apiCall<SupportTicket>(client.get(`/api/support/tickets/${ticketId}`));
}

export function createTicket(formData: FormData) {
  return apiCall<SupportTicket>(client.post("/api/support/tickets", formData));
}

export function sendTicketMessage(ticketId: number, formData: FormData) {
  return apiCall<SupportTicket>(
    client.post(`/api/support/tickets/${ticketId}/messages`, formData)
  );
}

export function clearTicketMessages(ticketId: number) {
  return apiCall<SupportTicket>(
    client.delete(`/api/support/tickets/${ticketId}/messages`)
  );
}

export function deleteTicketMessage(ticketId: number, messageId: number) {
  return apiCall<SupportTicket>(
    client.delete(`/api/support/tickets/${ticketId}/messages/${messageId}`)
  );
}

export function getAttachmentUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:")) {
    return path;
  }
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiBase.replace(/\/$/, "")}${cleanPath}`;
}

export function updateTicketStatus(ticketId: number, status: string) {
  const formData = new FormData();
  formData.append("status", status);
  return apiCall<SupportTicket>(
    client.patch(`/api/support/tickets/${ticketId}/status`, formData)
  );
}

export function updateTicketPriority(ticketId: number, priority: string) {
  const formData = new FormData();
  formData.append("priority", priority);
  return apiCall<SupportTicket>(
    client.patch(`/api/support/tickets/${ticketId}/priority`, formData)
  );
}

export function deleteTicket(ticketId: number) {
  return apiCall<{ id: number; ticket_number: string; deleted: boolean }>(
    client.delete(`/api/support/tickets/${ticketId}`)
  );
}

export function restoreTicket(ticketId: number) {
  return apiCall<{ id: number; ticket_number: string; restored: boolean }>(
    client.post(`/api/support/tickets/${ticketId}/restore`)
  );
}

export function getTicketStats() {
  return apiCall<TicketStats>(client.get("/api/support/stats"));
}
