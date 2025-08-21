import type { VercelRequest, VercelResponse } from "@vercel/node";

const fetchStocks = async (symbols: string[], apikey: string) => {
  const tdUrl = new URL("https://api.twelvedata.com/quote");
  tdUrl.searchParams.set("symbol", symbols.join(","));
  tdUrl.searchParams.set("apikey", apikey);
  const res = await fetch(tdUrl.toString());
  const data = await res.json();

  let normalized: Array<{ symbol: string; price: number; change_percent: number; updated?: string }>;
  if (Array.isArray(data?.data)) {
    normalized = data.data.map((d: any) => ({
      symbol: d.symbol,
      price: Number(d.price ?? d.close ?? d.last ?? 0),
      change_percent: Number((d.percent_change ?? d.change_percent ?? d.change) || 0),
      updated: d.datetime || d.timestamp || d.last_trade_time,
    }));
  } else if (data && typeof data === "object" && (data.symbol || data.name || data.price)) {
    normalized = [
      {
        symbol: data.symbol ?? symbols[0],
        price: Number(data.price ?? data.close ?? data.last ?? 0),
        change_percent: Number((data.percent_change ?? data.change_percent ?? data.change) || 0),
        updated: data.datetime || data.timestamp || data.last_trade_time,
      },
    ];
  } else {
    normalized = symbols.map(sym => {
      const d = (data as any)?.[sym];
      return {
        symbol: sym,
        price: Number(d?.price ?? d?.close ?? d?.last ?? 0),
        change_percent: Number((d?.percent_change ?? d?.change_percent ?? d?.change) || 0),
        updated: d?.datetime || d?.timestamp || d?.last_trade_time,
      };
    });
  }
  return normalized;
};

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
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");
    res.status(200).json({ symbols, data });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message || String(e) });
  }
}
