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
        const tdUrl = new URL("https://api.twelvedata.com/quote");
        tdUrl.searchParams.set("symbol", symbols.join(","));
        tdUrl.searchParams.set("apikey", apikey);

        const upstream = await fetch(tdUrl.toString());
        const data = await upstream.json();

        // TwelveData returns either an object (single symbol) or a map of symbol->quote for multiple
        let normalized: Array<{ symbol: string; price: number; change_percent: number; updated?: string }>; 

        if (Array.isArray(data?.data)) {
          // Some plans may return { data: [...] }
          normalized = data.data.map((d: any) => ({
            symbol: d.symbol,
            price: Number(d.price ?? d.close ?? d.last ?? 0),
            change_percent: Number((d.percent_change ?? d.change_percent ?? d.change) || 0),
            updated: d.datetime || d.timestamp || d.last_trade_time,
          }));
        } else if (data && typeof data === "object" && (data.symbol || data.name || data.price)) {
          // Single-object response
          normalized = [
            {
              symbol: data.symbol ?? symbols[0],
              price: Number(data.price ?? data.close ?? data.last ?? 0),
              change_percent: Number((data.percent_change ?? data.change_percent ?? data.change) || 0),
              updated: data.datetime || data.timestamp || data.last_trade_time,
            },
          ];
        } else {
          // Map of symbol->quote
          normalized = symbols.map(sym => {
            const d = data?.[sym];
            return {
              symbol: sym,
              price: Number(d?.price ?? d?.close ?? d?.last ?? 0),
              change_percent: Number((d?.percent_change ?? d?.change_percent ?? d?.change) || 0),
              updated: d?.datetime || d?.timestamp || d?.last_trade_time,
            };
          });
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
