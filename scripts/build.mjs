import { build } from "esbuild";
import {
  cpSync,
  mkdirSync,
  rmSync,
  readFileSync,
  statSync,
  readdirSync,
} from "node:fs";
import { gzipSync } from "node:zlib";

const dev = process.argv.includes("--dev");
rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
await build({
  entryPoints: ["src/main.js"],
  outfile: "dist/app.js",
  bundle: true,
  format: "iife",
  target: ["es2020"],
  minify: !dev,
  sourcemap: dev,
  define: { __PROD__: String(!dev) },
  logLevel: "warning",
});
await build({
  entryPoints: ["src/styles/main.css"],
  outfile: "dist/app.css",
  bundle: true,
  minify: !dev,
  logLevel: "warning",
});
cpSync("public/index.html", "dist/index.html");
for (const f of readdirSync("dist")) {
  const b = readFileSync(`dist/${f}`);
  console.log(
    `${f}: ${statSync(`dist/${f}`).size} B (gzip ${gzipSync(b).length} B)`,
  );
}
