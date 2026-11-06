import { callback, cfgFromEnv } from "./_lib/world";
export default async function handler(req: any, res: any) {
  const out = await callback(cfgFromEnv(process.env), Object.fromEntries(new URL(req.url, "http://x").searchParams));
  if (out.kind === "redirect") res.redirect(302, out.location);
  else res.status(out.status).json(out.body);
}
