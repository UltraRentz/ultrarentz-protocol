import { cfgFromEnv, start } from "./_lib/world.js";
export default async function handler(req: any, res: any) {
  try {
    const out = await start(cfgFromEnv(process.env), Object.fromEntries(new URL(req.url, "http://x").searchParams));
    if (out.kind === "json") res.status(out.status).json(out.body);
    else res.redirect(302, out.location);
  } catch (e: any) {
    console.error("world-start failed:", e?.message ?? e); // message only, never the config
    res.status(500).json({ ok: false, error: "server_error", detail: String(e?.message ?? e).slice(0, 200) });
  }
}
