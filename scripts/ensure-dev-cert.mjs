import { existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(scriptDir);
const certDir = join(projectRoot, ".cert");
const keyPath = join(certDir, "localhost-key.pem");
const certPath = join(certDir, "localhost.pem");

if (existsSync(keyPath) && existsSync(certPath)) {
  process.exit(0);
}

mkdirSync(certDir, { recursive: true });

const runMkcert = (args) => {
  const result = spawnSync("mkcert", args, {
    cwd: projectRoot,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`mkcert exited with status ${result.status ?? "unknown"}.`);
  }
};

try {
  runMkcert(["-install"]);
  runMkcert([
    "-key-file",
    keyPath,
    "-cert-file",
    certPath,
    "localhost",
    "127.0.0.1",
    "::1",
  ]);
} catch (error) {
  console.error(
    "Unable to create a trusted local HTTPS certificate for Storyblok preview.",
  );
  console.error(
    "Make sure mkcert is installed and available in PATH, then rerun npm run dev.",
  );
  throw error;
}
