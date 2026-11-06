import { callback, cfgFromEnv } from "./_lib/world.js";
export default async function handler(req: any, res: any) {
  try {
    const out = await callback(cfgFromEnv(process.env), Object.fromEntries(new URL(req.url, "http://x").searchParams));
    if (out.kind === "redirect") res.redirect(302, out.location);
    else res.status(out.status).json(out.body);
  } catch (e: any) {
    console.error("world-callback failed:", e?.message ?? e); // message only, never the config
    res.redirect(302, "/passport#world_error=server_error");
  }
}
