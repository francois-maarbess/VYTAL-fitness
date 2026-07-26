import { build } from "esbuild";
import { fileURLToPath } from "url";

const workspaceDbPlugin = {
  name: "workspace-db-alias",
  setup(builder) {
    builder.onResolve({ filter: /^@workspace\/db$/ }, () => {
      const p = fileURLToPath(new URL("../lib/db/src/index.ts", import.meta.url));
      return { path: p };
    });
  },
};

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
  plugins: [workspaceDbPlugin],
  external: ["pino-pretty"],
  logLevel: "info",
});
