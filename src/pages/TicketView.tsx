// src/pages/TicketView.tsx
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Clock } from "lucide-react";
import { useProject } from "../hooks/useProjects";
import { useEventDetails } from "../hooks/useProjectTypeDetails";
import { useMyEventTicket } from "../hooks/useEventTickets";

// NOTE: this reads event_tickets, but nothing writes to it yet — the
// purchase edge function needs to be extended to issue a ticket (see
// useEventTickets.ts). Until then this correctly shows "processing"
// for anyone who's bought but has no ticket row.
export function TicketView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: project } = useProject(projectId);
  const { data: eventDetails } = useEventDetails(projectId);
  const { data: ticket, isLoading } = useMyEventTicket(projectId);

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas px-4 pt-4 pb-10">
      <div className="max-w-md mx-auto">
        <button onClick={() => navigate(-1)} className="text-ink-muted mb-3">
          <ArrowLeft size={22} />
        </button>

        <h2 className="font-display text-2xl text-ink mb-1">{project.title}</h2>
        {eventDetails?.event_date && (
          <p className="text-sm text-ink-muted mb-6">
            {new Date(eventDetails.event_date).toLocaleString()} —{" "}
            {eventDetails.location_type === "physical" ? eventDetails.location_value : "Online"}
          </p>
        )}

        {isLoading ? (
          <p className="text-ink-muted text-sm">Loading your ticket…</p>
        ) : ticket ? (
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            {ticket.ticket_image_url ? (
              <img src={ticket.ticket_image_url} alt="Your ticket" className="w-full" />
            ) : (
              <div className="p-6 text-center">
                <p className="text-ink font-medium">{project.title}</p>
                <p className="text-xs text-ink-muted mt-1">Ticket code</p>
                <p className="font-mono text-sm text-ink">{ticket.ticket_code}</p>
              </div>
            )}
            <div className="p-4 flex items-center justify-between">
              <p className="text-xs text-ink-muted">Sent to {ticket.recipient_email}</p>
              {ticket.ticket_image_url && (
                <a
                  href={ticket.ticket_image_url}
                  download
                  className="flex items-center gap-1.5 text-sm text-accent font-medium"
                >
                  <Download size={14} /> Download
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-2 mt-10">
            <Clock size={24} className="text-ink-muted" />
            <p className="text-sm text-ink-muted">
              If you've just bought this, your ticket is still being issued — check back shortly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
