// API-upload alternative for environments whose connector cannot upload asset-session JWTs.
// The same reviewed app bundle is used. Static files are immutable module constants.
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { URL } from "node:url";
const root = new URL("../", import.meta.url).pathname;
const out = join(root, "work/upload");
await mkdir(out, { recursive: true });
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
};
const assets = {};
async function walk(dir, base = "") {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = base + "/" + entry.name;
    if (entry.isDirectory()) await walk(join(dir, entry.name), rel);
    else
      assets[rel] = {
        body: (await readFile(join(dir, entry.name))).toString("base64"),
        type: mime[extname(entry.name)] || "application/octet-stream",
      };
  }
}
await walk(join(root, "dist"));
const assetsCode = `const files=${JSON.stringify(assets)};export default {async fetch(request){const path=new URL(request.url).pathname;const asset=files[path]||files['/index.html'];const bytes=Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0));return new Response(request.method==='HEAD'?null:bytes,{headers:{'content-type':asset.type,'cache-control':files[path]&&path.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache'}});}};`;
await writeFile(join(out, "assets.js"), assetsCode);
await writeFile(
  join(out, "app.js"),
  await readFile(join(root, "work/worker-bundle/index.js")),
);
await writeFile(
  join(out, "index.js"),
  `import app from './app.js';import assets from './assets.js';export default {fetch(request,env,ctx){return app.fetch(request,{...env,ASSETS:assets},ctx)},scheduled:eventScheduled};async function eventScheduled(event,env,ctx){return app.scheduled(event,env,ctx)}`,
);
console.log("Prepared API upload modules; no credentials included.");
