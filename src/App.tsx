import { APITester } from "./APITester";
import { StocksTable } from "./StocksTable";
import { StockChart } from "./StockChart";
import "./index.css";

import logo from "./logo.svg";
import reactLogo from "./react.svg";

export function App() {
  return (
    <div className="max-w-7xl mx-auto p-8 text-center relative z-10">
      <div className="flex justify-center items-center gap-8 mb-8">
        <img
          src={logo}
          alt="Bun Logo"
          className="h-16 sm:h-24 p-4 sm:p-6 transition-all duration-300 hover:drop-shadow-[0_0_2em_#646cffaa]"
        />
        <img
          src={reactLogo}
          alt="React Logo"
          className="h-16 sm:h-24 p-4 sm:p-6 transition-all duration-300 hover:drop-shadow-[0_0_2em_#61dafbaa] animate-[spin_20s_linear_infinite]"
        />
      </div>

      <h1 className="text-4xl sm:text-5xl font-bold my-2 sm:my-4 leading-tight">Stock Dashboard</h1>
      <p className="opacity-80 mb-6">Bun + React + Tailwind. Live quotes via TwelveData.</p>

      <StocksTable />

      <div className="mt-6">
        <h3 className="sr-only">Chart</h3>
        {/* Optional bonus: chart */}
        <div className="opacity-100">
          <StockChart />
        </div>
      </div>

      <div className="mt-10 opacity-60">
        <h3 className="text-lg font-semibold mb-2">API Tester (optional)</h3>
        <APITester />
      </div>
    </div>
  );
}

export default App;
