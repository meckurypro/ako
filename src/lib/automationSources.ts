// src/lib/automationSources.ts
// Starting configurations for news sources, so a new news account doesn't begin from an empty JSON box. A source's
// `config.requests` is a list: NewsData.io allows five countries and five categories per request on its free plan, so
// wide coverage is several requests. See supabase/functions/run-post-automation/news.ts for the fields each provider
// accepts.
import type { SourceProvider } from "../hooks/useAutomation";

export interface SourcePreset {
  id: string;
  provider: SourceProvider;
  label: string;
  note: string;
  config: Record<string, unknown>;
}

export const SOURCE_PRESETS: SourcePreset[] = [
  {
    id: "africa-newsdata",
    provider: "newsdata",
    label: "Africa, NewsData.io",
    note: "Twenty countries across four requests, plus international reporting about Africa. Uses 5 credits per fetch. On the free plan articles arrive about 12 hours late and each request returns 10.",
    config: {
      requests: [
        { country: "ng,gh,ke,za,eg", category: "politics,business,technology,top", language: "en" },
        { country: "ng,gh,ke,za,eg", category: "entertainment,lifestyle,science,world", language: "en" },
        { country: "ma,tz,ug,et,sn", category: "politics,business,technology,top", language: "en" },
        { country: "rw,zm,zw,ci,cm", category: "politics,business,technology,top", language: "en" },
        {
          q: "Africa OR African",
          category: "politics,business,technology,entertainment,lifestyle",
          language: "en",
        },
      ],
    },
  },
  {
    id: "africa-gdelt",
    provider: "gdelt",
    label: "Africa, GDELT",
    note: "Free, no key. Headlines only, so it adds breadth rather than detail. Takes about 6 seconds per extra request.",
    config: {
      requests: [
        {
          query:
            '(Africa OR Nigeria OR Ghana OR Kenya OR "South Africa" OR Egypt OR Ethiopia OR ECOWAS OR AfCFTA) sourcelang:english',
          timespan: "1d",
          maxrecords: 75,
        },
      ],
    },
  },
];

export const BLANK_CONFIG: Record<SourceProvider, Record<string, unknown>> = {
  newsdata: { requests: [{ country: "ng", category: "top", language: "en" }] },
  gdelt: { requests: [{ query: "Nigeria sourcelang:english", timespan: "1d", maxrecords: 75 }] },
};
