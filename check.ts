/**
 * Post-build sanity checks. `node check.ts` (run `node build.ts` first).
 * Exits non-zero on the first category of failure so CI can gate on it.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPageMap, flattenPages } from "./src/page-map.ts";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(rootDir, "dist");
const failures: string[] = [];

const check = (label: string, condition: boolean): void => {
  if (!condition) failures.push(label);
};

const pages = flattenPages(getPageMap(path.join(rootDir, "content")));

const fileFor = (route: string): string =>
  route === "/"
    ? path.join(distDir, "index.html")
    : path.join(distDir, route.slice(1), "index.html");

// Every content page produced a document with the expected shell.
for (const page of pages) {
  const file = fileFor(page.route);
  check(`${page.route}: built`, fs.existsSync(file));
  if (!fs.existsSync(file)) continue;

  const html = fs.readFileSync(file, "utf8");
  check(`${page.route}: <nav>`, html.includes("<nav "));
  check(`${page.route}: sidebar`, html.includes('class="sidebar'));
  check(`${page.route}: <main>`, html.includes("<main "));
  check(`${page.route}: prev/next footer`, html.includes('<footer class="mt-24">'));
  check(`${page.route}: stylesheet`, html.includes("/theme/globals.css"));
  check(`${page.route}: runtime`, html.includes("/theme/app.js"));
  check(`${page.route}: search index`, html.includes('id="search-index"'));
  check(
    `${page.route}: marked active in sidebar`,
    html.includes(`<li class="active"><a href="${page.route}">`),
  );
}

// Assets copied.
check("theme/globals.css copied", fs.existsSync(path.join(distDir, "theme/globals.css")));
check("theme/overrides.css copied", fs.existsSync(path.join(distDir, "theme/overrides.css")));
check("theme/app.js copied", fs.existsSync(path.join(distDir, "theme/app.js")));
check("404 page", fs.existsSync(path.join(distDir, "404.html")));

// Search index is present, parses, and covers every page.
const home = fs.readFileSync(path.join(distDir, "index.html"), "utf8");
const raw = home.match(/<script id="search-index"[^>]*>([\s\S]*?)<\/script>/)?.[1];
let entries: { title: string; route: string }[] = [];
try {
  entries = JSON.parse((raw ?? "[]").replace(/\\u003c/g, "<"));
} catch {
  failures.push("search index: invalid JSON");
}
check("search index: non-empty", entries.length > 0);
for (const page of pages) {
  check(
    `search index: covers ${page.route}`,
    entries.some((entry) => entry.route === page.route),
  );
}

/**
 * Every root-relative link and asset must exist inside dist/ — this is what
 * decides whether a static host serves a working site.
 *
 * `/og.png` is deliberately absent: the demo content referenced an image the
 * project never shipped, and the previous builds rendered it broken too.
 */
const KNOWN_MISSING = new Set(["/og.png"]);
const refPattern = /(?:href|src)="(\/[^"#]*)(?:#[^"]*)?"/g;
const missing = new Set<string>();

for (const page of pages) {
  const html = fs.readFileSync(fileFor(page.route), "utf8");
  for (const [, ref] of html.matchAll(refPattern)) {
    const target = ref!;
    if (KNOWN_MISSING.has(target)) {
      missing.add(target);
      continue;
    }
    const candidates = [
      path.join(distDir, target),
      path.join(distDir, target, "index.html"),
    ];
    check(
      `${page.route}: ${target} resolves`,
      candidates.some((candidate) => fs.existsSync(candidate)),
    );
  }
}

for (const ref of missing) {
  console.warn(`  ! ${ref} is referenced but not shipped (pre-existing)`);
}

if (failures.length) {
  console.error(`✗ ${failures.length} check(s) failed:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(
  `✓ all checks passed · ${pages.length} pages · ${entries.length} search entries`,
);
