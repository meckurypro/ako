// src/pages/CustomPageView.tsx
// The public face of a Custom Page — what myako.site/<slug> shows. Mounted by SlugRoute (below) when the slug belongs
// to a Custom Page. Rendered as a full-viewport layer so it reads as its own website: the app's sidebar, bottom nav and
// scroll-to-top button sit underneath and never show through.
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Pencil } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { recordCustomPageEvent } from "../hooks/useCustomPages";
import { useStartConversation } from "../hooks/useMessaging";
import { useToast } from "../components/Toast";
import { friendlyError } from "../lib/friendlyError";
import { CustomPageRenderer } from "../components/customPage/CustomPageRenderer";
import { InquiryDialog } from "../components/customPage/InquiryDialog";
import { customPagePath, publicFileUrl, rememberReferrer, visitorId, type PublicCustomPage } from "../lib/customPage";

export function CustomPageView({ page }: { page: PublicCustomPage }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const startConversation = useStartConversation();
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const config = page.config;
  const name = config.identity?.name || page.name;

  // A retired slug still resolves (see get_public_custom_page) — move the address bar to the current link.
  const requested = typeof window !== "undefined" ? window.location.pathname.replace(/^\//, "").toLowerCase() : "";
  useEffect(() => {
    if (requested && requested !== page.slug) navigate(customPagePath(page.slug), { replace: true });
  }, [requested, page.slug, navigate]);

  // One view per visit. The server de-dupes by visitor within 30 minutes and ignores the owner.
  useEffect(() => {
    if (page.state === "live") recordCustomPageEvent(page.id, "view", visitorId());
  }, [page.id, page.state]);

  // Tab title + link-preview basics. (Rich WhatsApp/Telegram previews are produced by api/share.ts for crawlers.)
  useEffect(() => {
    const previous = document.title;
    document.title = name;
    const icon = publicFileUrl(config.identity?.icon_path);
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    const previousIcon = link?.href;
    if (icon && link) link.href = icon;
    return () => {
      document.title = previous;
      if (link && previousIcon) link.href = previousIcon;
      link = null;
    };
  }, [name, config.identity?.icon_path]);

  async function messageOwner() {
    if (!user) {
      navigate("/login", { state: { from: customPagePath(page.slug) } });
      return;
    }
    if (user.id === page.owner.id) {
      toast("This is your own page.");
      return;
    }
    try {
      const conversationId = await startConversation.mutateAsync(page.owner.id);
      navigate(`/messages/${conversationId}`);
    } catch (err) {
      toast(friendlyError(err, "Couldn't open the chat. Please try again."), { variant: "error" });
    }
  }

  return (
    <div ref={scroller} className="fixed inset-0 z-[55] overflow-y-auto overscroll-contain bg-black/0" style={{ WebkitOverflowScrolling: "touch" }}>
      {page.is_owner && page.state !== "live" && (
        <div className="sticky top-0 z-20 bg-ink text-canvas text-sm px-4 py-2.5 flex items-center justify-between gap-3">
          <span>
            {page.state === "private" ? "Only you can see this page." : "This page isn't published yet — only you can see this preview."}
          </span>
          <Link to={`/me/custom-pages/${page.id}/edit`} className="inline-flex items-center gap-1.5 font-medium underline underline-offset-2 shrink-0">
            <Pencil size={14} /> Edit
          </Link>
        </div>
      )}
      {page.is_owner && page.state === "live" && (
        <Link
          to={`/me/custom-pages/${page.id}`}
          className="fixed bottom-4 right-4 z-20 inline-flex items-center gap-1.5 rounded-full bg-ink text-canvas text-sm font-medium px-4 py-2.5 shadow-lg"
        >
          <Pencil size={14} /> Manage page
        </Link>
      )}

      <CustomPageRenderer
        config={config}
        slug={page.slug}
        actions={{
          onCta: (cta) => recordCustomPageEvent(page.id, cta.action === "download" ? "download" : "cta_click", visitorId(), cta.id),
          onDocumentRead: () => recordCustomPageEvent(page.id, "cta_click", visitorId(), "document"),
          onDocumentDownload: () => recordCustomPageEvent(page.id, "download", visitorId(), "document"),
          onShare: () => recordCustomPageEvent(page.id, "cta_click", visitorId(), "share"),
          onOpenInquiry: () => setInquiryOpen(true),
          onMessageOwner: () => void messageOwner(),
          signedIn: !!user,
          onCreateYours: () => {
            rememberReferrer(page.slug);
            recordCustomPageEvent(page.id, "create_click", visitorId());
          },
        }}
      />

      {inquiryOpen && <InquiryDialog pageId={page.id} pageName={name} onClose={() => setInquiryOpen(false)} />}
    </div>
  );
}
