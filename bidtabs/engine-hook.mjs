// Lets an offline node script import the app's pure takeoff modules (TypeScript) as they are: node 24 strips the types,
// and this resolve hook adds the ".ts" the app's extensionless imports leave out and maps the "@/" alias to the app's src.
// D-1291: "/src/..." (the path the dev server serves a module at, as contract-runner.js imports them in the page) maps to
// the app's src too, so offline-parity.mjs can run the runner's engine half in node.
// Read-only: nothing here writes or changes the app. Use: node --import ./bidtabs/engine-hook.mjs bidtabs/<script>.mjs
//   APP_SRC overrides the app's src folder (default: the sibling checkout ../intelcost-app-react/src).
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve as resolvePath } from "node:path";

if (!globalThis.__engineHook) {
  globalThis.__engineHook = true;
  const src = process.env.APP_SRC ?? resolvePath(import.meta.dirname, "../../intelcost-app-react/src");
  const srcUrl = pathToFileURL(src).href + "/";
  const hook = `
const SRC = ${JSON.stringify(srcUrl)};
export async function resolve(spec, ctx, next) {
  if (spec.startsWith("@/")) spec = SRC + spec.slice(2);
  else if (spec.startsWith("/src/")) spec = SRC + spec.slice(5);
  const rel = spec.startsWith("./") || spec.startsWith("../") || spec.startsWith("file:");
  if (rel && !/\\.[cm]?[jt]sx?$/.test(spec)) {
    try { return await next(spec + ".ts", ctx); } catch { return next(spec + "/index.ts", ctx); }
  }
  return next(spec, ctx);
}`;
  register("data:text/javascript," + encodeURIComponent(hook), import.meta.url);
}
export const APP_SRC_URL = pathToFileURL(process.env.APP_SRC ?? resolvePath(import.meta.dirname, "../../intelcost-app-react/src")).href + "/";
