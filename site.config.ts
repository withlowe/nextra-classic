/** Replaces the old theme.config.js — same knobs, same values. */
export const siteConfig = {
  titleSuffix: " – Nextra",
  defaultTitle: "Untitled",
  description: "Nextra: the next docs builder",
  search: true,
  prevLinks: true,
  nextLinks: true,
  footer: false,
  lang: "en",
  logo:
    '<span class="mr-2 font-extrabold md:inline">Nextra</span>' +
    '<span class="text-gray-600 font-normal hidden md:inline">The Next Site Builder (v1.0)</span>',
  head:
    '<meta name="msapplication-TileColor" content="#ffffff"/>' +
    '<meta name="theme-color" content="#ffffff"/>' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0"/>' +
    '<meta http-equiv="Content-Language" content="en"/>' +
    '<meta name="description" content="Nextra: the next docs builder"/>' +
    '<meta name="twitter:card" content="summary_large_image"/>' +
    '<meta name="twitter:site" content="@shuding_"/>' +
    '<meta property="og:title" content="Nextra: the next docs builder"/>' +
    '<meta property="og:description" content="Nextra: the next docs builder"/>' +
    '<meta name="apple-mobile-web-app-title" content="Nextra"/>',
};
