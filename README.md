# Nextra (Classic)

A static docs site with **zero dependencies** — no framework, no build tooling,
nothing in `node_modules`. It carries the original `nextra-theme-docs@1.x` design
forward verbatim, with working search.

Everything runs on Node 24, which executes the TypeScript sources directly via native type stripping.

![](/public/demo.png)

## Usage

```bash
npm run dev
```

| Script          | Does                                              |
| :-------------- | :------------------------------------------------ |
| `npm run build` | Renders `content/` into `dist/`                    |
| `npm start`     | Serves `dist/` on :3000                            |
| `npm run dev`   | Build, serve, **watch, and live-reload**           |
| `npm run check` | Build, then verify structure, links, search index  |

`dist/` is plain HTML/CSS/JS — host it anywhere, no server required.

### Dev server

`npm run dev` watches `content/`, `src/`, `theme/`, `public/`, `site.config.ts`,
and `build.ts`. Any change — including a **new** `.mdx` file or a **new**
subfolder — rebuilds the whole site and reloads every open browser tab.

Watching is recursive, so directories created after the server starts are picked
up without restarting it. Each rebuild runs in a fresh child process, which is
what makes editing the generator itself (`src/layout.ts`, `src/markdown.ts`,
`site.config.ts`) take effect — an in-process rebuild would keep serving the
module already in Node's ESM cache.

Rebuilds are debounced, so one save is one build, and a build that fails leaves
the last good `dist/` in place: the server keeps serving, the error prints to the
terminal and to the browser console, and the next save recovers.

Live reload is injected at serve time and never written to `dist/` — the built
output is identical whether or not you used the dev server.

## Deploying

The site is **built on the host** from source. Push, and the deploy rebuilds —
adding a page to `content/` is the whole workflow, with no build artifact to
commit.

| Host             | Config          | Build command   | Output |
| :--------------- | :-------------- | :-------------- | :----- |
| Vercel           | `vercel.json`   | `npm run build` | `dist` |
| Netlify          | `netlify.toml`  | `npm run build` | `dist` |
| Cloudflare Pages | `wrangler.toml` | `npm run build` | `dist` |

All three configs are committed, so connecting the repo is the only setup step.
`npm install` installs nothing — there are no dependencies — so the build is just
`node build.ts`.

### Node version

`node build.ts` runs TypeScript directly via native type stripping, so the host
needs **Node 22.18+ or 24**. The build command passes
`--experimental-strip-types`, which is required on 22.6–22.17 and accepted as a
no-op on 22.18+ and 24 — one command that works across every runtime the hosts
offer.

Each host picks its version differently:

- **Vercel** reads `engines.node` in `package.json` (`>=22.18.0`). If the deploy
  fails on the version, set it explicitly in *Project Settings → Node.js Version*.
- **Netlify** reads `NODE_VERSION` in `netlify.toml` (`24`).
- **Cloudflare Pages** reads `.node-version` (`24`).

`.node-version` is also honoured by Netlify and by most local version managers,
so local and CI agree by default.

### Cloudflare Pages

`wrangler.toml` declares the output directory. Set the build command once, either
in the dashboard (*Settings → Builds*, command `npm run build`) or by deploying
from the CLI:

```bash
npx wrangler pages deploy
```

### Before pushing

```bash
npm run check
```

`check.ts` fails if any page, link, or asset is broken. Run it before pushing
rather than finding out from the deployed site — the hosts will happily publish a
site with dead internal links.

### Keeping `dist/` committed instead

`dist/` is gitignored, since all three hosts now build it. To go back to
uploading a prebuilt `dist/` — worth it only if you cannot get a working Node
version on the host — drop `dist/` from `.gitignore`, set Vercel's
`installCommand` and `buildCommand` back to `""`, and commit the output on every
content change.

## Layout

| Path                   | Purpose                                                     |
| :--------------------- | :---------------------------------------------------------- |
| `content/`             | The docs — `.mdx` files, routed by file path                 |
| `content/**/meta.json` | Sidebar titles and ordering for a folder                     |
| `build.ts`             | The generator: content → `dist/`                             |
| `check.ts`             | Post-build verification                                      |
| `serve.ts`             | Static server (`node:http`) + dev live-reload transport      |
| `dev.ts`               | Watch `content/` and site files, rebuild, reload the browser |
| `src/markdown.ts`      | Markdown/MDX → HTML                                          |
| `src/layout.ts`        | The page shell — this markup **is** the design               |
| `src/page-map.ts`      | Builds the page tree from `content/`                         |
| `theme/globals.css`    | The original theme stylesheet, unmodified                    |
| `theme/app.js`         | Theme toggle, mobile menu, folder collapse, search           |
| `site.config.ts`       | Logo and feature flags (replaces the old `theme.config.js`)  |
| `vercel.json`          | Vercel deploy config — build on the host, publish `dist/`     |
| `netlify.toml`         | Netlify deploy config                                        |
| `wrangler.toml`        | Cloudflare Pages deploy config                               |
| `.node-version`        | Node pin for Cloudflare Pages, Netlify, and local managers   |
| `dist/`                | Build output; gitignored, rebuilt on every deploy            |

### Adding a page

Drop an `.mdx` file into `content/`. It picks up a route, a sidebar entry,
prev/next links, and search coverage automatically — and if `npm run dev` is
running, it appears in the browser immediately. To set its title or
position, add a `meta.json` next to it:

```json
{
  "code-highlighting": "Code Highlighting",
  "get-started": "Get Started"
}
```

Keys listed there are ordered first, in that order; anything omitted follows
alphabetically.

### Search

Built at build time and inlined into each page, so it works offline and needs no
service. It indexes page titles and every heading; heading hits link straight to
the anchor. `/` focuses the box, arrows or `Ctrl-N`/`Ctrl-P` move, `Enter` opens,
`Escape` closes.

### Markdown support

Headings, paragraphs, lists (including loose lists and `- [ ]` task lists),
fenced code, tables with alignment, blockquotes (nested), thematic breaks,
images, links, `**bold**`, `_italic_`, `~~strikethrough~~`, inline code, and
two-space hard breaks. MDX comments (`{/* … */}`) are stripped.

`Image`, `Callout`, and `Bleed` are available in content without an import — see
`COMPONENTS` in `src/markdown.ts` to add more.

## Notes

- `theme/globals.css` is the compiled Tailwind 2 bundle from the old theme. It is
  a vendored asset — edit it only to change the design. The class strings in
  `src/layout.ts` are likewise load-bearing.
- Code blocks are not syntax highlighted, matching the previous build.
- Rendered output is verified byte-for-byte against the previous build's HTML.

---

Design by [@shuding](https://github.com/shuding) and
[@pacocoursey](https://github.com/pacocoursey) at [Vercel](https://vercel.com).
Released under the MIT license.
