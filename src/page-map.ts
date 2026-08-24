import fs from "node:fs";
import path from "node:path";

export type PageItem = {
  name: string;
  route: string;
  title: string;
  file?: string;
  children?: PageItem[];
};

const titleFromName = (name: string): string =>
  name.charAt(0).toUpperCase() + name.slice(1);

function readMeta(dir: string): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8"));
  } catch {
    return {};
  }
}

function buildTree(dir: string, basePath: string): PageItem[] {
  const meta = readMeta(dir);
  const found = new Map<string, PageItem>();

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const children = buildTree(
        path.join(dir, entry.name),
        `${basePath}/${entry.name}`,
      );
      if (children.length === 0) continue;
      found.set(entry.name, {
        name: entry.name,
        route: `${basePath}/${entry.name}`,
        title: meta[entry.name] ?? titleFromName(entry.name),
        children,
      });
    } else if (/\.mdx?$/.test(entry.name)) {
      const name = entry.name.replace(/\.mdx?$/, "");
      found.set(name, {
        name,
        route: name === "index" ? basePath || "/" : `${basePath}/${name}`,
        title: meta[name] ?? titleFromName(name),
        file: path.join(dir, entry.name),
      });
    }
  }

  // meta.json decides both titles and order; anything it omits follows alphabetically.
  const ordered = Object.keys(meta).filter((key) => found.has(key));
  const rest = [...found.keys()].filter((key) => !ordered.includes(key)).sort();

  return [...ordered, ...rest].map((key) => found.get(key)!);
}

export const getPageMap = (contentDir: string): PageItem[] =>
  buildTree(contentDir, "");

/** Depth-first list of linkable pages — the order the prev/next links follow. */
export function flattenPages(items: PageItem[]): PageItem[] {
  return items.flatMap((item) =>
    item.children ? flattenPages(item.children) : [item],
  );
}
