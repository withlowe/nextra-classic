import { siteConfig } from "../site.config.ts";
import type { PageItem } from "./page-map.ts";

/**
 * Markup here mirrors the original nextra-theme-docs@1 DOM class-for-class.
 * The class strings are the design — changing them changes the look.
 */

const ARROW = (extra: string): string =>
  `<svg height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="${extra}">` +
  `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>`;

const SUN =
  '<svg class="theme-icon-sun" fill="none" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor">' +
  '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>';

const MOON =
  '<svg class="theme-icon-moon" fill="none" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor">' +
  '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>';

const MENU =
  '<svg fill="none" width="24" height="24" viewBox="0 0 24 24" stroke="currentColor">' +
  '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>';

const searchBox = (): string =>
  '<div class="nextra-search relative w-full md:w-64">' +
  '<input type="search" class="appearance-none border rounded py-2 px-3 leading-tight focus:outline-none focus:ring w-full" placeholder="Search (&quot;/&quot; to focus)" autocomplete="off"/>' +
  "</div>";

function renderTree(items: PageItem[], route: string): string {
  const entries = items
    .map((item) => {
      if (item.children) {
        return (
          '<li class="active">' +
          `<button>${item.title}</button>` +
          '<div style="display:initial">' +
          renderTree(item.children, route) +
          "</div></li>"
        );
      }
      const active = item.route === route ? "active" : "";
      return `<li class="${active}"><a href="${item.route}">${item.title}</a></li>`;
    })
    .join("");
  return `<ul>${entries}</ul>`;
}

function navLinks(prev: PageItem | null, next: PageItem | null): string {
  const base =
    "text-lg font-medium p-4 -m-4 no-underline text-gray-600 hover:text-blue-600 flex items-center";
  const back =
    siteConfig.prevLinks && prev
      ? `<a class="${base} mr-2" title="${prev.title}" href="${prev.route}">${ARROW(
          "transform inline flex-shrink-0 rotate-180 mr-1",
        )}${prev.title}</a>`
      : "";
  const forward =
    siteConfig.nextLinks && next
      ? `<a class="${base} ml-2" title="${next.title}" href="${next.route}">${next.title}${ARROW(
          "transform inline flex-shrink-0 ml-1",
        )}</a>`
      : "";
  return (
    '<footer class="mt-24"><div class="flex flex-row items-center justify-between">' +
    `<div>${back}</div><div>${forward}</div>` +
    "</div><hr/></footer>"
  );
}

export type RenderPageOptions = {
  title: string;
  route: string;
  content: string;
  pageMap: PageItem[];
  prev: PageItem | null;
  next: PageItem | null;
  searchIndex: string;
};

export function renderPage(options: RenderPageOptions): string {
  const { title, route, content, pageMap, prev, next, searchIndex } = options;
  const tree = renderTree(pageMap, route);

  return `<!DOCTYPE html>
<html lang="${siteConfig.lang}">
<head>
<meta charset="utf-8"/>
<title>${title}${siteConfig.titleSuffix}</title>
${siteConfig.head}
<link rel="stylesheet" href="/theme/globals.css"/>
<link rel="stylesheet" href="/theme/overrides.css"/>
<style>html.dark .theme-icon-sun,html:not(.dark) .theme-icon-moon{display:none}</style>
<script>!function(){try{var d=document.documentElement.classList,e=localStorage.getItem("theme");d.remove("light","dark"),e||(localStorage.setItem("theme","light"),e="light"),d.add(e)}catch(e){}}()</script>
</head>
<body>
<div class="nextra-container main-container flex flex-col">
<nav class="flex items-center bg-white z-20 fixed top-0 left-0 right-0 h-16 border-b border-gray-200 px-6 dark:bg-dark dark:border-gray-900 bg-opacity-[.97] dark:bg-opacity-100">
<div class="w-full flex items-center mr-2"><a class="no-underline text-current inline-flex items-center hover:opacity-75" href="/">${siteConfig.logo}</a></div>
<div class="flex-1">${siteConfig.search ? `<div class="hidden md:inline-block mr-2">${searchBox()}</div>` : ""}</div>
<a class="text-current p-2 cursor-pointer" tabindex="0" role="button" aria-label="Toggle theme" data-theme-toggle>${SUN}${MOON}</a>
<button class="block md:hidden p-2" aria-label="Toggle navigation" data-menu-toggle>${MENU}</button>
<div class="-mr-2"></div>
</nav>
<div class="flex flex-1 h-full">
<aside class="fixed h-screen bg-white dark:bg-dark flex-shrink-0 w-full md:w-64 md:sticky z-20 hidden md:block" style="top:4rem;height:calc(100vh - 4rem)" data-sidebar>
<div class="sidebar border-gray-200 dark:border-gray-900 w-full p-4 pb-40 md:pb-16 h-full overflow-y-auto">
${siteConfig.search ? `<div class="mb-4 block md:hidden">${searchBox()}</div>` : ""}
<div class="hidden md:block">${tree}</div>
<div class="md:hidden">${tree}</div>
</div>
</aside>
<article class="docs-container relative pt-16 pb-16 px-6 md:px-8 w-full max-w-full flex min-w-0">
<main class="max-w-screen-md mx-auto pt-4 z-10 min-w-0">
${content}
${navLinks(prev, next)}
</main>
<div class="w-64 hidden xl:block text-sm pl-4"></div>
</article>
</div>
</div>
<script id="search-index" type="application/json">${searchIndex}</script>
<script src="/theme/app.js" defer></script>
</body>
</html>
`;
}
