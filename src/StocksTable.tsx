import { useEffect, useMemo, useState } from "react";

export type StockRow = {
  symbol: string;
  price: number;
  change_percent: number;
  updated?: string;
};

const defaultSymbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA"];

export function StocksTable() {
  const [symbols, setSymbols] = useState<string[]>(defaultSymbols);
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<keyof StockRow>("symbol");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const fetchData = async (syms: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/stocks", location.href);
      url.searchParams.set("symbols", syms.join(","));
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = await res.json();
      const data: StockRow[] = json.data ?? [];
      setRows(data);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(symbols);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    let r = rows.filter(r => (q ? r.symbol.includes(q) : true));
    r = [...r].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const va = a[sortKey] ?? 0;
      const vb = b[sortKey] ?? 0;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
    return r;
  }, [rows, query, sortKey, sortDir]);

  const onHeaderClick = (key: keyof StockRow) => {
    if (sortKey === key) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const onSubmitSymbols = (e: React.FormEvent) => {
    e.preventDefault();
    const input = (e.currentTarget as HTMLFormElement).elements.namedItem("symbols") as HTMLInputElement;
    const syms = input.value
      .split(",")
      .map(s => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 20);
    setSymbols(syms);
    fetchData(syms);
  };

  return (
    <div className="mt-10 w-full max-w-5xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">Stocks</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search symbol..."
            className="flex-1 sm:flex-none sm:w-56 bg-[#1a1a1a] border-2 border-[#fbf0df]/60 rounded-lg px-3 py-2 text-[#fbf0df] placeholder-[#fbf0df]/40 focus:border-[#f3d5a3] outline-none"
          />
          <form onSubmit={onSubmitSymbols} className="flex gap-2">
            <input
              name="symbols"
              defaultValue={symbols.join(",")}
              className="hidden sm:block w-72 bg-[#1a1a1a] border-2 border-[#fbf0df]/60 rounded-lg px-3 py-2 text-[#fbf0df] placeholder-[#fbf0df]/40 focus:border-[#f3d5a3] outline-none"
            />
            <button
              type="submit"
              className="bg-[#fbf0df] text-[#1a1a1a] px-4 py-2 rounded-lg font-semibold hover:bg-[#f3d5a3] transition-colors"
              title="Fetch symbols"
            >
              Refresh
            </button>
          </form>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-[#fbf0df]/30">
        <table className="min-w-full divide-y divide-[#fbf0df]/20">
          <thead className="bg-[#1a1a1a]">
            <tr>
              {[
                { key: "symbol", label: "Symbol" },
                { key: "price", label: "Price ($)" },
                { key: "change_percent", label: "Change %" },
                { key: "updated", label: "Updated" },
              ].map(c => (
                <th
                  key={c.key}
                  className="px-4 py-3 text-left text-sm font-semibold text-[#fbf0df]/90 cursor-pointer select-none"
                  onClick={() => onHeaderClick(c.key as keyof StockRow)}
                  title="Sort"
                >
                  <span className="inline-flex items-center gap-2">
                    {c.label}
                    {sortKey === c.key && (
                      <span className="text-xs opacity-70">{sortDir === "asc" ? "▲" : "▼"}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#fbf0df]/10">
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center">
                  <span className="inline-flex items-center gap-2 text-[#fbf0df]/80">
                    <span className="w-4 h-4 border-2 border-[#fbf0df]/60 border-t-transparent rounded-full animate-[spin_1s_linear_infinite]"></span>
                    Loading stock data...
                  </span>
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-red-300">
                  Failed to load data: {error}
                </td>
              </tr>
            )}
            {!loading && !error && filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[#fbf0df]/70">
                  No results.
                </td>
              </tr>
            )}
            {!loading && !error &&
              filtered.map(r => (
                <tr key={r.symbol} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-semibold">{r.symbol}</td>
                  <td className="px-4 py-3 tabular-nums">{r.price.toFixed(2)}</td>
                  <td className={`px-4 py-3 tabular-nums ${r.change_percent >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {r.change_percent.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-sm opacity-70">{r.updated ?? ""}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs opacity-70">Data via TwelveData. Symbols: {symbols.join(", ")}.</p>
    </div>
  );
}
