/**
 * Static file server for `dist/`, using only node:http.
 * `node serve.ts [port]`
 *
 * `dev.ts` imports `startServer` to get the same server plus live reload.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const defaultDistDir = path.join(rootDir, "dist");

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

/** Endpoints the dev server owns; they never hit the filesystem. */
const RELOAD_STREAM = "/__dev__/reload";

/**
 * Injected into every HTML response in dev. Reconnects on its own, so a rebuild
 * that restarts nothing still reaches a tab left open overnight.
 */
const RELOAD_CLIENT = `<script>
(function () {
  var source = new EventSource(${JSON.stringify(RELOAD_STREAM)});
  source.addEventListener("reload", function () { location.reload(); });
  source.addEventListener("error", function (event) {
    if (event.data) console.error("[dev] build failed:\\n" + event.data);
  });
})();
</script>`;

function resolve(distDir: string, urlPath: string): string | null {
  let clean: string;
  try {
    clean = decodeURIComponent(urlPath.split("?")[0]!);
  } catch {
    return null; // Malformed percent-encoding.
  }

  const target = path.join(distDir, clean);
  // Refuse anything that escapes dist/. The separator matters: without it a
  // sibling directory like `dist-backup` would pass the prefix test.
  if (target !== distDir && !target.startsWith(distDir + path.sep)) return null;

  const candidates = path.extname(target)
    ? [target]
    : [path.join(target, "index.html"), `${target}.html`];

  return candidates.find((file) => fs.existsSync(file) && fs.statSync(file).isFile()) ?? null;
}

export type ServerOptions = {
  port?: number;
  distDir?: string;
  /** Adds the reload endpoint and injects the client into HTML responses. */
  liveReload?: boolean;
};

export type DevServer = {
  server: http.Server;
  /** Tell every connected browser to reload. No-op without `liveReload`. */
  reload(): void;
  /** Surface a build failure in the browser console without reloading. */
  reportError(message: string): void;
};

export function startServer(options: ServerOptions = {}): DevServer {
  const distDir = options.distDir ?? defaultDistDir;
  const port = options.port ?? Number(process.argv[2] ?? process.env.PORT ?? 3000);
  const liveReload = options.liveReload ?? false;
  const clients = new Set<http.ServerResponse>();

  const server = http.createServer((request, response) => {
    const url = request.url ?? "/";

    if (liveReload && url === RELOAD_STREAM) {
      response.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-store",
        connection: "keep-alive",
      });
      response.write("retry: 500\n\n");
      clients.add(response);
      request.on("close", () => clients.delete(response));
      return;
    }

    const file = resolve(distDir, url);

    if (!file) {
      const notFound = path.join(distDir, "404.html");
      let body = fs.existsSync(notFound) ? fs.readFileSync(notFound, "utf8") : "Not found";
      if (liveReload) body = withReloadClient(body);
      response.writeHead(404, {
        "content-type": "text/html; charset=utf-8",
        ...(liveReload ? { "cache-control": "no-store" } : {}),
      });
      response.end(body);
      return;
    }

    const type = TYPES[path.extname(file)] ?? "application/octet-stream";
    const isHtml = path.extname(file) === ".html";

    response.writeHead(200, {
      "content-type": type,
      // Dev must never serve a stale page after a rebuild.
      ...(liveReload ? { "cache-control": "no-store" } : {}),
    });
    response.end(
      liveReload && isHtml
        ? withReloadClient(fs.readFileSync(file, "utf8"))
        : fs.readFileSync(file),
    );
  });

  server.listen(port, () => {
    console.log(`serving dist/ on http://localhost:${port}`);
  });

  const send = (event: string, data = ""): void => {
    const payload = `event: ${event}\ndata: ${data.replace(/\n/g, "\ndata: ")}\n\n`;
    for (const client of clients) client.write(payload);
  };

  return {
    server,
    reload: () => send("reload"),
    reportError: (message) => send("error", message),
  };
}

function withReloadClient(html: string): string {
  return html.includes("</body>")
    ? html.replace("</body>", `${RELOAD_CLIENT}\n</body>`)
    : html + RELOAD_CLIENT;
}

// Only listen when run directly — dev.ts imports this and binds its own port.
if (process.argv[1] && import.meta.filename === path.resolve(process.argv[1])) {
  startServer();
}
