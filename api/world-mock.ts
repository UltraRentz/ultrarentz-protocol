// DEMO ONLY stand-in for the World screen, served only when WORLD_MOCK=1.
// It lets the rest of the Passport flow be shown while World credentials are pending.
// It is NOT World ID and does not count as the official Agent Pass integration.
export default async function handler(req: any, res: any) {
  if (process.env.WORLD_MOCK !== "1") return res.status(404).send("Not found");
  const state = new URL(req.url, "http://x").searchParams.get("state") ?? "";
  const esc = (v: string) => v.replace(/[^A-Za-z0-9_-]/g, "");
  const s = esc(state);
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.status(200).send(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MOCK human check</title>
<body style="font-family:system-ui;background:#0f172a;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0">
<main style="max-width:26rem;padding:1.5rem;background:#1e293b;border-radius:1rem">
<p style="background:#f59e0b;color:#111;padding:.4rem .6rem;border-radius:.4rem;font-weight:700">MOCK: stand-in for World ID. Not a real identity check.</p>
<h1 style="font-size:1.2rem">Confirm you are a person</h1>
<p>This stands in for the World ID step while World credentials are pending. Choose an outcome to see both paths.</p>
<p><a href="/api/world-callback?state=${s}&code=mock" style="display:block;text-align:center;background:#10b981;color:#0f172a;padding:.8rem;border-radius:.5rem;font-weight:700;text-decoration:none">Approve (simulate a verified person)</a></p>
<p><a href="/api/world-callback?state=${s}&error=access_denied" style="display:block;text-align:center;background:#475569;color:#fff;padding:.8rem;border-radius:.5rem;text-decoration:none">Decline (simulate a refusal)</a></p>
</main></body>`);
}
