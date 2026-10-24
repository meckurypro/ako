// src/components/pageTemplate/TemplateThumb.tsx
// A tiny wireframe of a template — banner, photo, text, slideshow, sections, project wall — drawn from the
// same config the real page uses, so the picker shows what each arrangement actually does.
import type { PageTemplateConfig } from "../../lib/pageTemplates";

const ink = "bg-ink/25";
const soft = "bg-accent/25";

function Lines({ center, light, w = ["70%", "45%"] }: { center?: boolean; light?: boolean; w?: string[] }) {
  return (
    <div className={`flex min-w-0 flex-1 flex-col gap-[3px] ${center ? "items-center" : ""}`}>
      {w.map((width, i) => (
        <div key={i} style={{ width }} className={`h-[3px] rounded-full ${light ? "bg-white/80" : i === 0 ? "bg-ink/60" : ink}`} />
      ))}
    </div>
  );
}

function Dot({ size, shape, ring }: { size: number; shape: PageTemplateConfig["avatarShape"]; ring?: boolean }) {
  const px = Math.max(6, Math.round(size / 6.5));
  const r = shape === "circle" ? "rounded-full" : shape === "squircle" ? "rounded-[30%]" : "rounded-[2px]";
  return <div style={{ width: px, height: px }} className={`shrink-0 ${r} bg-accent/60 ${ring ? "ring-2 ring-canvas" : ""}`} />;
}

export function TemplateThumb({ cfg }: { cfg: PageTemplateConfig }) {
  const overlay = cfg.identity === "over-left" || cfg.identity === "over-center";
  const hasBanner = cfg.banner === "standard" || cfg.banner === "tall" || cfg.banner === "strip";
  const bannerH = { standard: "h-7", tall: "h-[52px]", strip: "h-2.5" }[cfg.banner as "standard" | "tall" | "strip"];
  const center = cfg.identity === "over-center" || cfg.identity === "stack-center" || cfg.identity === "masthead";

  const hero = (
    <div
      className={`h-7 ${soft} ${cfg.heroFrame === "bleed" ? "-mx-1.5" : cfg.heroFrame === "inset" ? "rounded-[4px] border border-ink/20" : "rounded-lg"}`}
    />
  );

  const sections = cfg.order.map((key) => {
    const body = (
      <>
        <div className={`h-[3px] w-1/3 rounded-full ${cfg.headings === "eyebrow" ? "bg-accent/70" : "bg-ink/55"} ${cfg.centered ? "mx-auto" : ""}`} />
        {key === "team" ? (
          <div className="mt-1 flex gap-1">
            <div className={`h-4 flex-1 rounded-[3px] ${ink}`} />
            <div className={`h-4 flex-1 rounded-[3px] ${ink}`} />
          </div>
        ) : (
          <div className={`mt-1 flex flex-col gap-[3px] ${cfg.centered ? "items-center" : ""}`}>
            <div className={`h-[2px] w-full rounded-full ${ink}`} />
            <div className={`h-[2px] w-4/5 rounded-full ${ink}`} />
          </div>
        )}
      </>
    );
    return cfg.panels ? (
      <div key={key} className="rounded-md border border-ink/15 bg-ink/5 p-1">
        {body}
      </div>
    ) : (
      <div key={key}>{body}</div>
    );
  });

  return (
    <div aria-hidden className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-border bg-canvas p-1.5">
      <div className="flex flex-col gap-1.5">
        {cfg.heroFirst && hero}

        {cfg.banner === "backdrop" && <div className="-mx-1.5 -mt-1.5 h-9 bg-gradient-to-b from-accent/30 to-transparent" />}

        {hasBanner && (
          <div className={`-mx-1.5 -mt-1.5 flex items-end ${bannerH} ${overlay ? "bg-black/70" : soft} px-1.5 pb-1`}>
            {overlay && (
              <div className={`flex w-full ${center ? "flex-col items-center gap-[3px]" : "items-end gap-1"}`}>
                <Dot size={cfg.avatarSize} shape={cfg.avatarShape} />
                <Lines center={center} light w={center ? ["60%", "40%"] : ["55%", "35%"]} />
              </div>
            )}
          </div>
        )}

        {!overlay && cfg.identity === "overlap-left" && (
          <div className="-mt-3 flex flex-col gap-1">
            <Dot size={cfg.avatarSize} shape={cfg.avatarShape} ring />
            <Lines w={["60%", "40%"]} />
            {cfg.stats === "tiles" && (
              <div className="flex gap-1">
                <div className={`h-3 flex-1 rounded-[3px] ${ink}`} />
                <div className={`h-3 flex-1 rounded-[3px] ${ink}`} />
              </div>
            )}
          </div>
        )}
        {!overlay && cfg.identity === "inline" && (
          <div className={`flex items-center gap-1.5 ${cfg.banner === "strip" ? "-mt-2" : ""}`}>
            <Dot size={cfg.avatarSize} shape={cfg.avatarShape} ring={cfg.banner === "strip"} />
            <Lines w={["70%", "45%"]} />
          </div>
        )}
        {!overlay && cfg.identity === "stack-center" && (
          <div className="flex flex-col items-center gap-1 pt-1">
            <Dot size={cfg.avatarSize} shape={cfg.avatarShape} />
            <Lines center w={["55%", "35%"]} />
            <div className="h-2.5 w-3/4 rounded-full bg-accent/40" />
            <div className="h-2.5 w-3/4 rounded-full bg-ink/15" />
          </div>
        )}
        {!overlay && cfg.identity === "masthead" && (
          <div className="flex flex-col items-center gap-1 border-y border-ink/60 py-1.5">
            <Dot size={cfg.avatarSize} shape={cfg.avatarShape} />
            <div className="h-1 w-2/3 rounded-full bg-ink/70" />
            <div className="h-[2px] w-1/2 rounded-full bg-ink/30" />
          </div>
        )}

        {!cfg.heroFirst && hero}
        {sections}
        <div className={`mt-0.5 grid gap-[3px] ${cfg.columns === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {Array.from({ length: cfg.columns === 3 ? 6 : 4 }).map((_, i) => (
            <div key={i} className={`aspect-square rounded-[3px] ${i % 2 ? "bg-ink/15" : "bg-ink/25"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
