import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const symbol = (req.query.symbol as string) || "AAPL";
    const interval = (req.query.interval as string) || "5min";
    const outputsize = (req.query.outputsize as string) || "50";

    const apikey = process.env.API_KEY || "demo";
    const url = new URL("https://api.twelvedata.com/time_series");
    url.searchParams.set("symbol", symbol.toUpperCase());
    url.searchParams.set("interval", interval);
    url.searchParams.set("outputsize", outputsize);
    url.searchParams.set("order", "asc");
    url.searchParams.set("apikey", apikey);

    const upstream = await fetch(url.toString());
    const data = await upstream.json();

    if (data?.status === "error") {
      return res.status(502).json({ error: true, message: data?.message || "Upstream time_series error" });
    }

    // Normalize to simple arrays for charting
    const series = Array.isArray(data?.values)
      ? data.values.map((d: any) => ({ t: d.datetime, c: Number(d.close) }))
      : [];

    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");
    res.status(200).json({ symbol, interval, series });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message || String(e) });
  }
}
