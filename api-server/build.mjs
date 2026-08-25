import { build } from "esbuild";

const nodeBuiltins = new Set([
  "assert", "buffer", "child_process", "cluster", "console", "constants",
  "crypto", "dgram", "dns", "domain", "events", "fs", "http", "https",
  "module", "net", "os", "path", "process", "punycode", "querystring",
  "readline", "repl", "stream", "string_decoder", "timers", "tls",
  "tty", "url", "util", "v8", "vm", "zlib",
]);

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.mjs",
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  sourcemap: true,
  packages: "external",
  external: ["pino-pretty"],
  logLevel: "info",
});
