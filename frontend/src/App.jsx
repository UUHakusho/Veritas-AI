import React, { useState } from "react";
import Header from "./components/Header";
import ReliabilityResult from "./components/ReliabilityResult";

const App = () => {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCheckReliability = async () => {
    if (!url) return alert("Please enter a URL");

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/check-reliability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <Header />
      <main className="container mx-auto p-4">
        <div className="max-w-2xl mx-auto">
          <input
            type="text"
            placeholder="Paste a URL to check reliability"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button
            onClick={handleCheckReliability}
            disabled={loading}
            className="w-full mt-4 p-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400"
          >
            {loading ? "Analyzing..." : "Check Reliability"}
          </button>
          {result && <ReliabilityResult {...result} />}
        </div>
      </main>
    </div>
  );
};

export default App;