/**
 * Dev server: build, serve, watch, live reload.
 * `node dev.ts [port]`
 *
 * Watches the content and the site sources alike, so adding an .mdx file, a
 * meta.json, a stylesheet, or editing the generator itself all rebuild `dist/`
 * and reload the browser.
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { startServer } from "./serve.ts";

const rootDir = import.meta.dirname;
const port = Number(process.argv[2] ?? process.env.PORT ?? 3000);

/**
 * Everything a build reads. Directories are watched recursively, so files and
 * folders added later are picked up without restarting.
 */
const WATCHED = [
  "content",
  "src",
  "theme",
  "public",
  "site.config.ts",
  "build.ts",
];

/** Editor scratch files and OS noise — these must not trigger a rebuild. */
const IGNORED = /(?:^|[\\/])(?:\.DS_Store|\.git|4913|~)|(?:\.sw[px]|~|\.tmp)$/;

const DEBOUNCE_MS = 40;

let building = false;
let pending = false;
let timer: NodeJS.Timeout | null = null;

const server = startServer({ port, liveReload: true });

function runBuild(): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    // A child process gives every rebuild a fresh module graph — editing
    // src/layout.ts takes effect without the ESM cache serving the old copy.
    const child = spawn(
      process.execPath,
      ["--experimental-strip-types", path.join(rootDir, "build.ts")],
      { cwd: rootDir, stdio: ["ignore", "pipe", "pipe"] },
    );

    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.on("error", (error) => resolve({ ok: false, output: String(error) }));
    child.on("close", (code) => resolve({ ok: code === 0, output: output.trim() }));
  });
}

async function rebuild(reason: string): Promise<void> {
  if (building) {
    pending = true; // Coalesce: one more pass after the current build lands.
    return;
  }
  building = true;

  const { ok, output } = await runBuild();
  if (ok) {
    console.log(`${reason} → ${output}`);
    server.reload();
  } else {
    console.error(`${reason} → build failed:\n${output}`);
    server.reportError(output);
  }

  building = false;
  if (pending) {
    pending = false;
    await rebuild("rebuild");
  }
}

function schedule(reason: string): void {
  // A single save often emits several events; collapse them into one build.
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void rebuild(reason);
  }, DEBOUNCE_MS);
}

function watch(target: string): void {
  const absolute = path.join(rootDir, target);
  if (!fs.existsSync(absolute)) return;

  const isDirectory = fs.statSync(absolute).isDirectory();
  try {
    fs.watch(absolute, { recursive: isDirectory }, (_event, filename) => {
      const name = filename ? String(filename) : "";
      if (name && IGNORED.test(name)) return;
      // For a watched file, `filename` is already its basename.
      schedule(`${isDirectory ? path.join(target, name) : target} changed`);
    });
  } catch (error) {
    console.warn(`! cannot watch ${target}: ${(error as Error).message}`);
  }
}

await rebuild("initial build");
for (const target of WATCHED) watch(target);
console.log(`watching ${WATCHED.join(", ")} — edit anything to rebuild`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.server.close();
    process.exit(0);
  });
}
