// src/components/pageTemplate/TemplatePicker.tsx
// Where a page's editors choose the page's template: ten arrangements of the same content. Saves on tap.
import { Check } from "lucide-react";
import { useToast } from "../Toast";
import { PAGE_TEMPLATES, getPageTemplate } from "../../lib/pageTemplates";
import { useUpdatePageTemplate } from "../../hooks/usePageLanding";
import type { Page } from "../../types/database";
import { TemplateThumb } from "./TemplateThumb";

export function TemplatePicker({ page }: { page: Page }) {
  const toast = useToast();
  const update = useUpdatePageTemplate(page.id);
  const current = getPageTemplate(page.page_template);

  return (
    <section className="space-y-4" aria-labelledby="template-heading">
      <div>
        <h3 id="template-heading" className="text-sm font-semibold text-ink">
          Page template
        </h3>
        <p className="mt-0.5 text-xs text-ink-muted">
          Same content, different arrangement. Switching never changes what you've written or uploaded.
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PAGE_TEMPLATES.map((t) => {
          const selected = t.id === current.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                disabled={update.isPending}
                aria-pressed={selected}
                onClick={() =>
                  !selected &&
                  update.mutate(t.id, {
                    onSuccess: () => toast(`${t.name} template applied.`),
                    onError: () => toast("Couldn't change the template.", { variant: "error" }),
                  })
                }
                className={`relative block w-full rounded-2xl p-2 text-left transition ${
                  selected ? "bg-accent-soft ring-2 ring-accent" : "bg-canvas hover:bg-ink/5"
                } disabled:opacity-60`}
              >
                <TemplateThumb cfg={t.config} />
                <div className="mt-2 flex items-center gap-1.5 px-0.5">
                  <span className="text-sm font-semibold text-ink">{t.name}</span>
                  {selected && <Check size={14} className="text-accent" />}
                </div>
                <p className="mt-0.5 px-0.5 text-[11px] leading-snug text-ink-muted">{t.blurb}</p>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
