/**
 * Local (non-Replit) development launcher. Replit injects DATABASE_URL, PORT,
 * BASE_PATH and its own domains; this script supplies equivalents so the
 * workspace runs on any machine, including Windows.
 *
 *   pnpm local          embedded Postgres + schema push + API + admin
 *   pnpm local:db       embedded Postgres only (data in .local/pgdata)
 *   pnpm local:push     push the Drizzle schema to DATABASE_URL
 *   pnpm local:api      API server on :8080
 *   pnpm local:admin    admin dashboard on :23744/admin/ (proxies /api)
 *   pnpm local:mobile   Expo dev server, pointed at the API on your LAN IP
 *
 * Values in a root `.env` file override the defaults below.
 */
import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";
import { existsSync } from "node:fs";
import { networkInterfaces } from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..", "..");
const envFile = path.join(root, ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const PG_PORT = Number(process.env.LOCAL_PG_PORT ?? 5433);
const PG_DB = "safealert";
const API_PORT = Number(process.env.LOCAL_API_PORT ?? 8080);
const ADMIN_PORT = Number(process.env.LOCAL_ADMIN_PORT ?? 23744);

process.env.DATABASE_URL ??= `postgres://postgres:postgres@localhost:${PG_PORT}/${PG_DB}`;

const children: ChildProcess[] = [];

function run(
  label: string,
  command: string,
  args: string[],
  opts: { cwd?: string; env?: Record<string, string>; prefix?: boolean } = {},
): Promise<number> {
  const spawnOpts: SpawnOptions = {
    cwd: opts.cwd ?? root,
    env: { ...process.env, ...opts.env },
    stdio: opts.prefix ? ["ignore", "pipe", "pipe"] : "inherit",
  };
  // Windows needs a shell to resolve pnpm.cmd; pass one pre-quoted command
  // string rather than an args array (Node deprecates the latter).
  const child =
    process.platform === "win32"
      ? spawn(
          [command, ...args].map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(" "),
          { ...spawnOpts, shell: true },
        )
      : spawn(command, args, spawnOpts);
  children.push(child);
  if (opts.prefix) {
    const write = (stream: NodeJS.WriteStream) => (chunk: Buffer) => {
      for (const line of chunk.toString().split(/\r?\n/)) {
        if (line) stream.write(`[${label}] ${line}\n`);
      }
    };
    child.stdout?.on("data", write(process.stdout));
    child.stderr?.on("data", write(process.stderr));
  }
  return new Promise((resolve) => child.on("exit", (code) => resolve(code ?? 0)));
}

async function startDb(): Promise<() => Promise<void>> {
  if (process.platform === "linux") {
    throw new Error(
      "Embedded Postgres binaries are not installed on Linux. Set DATABASE_URL in .env to an existing database instead.",
    );
  }
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  const databaseDir = path.join(root, ".local", "pgdata");
  const pg = new EmbeddedPostgres({
    databaseDir,
    port: PG_PORT,
    user: "postgres",
    password: "postgres",
    persistent: true,
    onLog: () => {},
    onError: (err) => console.error("[db]", err),
  });
  if (!existsSync(path.join(databaseDir, "PG_VERSION"))) {
    console.log(`[db] initialising new cluster in ${databaseDir}`);
    await pg.initialise();
  }
  await pg.start();
  try {
    await pg.createDatabase(PG_DB);
  } catch {
    // already exists
  }
  console.log(`[db] Postgres ready on localhost:${PG_PORT} (database "${PG_DB}")`);
  return () => pg.stop();
}

function pushSchema(): Promise<number> {
  return run("push", "pnpm", ["--filter", "@workspace/db", "run", "push"]);
}

async function api(prefix = false): Promise<number> {
  const cwd = path.join(root, "artifacts", "api-server");
  const env = { NODE_ENV: "development", PORT: String(API_PORT) };
  const built = await run("api", "node", ["./build.mjs"], { cwd, env, prefix });
  if (built !== 0) return built;
  return run("api", "node", ["--enable-source-maps", "./dist/index.mjs"], { cwd, env, prefix });
}

function admin(prefix = false): Promise<number> {
  return run("admin", "pnpm", ["--filter", "@workspace/admin", "run", "dev"], {
    prefix,
    env: {
      PORT: String(ADMIN_PORT),
      BASE_PATH: "/admin/",
      API_PROXY_TARGET: `http://localhost:${API_PORT}`,
    },
  });
}

function lanAddress(): string {
  for (const addrs of Object.values(networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family === "IPv4" && !a.internal) return a.address;
    }
  }
  return "localhost";
}

function mobile(): Promise<number> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? `http://${lanAddress()}:${API_PORT}`;
  console.log(`[mobile] API base URL: ${apiUrl}`);
  return run("mobile", "pnpm", ["exec", "expo", "start", "--port", "8081"], {
    cwd: path.join(root, "artifacts", "safe-alert"),
    env: { EXPO_PUBLIC_API_URL: apiUrl },
  });
}

async function main() {
  const target = process.argv[2] ?? "all";
  let stopDb: (() => Promise<void>) | null = null;

  const shutdown = async (code: number) => {
    for (const c of children) {
      if (c.exitCode !== null || !c.pid) continue;
      // On Windows the child is a shell; kill its whole tree, not just cmd.exe.
      if (process.platform === "win32") spawn("taskkill", ["/pid", String(c.pid), "/T", "/F"]);
      else c.kill();
    }
    if (stopDb) await stopDb().catch(() => {});
    process.exit(code);
  };
  process.on("SIGINT", () => void shutdown(0));
  process.on("SIGTERM", () => void shutdown(0));

  switch (target) {
    case "db":
      stopDb = await startDb();
      console.log("[db] press Ctrl+C to stop");
      return;
    case "push":
      return shutdown(await pushSchema());
    case "api":
      return shutdown(await api());
    case "admin":
      return shutdown(await admin());
    case "mobile":
      return shutdown(await mobile());
    case "all": {
      stopDb = await startDb();
      const pushed = await pushSchema();
      if (pushed !== 0) return shutdown(pushed);
      console.log(
        `\nAPI    http://localhost:${API_PORT}/api/healthz\nAdmin  http://localhost:${ADMIN_PORT}/admin/\nRun \`pnpm local:mobile\` in another terminal for the Expo app.\n`,
      );
      const code = await Promise.race([api(true), admin(true)]);
      return shutdown(code);
    }
    default:
      console.error(`Unknown target "${target}". Use: all | db | push | api | admin | mobile`);
      return shutdown(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
