import { cfgFromEnv, start } from "./_lib/world";
export default async function handler(req: any, res: any) {
  const out = await start(cfgFromEnv(process.env), Object.fromEntries(new URL(req.url, "http://x").searchParams));
  if (out.kind === "json") res.status(out.status).json(out.body);
  else res.redirect(302, out.location);
}
