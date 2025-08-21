import { serve } from "bun";
import index from "./index.html";

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async req => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },

    "/api/stocks": async req => {
      try {
        const url = new URL(req.url);
        const symbolsParam = url.searchParams.get("symbols") || "AAPL,MSFT,GOOGL,AMZN,NVDA";
        const symbols = symbolsParam
          .split(",")
          .map(s => s.trim().toUpperCase())
          .filter(Boolean)
          .slice(0, 20); // safety limit

        const apikey = process.env.API_KEY || "demo"; // TwelveData supports a demo key

        const toNumber = (x: any) => (typeof x === "string" ? Number(x.replace(/%/g, "")) || 0 : Number(x) || 0);

        const normalizeBatch = (symbols: string[], data: any) => {
          if (!data || typeof data !== "object") return [] as any[];
          if (Array.isArray(data.data)) {
            return data.data.map((d: any) => ({
              symbol: d.symbol,
              price: toNumber(d.price ?? d.close ?? d.last),
              change_percent: toNumber(d.percent_change ?? d.change_percent ?? d.change),
              updated: d.datetime || d.timestamp || d.last_trade_time,
            }));
          }
          if (data.symbol || data.name || data.price) {
            return [
              {
                symbol: data.symbol ?? symbols[0],
                price: toNumber(data.price ?? data.close ?? data.last),
                change_percent: toNumber(data.percent_change ?? data.change_percent ?? data.change),
                updated: data.datetime || data.timestamp || data.last_trade_time,
              },
            ];
          }
          return symbols.map(sym => {
            const d = (data as any)?.[sym];
            return {
              symbol: sym,
              price: toNumber(d?.price ?? d?.close ?? d?.last),
              change_percent: toNumber(d?.percent_change ?? d?.change_percent ?? d?.change),
              updated: d?.datetime || d?.timestamp || d?.last_trade_time,
            };
          });
        };

        const fetchQuoteBatch = async (symbols: string[]) => {
          const tdUrl = new URL("https://api.twelvedata.com/quote");
          tdUrl.searchParams.set("symbol", symbols.join(","));
          tdUrl.searchParams.set("apikey", apikey);
          const upstream = await fetch(tdUrl.toString());
          return upstream.json();
        };

        const fetchQuoteSingle = async (sym: string) => {
          const tdUrl = new URL("https://api.twelvedata.com/quote");
          tdUrl.searchParams.set("symbol", sym);
          tdUrl.searchParams.set("apikey", apikey);
          const upstream = await fetch(tdUrl.toString());
          return upstream.json();
        };

        const batch = await fetchQuoteBatch(symbols);
        const isError = batch?.status === "error" || (batch?.code && batch?.message);
        let normalized = isError ? [] : normalizeBatch(symbols, batch);
        const allZeroOrEmpty = normalized.length === 0 || normalized.every(r => !r.price);

        if (isError || allZeroOrEmpty) {
          const results = await Promise.all(
            symbols.map(async sym => {
              try {
                const d = await fetchQuoteSingle(sym);
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

        if (!normalized.length) {
          return new Response(
            JSON.stringify({ error: true, message: "Upstream quote API returned no data" }),
            { status: 502, headers: { "Content-Type": "application/json" } },
          );
        }

        return Response.json({ symbols, data: normalized });
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: true, message: err?.message || String(err) }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
    },

    "/api/series": async req => {
      try {
        const url = new URL(req.url);
        const symbol = (url.searchParams.get("symbol") || "AAPL").toUpperCase();
        const interval = url.searchParams.get("interval") || "5min";
        const outputsize = url.searchParams.get("outputsize") || "50";

        const apikey = process.env.API_KEY || "demo";
        const tdUrl = new URL("https://api.twelvedata.com/time_series");
        tdUrl.searchParams.set("symbol", symbol);
        tdUrl.searchParams.set("interval", interval);
        tdUrl.searchParams.set("outputsize", outputsize);
        tdUrl.searchParams.set("order", "asc");
        tdUrl.searchParams.set("apikey", apikey);

        const upstream = await fetch(tdUrl.toString());
        const data = await upstream.json();

        if ((data as any)?.status === "error") {
          // Return 200 with empty series to avoid breaking client UX during demo-key restrictions
          return new Response(
            JSON.stringify({ error: true, message: (data as any)?.message || "Upstream time_series error", symbol, interval, series: [] }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        const series = Array.isArray((data as any)?.values)
          ? (data as any).values.map((d: any) => ({ t: d.datetime, c: Number(d.close) }))
          : [];

        return Response.json({ symbol, interval, series });
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: true, message: err?.message || String(err) }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
