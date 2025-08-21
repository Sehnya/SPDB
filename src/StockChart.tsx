import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";

type Point = { t: string; c: number };

export function StockChart({ initialSymbol = "AAPL" }: { initialSymbol?: string }) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [series, setSeries] = useState<Point[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  const fetchSeries = async (sym: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/series", location.href);
      url.searchParams.set("symbol", sym);
      url.searchParams.set("interval", "5min");
      url.searchParams.set("outputsize", "50");
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = await res.json();
      setSeries(json.series ?? []);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeries(symbol);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute labels and points for updates
  const labels = useMemo(() => series.map(p => p.t), [series]);
  const points = useMemo(() => series.map(p => p.c), [series]);

  // Create chart once on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Ensure the canvas is actually in the document (avoids Chart.js DOM sizing errors)
    if (typeof document !== "undefined" && !document.contains(canvas)) return;

    if (chartRef.current) return; // already created

    const chart = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: `${symbol} Close`,
            data: points,
            borderColor: "#61dafb",
            backgroundColor: "rgba(97, 218, 251, 0.15)",
            pointRadius: 0,
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, labels: { color: "#fbf0df" } },
        },
        scales: {
          x: { ticks: { color: "#fbf0df99", maxTicksLimit: 6 }, grid: { color: "#ffffff10" } },
          y: { ticks: { color: "#fbf0df99" }, grid: { color: "#ffffff10" } },
        },
      },
    });

    chartRef.current = chart;
    return () => {
      chart.destroy();
      chartRef.current = null;
    };
    // We intentionally don't include labels/points/symbol here to avoid destroying on data changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update chart when data or symbol changes
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    // Update labels and dataset in place
    chart.data.labels = labels as any;
    if (chart.data.datasets[0]) {
      chart.data.datasets[0].label = `${symbol} Close`;
      chart.data.datasets[0].data = points as any;
    }
    // Defer update to next frame to ensure DOM is stable
    requestAnimationFrame(() => chart.update());
  }, [labels, points, symbol]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sym = e.target.value;
    setSymbol(sym);
    fetchSeries(sym);
  };

  return (
    <div className="mt-10 w-full max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Chart</h2>
        <select
          value={symbol}
          onChange={handleChange}
          className="bg-[#1a1a1a] border-2 border-[#fbf0df]/60 rounded-lg px-3 py-2 text-[#fbf0df]"
        >
          {["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA"].map(s => (
            <option key={s} value={s} className="bg-[#1a1a1a]">
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 h-64 bg-[#1a1a1a] rounded-xl border border-[#fbf0df]/30 relative">
        {loading && (
          <div className="absolute inset-0 grid place-items-center text-[#fbf0df]/80">
            <span className="w-6 h-6 border-2 border-[#fbf0df]/60 border-t-transparent rounded-full animate-[spin_1s_linear_infinite]" />
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 grid place-items-center text-red-300 text-sm p-4 text-center">
            Failed to load series: {error}
          </div>
        )}
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  );
}
