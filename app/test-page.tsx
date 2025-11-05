"use client";

import { useEffect, useState } from "react";

export default function TestPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("Fetching health data...");
        const response = await fetch("/api/health");
        const result = await response.json();
        console.log("Health data:", result);
        setData(result);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Loading...</h1>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Page</h1>
      <p>Loading completed!</p>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}