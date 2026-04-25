import React, { useState, useEffect, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { AlertTriangle, Globe, TrendingUp, AlertCircle } from "lucide-react";
import { getPrediction, getRisk } from "../services/api";
import { useAuth } from "../context/AuthContext";
import PredictionHistory from "./PredictionHistory";
import "./Dashboard.css";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const riskColorMap = {
  CRITICAL: "#ef4444",
  HIGH: "#f43f5e",
  MEDIUM: "#eab308",
  LOW: "#10b981",
};
const tooltipStyle = {
  background: "rgba(18,24,38,0.95)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  color: "white",
  fontSize: "12px",
};

const Dashboard = ({ selectedYear, setSelectedYear }) => {
  const { isAuthenticated } = useAuth();
  const [prediction, setPrediction] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [availableYears, setAvailableYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [riskLoading, setRiskLoading] = useState(true);

  const [highlightedCountry, setHighlightedCountry] = useState(null);

  useEffect(() => {
    getPrediction()
      .then(setPrediction)
      .catch(() => null);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadInitialRisk = async () => {
      setRiskLoading(true);
      try {
        const risk = await getRisk("");
        if (!isMounted) return;
        setRiskData(risk);

        const validYears = Array.isArray(risk?.timeline_labels)
          ? [...new Set(risk.timeline_labels.map(String).filter(Boolean))]
              .filter((y) => Number(y) >= 2018 && Number(y) <= 2025)
              .sort((a, b) => Number(a) - Number(b))
          : [];
        setAvailableYears(validYears);

        const backendSelectedYear = risk?.selected_year ? String(risk.selected_year) : "";
        const nextYear = validYears.includes(String(selectedYear))
          ? String(selectedYear)
          : validYears.includes(backendSelectedYear)
            ? backendSelectedYear
            : validYears[validYears.length - 1];

        if (nextYear && nextYear !== selectedYear) {
          setSelectedYear(nextYear);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to load initial risk data:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
          setRiskLoading(false);
        }
      }
    };

    loadInitialRisk();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedYear || !availableYears.includes(String(selectedYear))) return;
    let isMounted = true;
    setRiskLoading(true);
    getRisk(selectedYear)
      .then((risk) => {
        if (isMounted) setRiskData(risk);
      })
      .catch((err) => {
        if (isMounted) console.error("Failed to load risk data for year:", err);
      })
      .finally(() => {
        if (isMounted) setRiskLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [selectedYear, availableYears]);

  const riskRows = riskData?.risk_data || [];

  const riskByCountry = useMemo(() => {
    const map = {};
    for (const row of riskRows) {
      map[row.country] = row;
    }
    return map;
  }, [riskRows]);

  const forecastData =
    prediction?.predictions?.map((p) => ({
      name: p.month?.slice(0, 7),
      price: p.food_price_index ?? p.predicted_price,
    })) || [];

  const cpiValues = riskRows
    .map((c) => Number(c.cpi_value))
    .filter((v) => Number.isFinite(v));
  const avgCpi = cpiValues.length
    ? (cpiValues.reduce((sum, v) => sum + v, 0) / cpiValues.length).toFixed(1)
    : "—";

  const riskCounts = riskRows.reduce((acc, c) => {
    acc[c.risk_level] = (acc[c.risk_level] || 0) + 1;
    return acc;
  }, {});

  const top5 = [...riskRows]
    .sort((a, b) => b.cpi_value - a.cpi_value)
    .slice(0, 5);
  const recentAlerts = riskRows
    .filter((c) => ["CRITICAL", "HIGH"].includes(c.risk_level))
    .slice(0, 4);
  const anomalies = forecastData
    .filter((d, i, arr) => i > 0 && Math.abs(d.price - arr[i - 1].price) > 5)
    .map((d) => d.name);

  const statCards = [
    {
      label: "High Risk Countries",
      value: (riskCounts.CRITICAL || 0) + (riskCounts.HIGH || 0),
      icon: AlertTriangle,
      color: "#ef4444",
      sub: `${riskCounts.CRITICAL || 0} critical`,
    },
    {
      label: "Avg Food Price Index",
      value: avgCpi,
      icon: TrendingUp,
      color: "#10b981",
      sub: `${selectedYear || "selected"} average CPI`,
    },
    {
      label: "Countries Monitored",
      value: riskData?.total_countries || "—",
      icon: Globe,
      color: "#00f0ff",
      sub: "across 6 continents",
    },
    {
      label: "Medium Risk",
      value: riskCounts.MEDIUM || 0,
      icon: AlertCircle,
      color: "#eab308",
      sub: "need monitoring",
    },
  ];

  return (
    <div className="dashboard-wrapper">
      {(loading || riskLoading) && (
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.8rem",
            position: "absolute",
            top: "8px",
            right: "16px",
          }}
        >
          Loading...
        </p>
      )}

      <div
        className="glass-panel"
        style={{
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
              marginBottom: "4px",
            }}
          >
            Dataset Year
          </p>
          <p style={{ fontSize: "0.9rem", fontWeight: 600 }}>
            {selectedYear || riskData?.selected_year || "Latest available"}
          </p>
        </div>
        <select
          value={selectedYear || ""}
          onChange={(e) => setSelectedYear(e.target.value)}
          style={{
            minWidth: "140px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--panel-border)",
            padding: "6px 12px",
            borderRadius: "6px",
            color: "white",
            fontFamily: "inherit",
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
        >
          {availableYears.map((year) => (
            <option key={year} value={year} style={{ background: "#121826" }}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {anomalies.length > 0 && (
        <div
          style={{
            padding: "12px 20px",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <AlertTriangle size={16} color="#ef4444" />
          <p style={{ fontSize: "0.85rem", color: "#ef4444" }}>
            Anomaly detected: Unusual price movements in forecast period
          </p>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
        }}
      >
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="glass-panel"
              style={{
                padding: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                    marginBottom: "8px",
                  }}
                >
                  {card.label}
                </p>
                <p
                  style={{
                    fontSize: "2rem",
                    fontWeight: 700,
                    color: card.color,
                  }}
                >
                  {card.value}
                </p>
                <p
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--text-secondary)",
                    marginTop: "4px",
                  }}
                >
                  {card.sub}
                </p>
              </div>
              <div
                style={{
                  background: `${card.color}15`,
                  padding: "10px",
                  borderRadius: "8px",
                }}
              >
                <Icon size={20} color={card.color} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="dashboard-grid">
        <div className="main-map-panel glass-panel">
          <div className="panel-header">
            <h3>
              Global Risk Overview — {selectedYear || riskData?.selected_year}
            </h3>
          </div>
          <div className="map-content">
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ scale: 120 }}
              width={800}
              height={380}
            >
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const country = riskByCountry[geo.properties.name];
                    const isHighlighted =
                      highlightedCountry?.country === geo.properties.name;
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={
                          isHighlighted
                            ? "#00f0ff"
                            : country
                              ? riskColorMap[country.risk_level] || "#1a2235"
                              : "#1a2235"
                        }
                        stroke={
                          isHighlighted ? "#fff" : "rgba(255,255,255,0.1)"
                        }
                        strokeWidth={isHighlighted ? 1.5 : 0.5}
                        onClick={() => {
                          const found = riskByCountry[geo.properties.name];
                          setHighlightedCountry(
                            found || {
                              country: geo.properties.name,
                              risk_level: "NO DATA",
                              cpi_value: null,
                            },
                          );
                        }}
                        style={{
                          default: {
                            opacity: isHighlighted ? 1 : 0.7,
                            cursor: "pointer",
                          },
                          hover: { opacity: 1, outline: "none" },
                          pressed: { outline: "none" },
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </ComposableMap>
          </div>

          {highlightedCountry && (
            <div
              style={{
                margin: "0 16px 16px",
                padding: "12px 16px",
                background: "rgba(0,240,255,0.06)",
                border: "1px solid rgba(0,240,255,0.2)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <span style={{ fontSize: "1rem" }}>🌍</span>
                <div>
                  <p
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "#00f0ff",
                    }}
                  >
                    {highlightedCountry.country}
                  </p>
                  <p
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-secondary)",
                      marginTop: "2px",
                    }}
                  >
                    CPI: {highlightedCountry.cpi_value?.toFixed(2) || "N/A"}
                  </p>
                </div>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: "12px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    background: `${riskColorMap[highlightedCountry.risk_level] || "#fff"}20`,
                    color:
                      riskColorMap[highlightedCountry.risk_level] ||
                      "var(--text-secondary)",
                    border: `1px solid ${riskColorMap[highlightedCountry.risk_level] || "#fff"}40`,
                  }}
                >
                  {highlightedCountry.risk_level}
                </span>
                <button
                  onClick={() => setHighlightedCountry(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    fontSize: "16px",
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="alerts-panel glass-panel">
          <h3 style={{ marginBottom: "8px" }}>Recent Risk Alerts</h3>
          {recentAlerts.map((item, idx) => (
            <div
              key={idx}
              className={`alert-card ${item.risk_level.toLowerCase()}`}
            >
              <div className="alert-title">
                <AlertTriangle size={14} />
                <span>{item.country}</span>
              </div>
              <p>
                CPI: {item.cpi_value?.toFixed(2)} · {item.risk_level}
              </p>
            </div>
          ))}
        </div>

        <div className="bottom-charts">
          <div className="chart-panel glass-panel">
            <div className="panel-header">
              <h3>Price Forecast — Next 6 Months</h3>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    stroke="var(--text-secondary)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                 <YAxis
                    stroke="var(--text-secondary)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 'auto']}
/>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="price"
                    name="Food Price Index (LSTM Forecast)"
                    stroke="#10b981"
                    fill="rgba(16,185,129,0.15)"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-panel glass-panel">
            <div className="panel-header">
              <h3>Top 5 High Risk Countries</h3>
            </div>
            <div style={{ padding: "12px 16px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Country", "Risk", "CPI"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "8px",
                          textAlign: "left",
                          fontSize: "0.7rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {top5.map((item, i) => (
                    <tr
                      key={i}
                      style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
                    >
                      <td style={{ padding: "8px", fontSize: "0.85rem" }}>
                        {item.country}
                      </td>
                      <td style={{ padding: "8px" }}>
                        <span
                          style={{
                            color: riskColorMap[item.risk_level],
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          {item.risk_level}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          fontSize: "0.85rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {item.cpi_value?.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {isAuthenticated && (
        <div
          className="glass-panel"
          style={{ padding: "20px", marginTop: "8px" }}
        >
          <h3 style={{ marginBottom: "16px", fontSize: "0.95rem" }}>
            Your Prediction History
          </h3>
          <PredictionHistory inline />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
