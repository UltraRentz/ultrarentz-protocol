import { useEffect, useMemo, useRef, useState } from "react";

/**
 * UltraRentz student demo: 3 screens, practice money, no extensions needed.
 * Yield maths mirrors the contract: 5% simple APY on the deposit over the tenancy.
 * This is a SIMULATION. It is labelled as such on screen.
 */

const APY = 0.05;
const CURRENCIES = { GBP: "£", INR: "₹" } as const;
type Cur = keyof typeof CURRENCIES;

// ---- tracking -------------------------------------------------------------
// Sends events to PostHog if it is on the page, and to an optional webhook
// (e.g. a Google Apps Script that appends rows to a Sheet). Always safe to fail.
const WEBHOOK_URL = ""; // paste your Apps Script / form endpoint here
function getRef(): string {
  try {
    return new URLSearchParams(window.location.search).get("ref") || "direct";
  } catch {
    return "direct";
  }
}
function track(event: string, props: Record<string, unknown> = {}) {
  const payload = { event, ref: getRef(), t: new Date().toISOString(), ...props };
  try {
    (window as any).posthog?.capture(event, payload);
  } catch {}
  try {
    if (WEBHOOK_URL)
      fetch(WEBHOOK_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
      });
  } catch {}
}

// ---- helpers --------------------------------------------------------------
const fmt = (n: number, d = 2) =>
  n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const todayISO = () => new Date().toISOString().slice(0, 10);
const addMonthsISO = (m: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() + m);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (a: string, b: string) =>
  Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));

type Step = "enter" | "grow" | "done";

export default function DemoFlow() {
  const [step, setStep] = useState<Step>("enter");
  const [cur, setCur] = useState<Cur>("GBP");
  const [deposit, setDeposit] = useState("1200");
  const [endDate, setEndDate] = useState(addMonthsISO(12));
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1 of tenancy elapsed
  const raf = useRef<number | null>(null);

  const amount = Math.max(0, parseFloat(deposit) || 0);
  const days = daysBetween(todayISO(), endDate);
  const totalYield = useMemo(() => amount * APY * (days / 365), [amount, days]);
  const valid = amount > 0 && days >= 30;
  const sym = CURRENCIES[cur];

  useEffect(() => {
    track("demo_opened");
  }, []);
  useEffect(() => () => {
    if (raf.current) cancelAnimationFrame(raf.current);
  }, []);

  function start() {
    track("deposit_entered", { amount, days, cur });
    setProgress(0);
    setStep("grow");
  }

  function fastForward() {
    track("fast_forward");
    const t0 = performance.now();
    const dur = 5000;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      setProgress(p);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else {
        raf.current = null;
      }
    };
    raf.current = requestAnimationFrame(tick);
  }

  function release() {
    track("released", { amount, yield: totalYield });
    setStep("done");
  }

  function saveEmail() {
    if (!/^\S+@\S+\.\S+$/.test(email)) return;
    track("email_signup", { email });
    setSaved(true);
  }

  const accrued = totalYield * progress;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-white">
      <div className="w-full max-w-md rounded-2xl bg-slate-800 p-6 shadow-xl">
        <div className="mb-4 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-200">
          Demo with practice money. No real money is used.
        </div>

        {step === "enter" && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">Your deposit should earn interest.</h1>
            <p className="text-slate-300 text-sm">
              See what your rent deposit could earn while your landlord holds it, and how it comes
              back on your end date.
            </p>

            <div className="flex gap-2 text-sm">
              {(Object.keys(CURRENCIES) as Cur[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCur(c)}
                  className={`rounded-full px-3 py-1 ${
                    cur === c ? "bg-emerald-500 text-slate-900" : "bg-slate-700"
                  }`}
                >
                  {CURRENCIES[c]} {c}
                </button>
              ))}
            </div>

            <label className="block text-sm">
              Deposit amount
              <input
                inputMode="decimal"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                className="mt-1 w-full rounded-lg bg-slate-700 px-3 py-3 text-lg"
              />
            </label>

            <label className="block text-sm">
              Tenancy end date
              <input
                type="date"
                value={endDate}
                min={addMonthsISO(1)}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-lg bg-slate-700 px-3 py-3 text-lg"
              />
            </label>

            {valid && (
              <div className="rounded-lg bg-slate-700 p-3 text-sm">
                Estimated interest by your end date:{" "}
                <span className="font-bold text-emerald-400">
                  {sym}
                  {fmt(totalYield)}
                </span>{" "}
                <span className="text-slate-400">(5% a year, illustrative)</span>
              </div>
            )}

            <button
              disabled={!valid}
              onClick={start}
              className="w-full rounded-lg bg-emerald-500 py-3 font-semibold text-slate-900 disabled:opacity-40"
            >
              Start my deposit
            </button>
          </div>
        )}

        {step === "grow" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Your deposit is growing</h2>
            <div className="rounded-xl bg-slate-700 p-4 text-center">
              <div className="text-sm text-slate-300">Deposit held</div>
              <div className="text-3xl font-bold">
                {sym}
                {fmt(amount)}
              </div>
              <div className="mt-3 text-sm text-slate-300">Interest so far</div>
              <div className="text-3xl font-bold text-emerald-400">
                +{sym}
                {fmt(accrued, 4)}
              </div>
            </div>

            <div className="h-2 w-full rounded bg-slate-700">
              <div
                className="h-2 rounded bg-emerald-500"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="text-xs text-slate-400">
              {Math.round(progress * days)} of {days} days of your tenancy
            </div>

            {progress === 0 && (
              <button
                onClick={fastForward}
                className="w-full rounded-lg bg-slate-600 py-3 font-semibold"
              >
                Fast-forward to my end date
              </button>
            )}
            {progress === 1 && (
              <button
                onClick={release}
                className="w-full rounded-lg bg-emerald-500 py-3 font-semibold text-slate-900"
              >
                Tenancy ended: get my deposit back
              </button>
            )}
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 text-center">
            <h2 className="text-xl font-bold">Your deposit is back</h2>
            <div className="rounded-xl bg-slate-700 p-4">
              <div className="text-sm text-slate-300">Returned to you</div>
              <div className="text-4xl font-bold text-emerald-400">
                {sym}
                {fmt(amount + totalYield)}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {sym}
                {fmt(amount)} deposit + {sym}
                {fmt(totalYield)} interest
              </div>
            </div>
            <p className="text-sm text-slate-300">
              No chasing your landlord. It came back automatically on your end date.
            </p>

            {!saved ? (
              <div className="space-y-2 text-left">
                <label className="block text-sm">
                  Want early access when this opens in your country?
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="mt-1 w-full rounded-lg bg-slate-700 px-3 py-3"
                  />
                </label>
                <button
                  onClick={saveEmail}
                  className="w-full rounded-lg bg-emerald-500 py-3 font-semibold text-slate-900"
                >
                  Join the waiting list
                </button>
              </div>
            ) : (
              <div className="rounded-lg bg-emerald-500/15 p-3 text-sm text-emerald-300">
                Thanks. You're on the list.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}