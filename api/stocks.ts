import type { VercelRequest, VercelResponse } from "@vercel/node";

function toNumber(x: any): number {
  if (x === null || x === undefined) return 0;
  if (typeof x === "string") return Number(x.replace(/%/g, "")) || 0;
  return Number(x) || 0;
}

async function fetchQuoteBatch(symbols: string[], apikey: string): Promise<any> {
  const tdUrl = new URL("https://api.twelvedata.com/quote");
  tdUrl.searchParams.set("symbol", symbols.join(","));
  tdUrl.searchParams.set("apikey", apikey);
  const res = await fetch(tdUrl.toString());
  return res.json();
}

async function fetchQuoteSingle(symbol: string, apikey: string): Promise<any> {
  const tdUrl = new URL("https://api.twelvedata.com/quote");
  tdUrl.searchParams.set("symbol", symbol);
  tdUrl.searchParams.set("apikey", apikey);
  const res = await fetch(tdUrl.toString());
  return res.json();
}

const normalizeBatch = (symbols: string[], data: any) => {
  let normalized: Array<{ symbol: string; price: number; change_percent: number; updated?: string }> = [];

  if (!data || typeof data !== "object") return normalized;

  if (Array.isArray(data.data)) {
    normalized = data.data.map((d: any) => ({
      symbol: d.symbol,
      price: toNumber(d.price ?? d.close ?? d.last),
      change_percent: toNumber(d.percent_change ?? d.change_percent ?? d.change),
      updated: d.datetime || d.timestamp || d.last_trade_time,
    }));
    return normalized;
  }

  if (data.symbol || data.name || data.price) {
    normalized = [
      {
        symbol: data.symbol ?? symbols[0],
        price: toNumber(data.price ?? data.close ?? data.last),
        change_percent: toNumber(data.percent_change ?? data.change_percent ?? data.change),
        updated: data.datetime || data.timestamp || data.last_trade_time,
      },
    ];
    return normalized;
  }

  // Map of symbol -> quote
  normalized = symbols.map(sym => {
    const d = (data as any)?.[sym];
    return {
      symbol: sym,
      price: toNumber(d?.price ?? d?.close ?? d?.last),
      change_percent: toNumber(d?.percent_change ?? d?.change_percent ?? d?.change),
      updated: d?.datetime || d?.timestamp || d?.last_trade_time,
    };
  });

  return normalized;
};

async function fetchStocks(symbols: string[], apikey: string) {
  // Try batch first
  const batch = await fetchQuoteBatch(symbols, apikey);
  // TwelveData error format often has "status": "error" or "code"/"message"
  const isError = batch?.status === "error" || (batch?.code && batch?.message);
  let normalized = isError ? [] : normalizeBatch(symbols, batch);

  // If batch failed or produced all zeros/empty, try per-symbol fallback
  const allZeroOrEmpty = normalized.length === 0 || normalized.every(r => !r.price);
  if (isError || allZeroOrEmpty) {
    const results = await Promise.all(
      symbols.map(async sym => {
        try {
          const d = await fetchQuoteSingle(sym, apikey);
          if (d?.status === "error") return null;
          const r = normalizeBatch([sym], d)[0];
          return r && r.price ? r : null;
        } catch {
          return null;
        }
      }),
    );
    normalized = results.filter(Boolean) as typeof normalized;
  }

  return normalized;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const symbolsParam = (req.query.symbols as string) || "AAPL,MSFT,GOOGL,AMZN,NVDA";
    const symbols = symbolsParam
      .split(",")
      .map(s => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 20);

    const apikey = process.env.API_KEY || "demo";
    const data = await fetchStocks(symbols, apikey!);

    if (!data.length) {
      return res.status(502).json({ error: true, message: "Upstream quote API returned no data" });
    }

    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");
    res.status(200).json({ symbols, data });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message || String(e) });
  }
}
