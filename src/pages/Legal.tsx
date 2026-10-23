// src/pages/Legal.tsx
//
// Public Privacy Policy (/privacy) and Terms of Service (/terms). Deliberately NOT behind RequireAuth: people read
// these before signing up, app stores need a public privacy URL, and the sign-up screen links here. Reached from
// Settings > Legal when signed in.
import { Fragment } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_UPDATED,
  PRIVACY_POLICY,
  TERMS_OF_SERVICE,
  type LegalDocument,
} from "../lib/legalContent";

function LegalPage({ doc, otherPath, otherLabel }: { doc: LegalDocument; otherPath: string; otherLabel: string }) {
  const navigate = useNavigate();
  const location = useLocation();

  // "default" is the key of the first entry in this tab's history: nothing to go back to (opened from a shared
  // link, a search result or the store listing), so land on the app's front door instead of leaving the site.
  function goBack() {
    if (location.key !== "default") navigate(-1);
    else navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 bg-canvas/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 h-14">
          <button onClick={goBack} aria-label="Back" className="text-ink-muted p-1 -ml-1">
            <ArrowLeft size={22} />
          </button>
          <h1 className="font-display text-xl text-ink truncate">{doc.title}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 pt-6 pb-16">
        <p className="text-xs text-ink-muted mb-4">Last updated {LEGAL_UPDATED}</p>
        <p className="text-[15px] leading-relaxed text-ink mb-8">{doc.intro}</p>

        <nav aria-label="Contents" className="rounded-2xl border border-border bg-surface p-4 mb-10">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted mb-2">In this document</p>
          <ol className="space-y-1.5 text-sm">
            {doc.sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-ink-muted hover:text-accent">
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {doc.sections.map((section, i) => (
          <section key={section.id} id={section.id} className="mb-9 scroll-mt-20">
            <h2 className="font-display text-lg text-ink mb-3">
              {i + 1}. {section.title}
            </h2>
            {section.blocks.map((block, bi) => (
              <Fragment key={bi}>
                {Array.isArray(block) ? (
                  <ul className="list-disc pl-5 mb-3 space-y-2 text-[15px] leading-relaxed text-ink">
                    {block.map((item, ii) => (
                      <li key={ii}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[15px] leading-relaxed text-ink mb-3">{block}</p>
                )}
              </Fragment>
            ))}
          </section>
        ))}

        <footer className="border-t border-border pt-6 text-sm text-ink-muted space-y-2">
          <p>
            Questions? Email{" "}
            <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-accent hover:underline">
              {LEGAL_CONTACT_EMAIL}
            </a>
            .
          </p>
          <p>
            <Link to={otherPath} className="text-accent font-medium hover:underline">
              {otherLabel}
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}

export function PrivacyPolicy() {
  return <LegalPage doc={PRIVACY_POLICY} otherPath="/terms" otherLabel="Read our Terms of Service" />;
}

export function TermsOfService() {
  return <LegalPage doc={TERMS_OF_SERVICE} otherPath="/privacy" otherLabel="Read our Privacy Policy" />;
}
