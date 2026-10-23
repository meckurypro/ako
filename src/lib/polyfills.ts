// src/lib/polyfills.ts
// Imported FIRST in main.tsx. Tiny, dependency-free shims for runtime APIs that newer libraries call but older
// iOS Safari lacks. Vite only transpiles *syntax*; it never adds missing runtime APIs, so without these a library
// touching them throws and the page can stay blank.

type Resolvers<T> = { promise: Promise<T>; resolve: (v: T | PromiseLike<T>) => void; reject: (r?: unknown) => void };

// Safari < 17.4
if (typeof (Promise as unknown as { withResolvers?: unknown }).withResolvers !== "function") {
  (Promise as unknown as { withResolvers: <T>() => Resolvers<T> }).withResolvers = function <T>(): Resolvers<T> {
    let resolve!: Resolvers<T>["resolve"];
    let reject!: Resolvers<T>["reject"];
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// Safari < 18
if (typeof URL !== "undefined" && typeof (URL as unknown as { parse?: unknown }).parse !== "function") {
  (URL as unknown as { parse: (u: string | URL, b?: string | URL) => URL | null }).parse = (u, b) => {
    try {
      return new URL(u, b);
    } catch {
      return null;
    }
  };
}

// Safari < 17.4 — Object.groupBy / Map.groupBy are used by some bundled dependencies.
if (typeof (Object as unknown as { groupBy?: unknown }).groupBy !== "function") {
  (Object as unknown as { groupBy: unknown }).groupBy = function <T>(items: Iterable<T>, fn: (v: T, i: number) => PropertyKey) {
    const out: Record<PropertyKey, T[]> = Object.create(null);
    let i = 0;
    for (const item of items) (out[fn(item, i++)] ??= []).push(item);
    return out;
  };
}
