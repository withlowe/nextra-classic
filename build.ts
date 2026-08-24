/**
 * Static site generator. Reads `content/`, writes `dist/`.
 * Run with `node build.ts` — Node 24 strips the types natively.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderMarkdown } from "./src/markdown.ts";
import { renderPage } from "./src/layout.ts";
import { getPageMap, flattenPages, type PageItem } from "./src/page-map.ts";
import { siteConfig } from "./site.config.ts";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.join(rootDir, "content");
const distDir = path.join(rootDir, "dist");

type SearchEntry = {
  title: string;
  route: string;
  depth: number;
};

function copyDir(from: string, to: string): void {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(source, target);
    else fs.copyFileSync(source, target);
  }
}

function outputPathFor(route: string): string {
  return route === "/"
    ? path.join(distDir, "index.html")
    : path.join(distDir, route.slice(1), "index.html");
}

function build(): void {
  const started = Date.now();
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });

  const pageMap = getPageMap(contentDir);
  const pages = flattenPages(pageMap);

  // Pass 1 — render content and collect the search index.
  const rendered = pages.map((page) => {
    const source = fs.readFileSync(page.file!, "utf8");
    const { html, headings } = renderMarkdown(source);
    const title = headings.find((h) => h.depth === 1)?.text ?? siteConfig.defaultTitle;
    return { page, html, headings, title };
  });

  const searchEntries: SearchEntry[] = [];
  for (const { page, headings, title } of rendered) {
    searchEntries.push({ title, route: page.route, depth: 0 });
    for (const heading of headings) {
      if (heading.depth === 1) continue;
      searchEntries.push({
        title: heading.text,
        route: `${page.route}#${heading.id}`,
        depth: heading.depth,
      });
    }
  }
  const searchIndex = JSON.stringify(searchEntries).replace(/</g, "\\u003c");

  // Pass 2 — write each page.
  for (const [index, { page, html, title }] of rendered.entries()) {
    const output = renderPage({
      title,
      route: page.route,
      content: html,
      pageMap,
      prev: (rendered[index - 1]?.page as PageItem) ?? null,
      next: (rendered[index + 1]?.page as PageItem) ?? null,
      searchIndex,
    });
    const file = outputPathFor(page.route);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, output);
  }

  copyDir(path.join(rootDir, "public"), distDir);
  copyDir(path.join(rootDir, "theme"), path.join(distDir, "theme"));

  const notFound = renderPage({
    title: "404: This page could not be found",
    route: "",
    content: "<h1>404</h1>\n<p>This page could not be found.</p>",
    pageMap,
    prev: null,
    next: null,
    searchIndex,
  });
  fs.writeFileSync(path.join(distDir, "404.html"), notFound);

  console.log(
    `built ${rendered.length} pages + 404 · ${searchEntries.length} search entries · ${Date.now() - started}ms`,
  );
}

build();
