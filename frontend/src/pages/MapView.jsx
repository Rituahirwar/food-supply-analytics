import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Polyline,
  Tooltip as LeafletTooltip,
  useMap,
} from "react-leaflet";
import { AnimatePresence, motion } from "framer-motion";
import { getRisk, getTradeData, getFoodPrices } from "../services/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import {
  X,
  TrendingUp,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import "./MapView.css";

const GEOJSON_URL =
  "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json";

const COUNTRY_COORDS = {
  Afghanistan: [33.93, 67.71],
  Albania: [41.15, 20.17],
  Algeria: [28.03, 1.66],
  Angola: [-11.2, 17.87],
  Argentina: [-38.42, -63.62],
  Australia: [-25.27, 133.78],
  Austria: [47.52, 14.55],
  Bangladesh: [23.68, 90.36],
  Belgium: [50.5, 4.47],
  Bolivia: [-16.29, -63.59],
  Brazil: [-14.24, -51.93],
  Canada: [56.13, -106.35],
  Chile: [-35.68, -71.54],
  China: [35.86, 104.2],
  Colombia: [4.57, -74.3],
  Croatia: [45.1, 15.2],
  "Czech Republic": [49.82, 15.47],
  Denmark: [56.26, 9.5],
  Ecuador: [-1.83, -78.18],
  Egypt: [26.82, 30.8],
  Ethiopia: [9.15, 40.49],
  Finland: [61.92, 25.75],
  France: [46.23, 2.21],
  Germany: [51.17, 10.45],
  Ghana: [7.95, -1.02],
  Greece: [39.07, 21.82],
  Guatemala: [15.78, -90.23],
  Hungary: [47.16, 19.5],
  India: [20.59, 78.96],
  Indonesia: [-0.79, 113.92],
  Iran: [32.43, 53.69],
  Iraq: [33.22, 43.68],
  Ireland: [53.41, -8.24],
  Israel: [31.05, 34.85],
  Italy: [41.87, 12.57],
  Japan: [36.2, 138.25],
  Jordan: [30.59, 36.24],
  Kazakhstan: [48.02, 66.92],
  Kenya: [-0.02, 37.91],
  Kuwait: [29.31, 47.48],
  Malaysia: [4.21, 101.97],
  Mexico: [23.63, -102.55],
  Morocco: [31.79, -7.09],
  Myanmar: [21.91, 95.96],
  Netherlands: [52.13, 5.29],
  "New Zealand": [-40.9, 174.89],
  Nigeria: [9.08, 8.68],
  Norway: [60.47, 8.47],
  Pakistan: [30.38, 69.35],
  Peru: [-9.19, -75.02],
  Philippines: [12.88, 121.77],
  Poland: [51.92, 19.15],
  Portugal: [39.4, -8.22],
  Romania: [45.94, 24.97],
  Russia: [61.52, 105.32],
  "Saudi Arabia": [23.89, 45.08],
  "South Africa": [-30.56, 22.94],
  "South Korea": [35.91, 127.77],
  Spain: [40.46, -3.75],
  Sudan: [12.86, 30.22],
  Sweden: [60.13, 18.64],
  Switzerland: [46.82, 8.23],
  Thailand: [15.87, 100.99],
  Turkey: [38.96, 35.24],
  Ukraine: [48.38, 31.17],
  "United Arab Emirates": [23.42, 53.85],
  "United Kingdom": [55.38, -3.44],
  "United States of America": [37.09, -95.71],
  Uruguay: [-32.52, -55.77],
  Venezuela: [6.42, -66.59],
  Vietnam: [14.06, 108.28],
  Yemen: [15.55, 48.52],
  Zimbabwe: [-19.02, 29.15],
};

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
  fontSize: "11px",
};

const MapView = ({
  selectedYear,
  setSelectedYear,
  selectedCommodity,
  searchedCountry,
}) => {
  const [geoData, setGeoData] = useState(null);
  const [riskData, setRiskData] = useState({});
  const [availableYears, setAvailableYears] = useState([]);
  const [localYear, setLocalYear] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [tradeRoutes, setTradeRoutes] = useState({ imports: [], exports: [] });
  const [foodPriceData, setFoodPriceData] = useState([]);
  const [mapKey, setMapKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tradeLoading, setTradeLoading] = useState(false);

  // When user searches and selects a country from Topbar
  useEffect(() => {
    if (!searchedCountry) return;
    const country = riskData[searchedCountry];
    setSelectedCountry({
      name: searchedCountry,
      risk: country?.risk_level || "LOW",
      cpi: country?.cpi_value,
      year: selectedYear || localYear,
    });
  }, [searchedCountry]);

  // Load GeoJSON once
  useEffect(() => {
    fetch(GEOJSON_URL)
      .then((r) => r.json())
      .then(setGeoData);
  }, []);

  // Sync year
  useEffect(() => {
    if (selectedYear) setLocalYear(selectedYear);
  }, [selectedYear]);

  useEffect(() => {
    getFoodPrices(selectedCommodity || "Cereals")
      .then((data) => {
        if (data?.data) setFoodPriceData(data.data);
      })
      .catch((err) => console.warn("Failed to load food prices:", err));
  }, [selectedCommodity]);

  // Initial risk load
  useEffect(() => {
    setLoading(true);
    getRisk("").then((data) => {
      if (data?.risk_data) {
        const map = {};
        data.risk_data.forEach((item) => {
          map[item.country] = item;
        });
        setRiskData(map);
        const years = Array.isArray(data.timeline_labels)
          ? data.timeline_labels.map(String)
          : [];
        setAvailableYears(years);
        if (!selectedYear && years.length) {
          const defaultYear = String(
            data.selected_year || years[years.length - 1],
          );
          setLocalYear(defaultYear);
          if (setSelectedYear) setSelectedYear(defaultYear);
        }
      }
    })
    .catch((err) => console.warn("Failed to load initial risk:", err))
    .finally(() => setLoading(false));
  }, []);

  // Refetch risk on year change
  useEffect(() => {
    const yearToUse = selectedYear || localYear;
    if (!yearToUse) return;
    setLoading(true);
    getRisk(yearToUse).then((data) => {
      if (data?.risk_data) {
        const map = {};
        data.risk_data.forEach((item) => {
          map[item.country] = item;
        });
        setRiskData(map);
        setMapKey((prev) => prev + 1);
      }
    })
    .catch((err) => console.warn("Failed to load risk for year:", err))
    .finally(() => setLoading(false));
  }, [selectedYear]);

  // Refetch trade routes when country or commodity changes
  useEffect(() => {
    if (!selectedCountry) return;
    setTradeLoading(true);
    getTradeData(selectedCountry.name, selectedCommodity || "Cereals")
      .then((data) => {
        if (data?.imports !== undefined) {
          setTradeRoutes({
            imports: data.imports || [],
            exports: data.exports || [],
          });
        }
        setTradeLoading(false);
      })
      .catch(() => {
        setTradeRoutes({ imports: [], exports: [] });
        setTradeLoading(false);
      });
  }, [selectedCountry?.name, selectedCommodity]);

  const styleFunction = (feature) => {
    const country = riskData[feature.properties.name];
    const isSelected = selectedCountry?.name === feature.properties.name;
    return {
      fillColor: country
        ? riskColorMap[country.risk_level] || "#1a2235"
        : "#1a2235",
      weight: isSelected ? 2 : 1,
      opacity: 1,
      color: isSelected ? "#00f0ff" : "rgba(255,255,255,0.15)",
      fillOpacity: country ? (isSelected ? 0.9 : 0.6) : 0.3,
    };
  };

  const onEachFeature = (feature, layer) => {
    const name = feature.properties.name;
    const country = riskData[name];
    const risk = country?.risk_level || "NO DATA";
    const cpi = country?.cpi_value?.toFixed(2) || "N/A";
    const currentYear = selectedYear || localYear;

    layer.bindTooltip(
      `
      <div class="custom-tooltip">
        <strong>${name}</strong><br/>
        Year: <span style="color:#00f0ff">${currentYear}</span><br/>
        Risk: <span style="color:${riskColorMap[risk] || "#fff"};font-weight:600">${risk}</span><br/>
        CPI: ${cpi}
      </div>
    `,
      { sticky: true, className: "leaflet-custom-tooltip" },
    );

    layer.on({
      mouseover: (e) => {
        e.target.setStyle({ fillOpacity: 0.9, weight: 2, color: "#00f0ff" });
        e.target.bringToFront();
      },
      mouseout: (e) => {
        e.target.setStyle(styleFunction(feature));
      },
      click: () => {
        setSelectedCountry({
          name,
          risk: country?.risk_level || "LOW",
          cpi: country?.cpi_value,
          year: currentYear,
        });
      },
    });
  };

  // Build polyline positions for trade routes
  const getTradeLines = () => {
    const lines = [];
    const countryCoords = selectedCountry
      ? COUNTRY_COORDS[selectedCountry.name]
      : null;
    if (!countryCoords) return lines;

    tradeRoutes.imports.forEach((imp) => {
      const partnerCoords = COUNTRY_COORDS[imp.partner];
      if (partnerCoords) {
        lines.push({
          positions: [partnerCoords, countryCoords],
          color: "#60a5fa",
          type: "import",
          partner: imp.partner,
          value: imp.value,
        });
      }
    });

    tradeRoutes.exports.forEach((exp) => {
      const partnerCoords = COUNTRY_COORDS[exp.partner];
      if (partnerCoords) {
        lines.push({
          positions: [countryCoords, partnerCoords],
          color: "#10b981",
          type: "export",
          partner: exp.partner,
          value: exp.value,
        });
      }
    });

    return lines;
  };

  const tradeLines = getTradeLines();
  const currentYearStr = selectedYear || localYear;
  const timelineIndex = availableYears.indexOf(currentYearStr);

  const handleTimelineClick = (year) => {
    setLocalYear(year);
    if (setSelectedYear) setSelectedYear(year);
  };

  // Last 24 months of food price data for chart
  const chartData = foodPriceData.slice(-24).map((d) => ({
    date: d.date?.slice(0, 7),
    value: d.value,
  }));

  return (
    <div className="map-view-wrapper">
      {loading && (
        <div
          style={{
            position: "absolute",
            top: "16px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "rgba(18,24,38,0.9)",
            padding: "8px 20px",
            borderRadius: "8px",
            border: "1px solid var(--panel-border)",
            fontSize: "0.8rem",
            color: "var(--accent-cyan)",
          }}
        >
          Loading {currentYearStr} data...
        </div>
      )}

      <div className="leaflet-map-container">
        <MapContainer
          center={[20, 0]}
          zoom={2}
          style={{ height: "100%", width: "100%", background: "#0a0d14" }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap &copy; CARTO"
          />

          {geoData && (
            <GeoJSON
              key={mapKey}
              data={geoData}
              style={styleFunction}
              onEachFeature={onEachFeature}
            />
          )}

          {/* Trade route lines */}
          {tradeLines.map((line, i) => (
            <Polyline
              key={`line-${i}`}
              positions={line.positions}
              pathOptions={{
                color: line.color,
                weight: 2,
                opacity: 0.8,
                dashArray: line.type === "import" ? "6 4" : null,
              }}
            >
              <LeafletTooltip>
                <div className="custom-tooltip">
                  <strong style={{ color: line.color }}>
                    {line.type === "import" ? "↓ Import from" : "↑ Export to"}{" "}
                    {line.partner}
                  </strong>
                  <br />
                  {selectedCommodity} · Value: {line.value?.toLocaleString()}
                </div>
              </LeafletTooltip>
            </Polyline>
          ))}

          {/* Endpoint dots on trade lines */}
          {tradeLines.map((line, i) => {
            const partnerCoords =
              line.type === "import" ? line.positions[0] : line.positions[1];
            return (
              <CircleMarker
                key={`dot-${i}`}
                center={partnerCoords}
                radius={4}
                pathOptions={{
                  color: line.color,
                  fillColor: line.color,
                  fillOpacity: 1,
                  weight: 1,
                }}
              >
                <LeafletTooltip>
                  <div className="custom-tooltip">
                    <strong style={{ color: line.color }}>
                      {line.partner}
                    </strong>
                    <br />
                    {line.type === "import"
                      ? "Imports from here"
                      : "Exports to here"}
                  </div>
                </LeafletTooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="left-overlays">
        <div className="legend-block glass-panel">
          <h3>Risk Level — {currentYearStr}</h3>
          <ul className="legend-list">
            <li>
              <span className="dot bg-low"></span> Low
            </li>
            <li>
              <span className="dot bg-medium"></span> Medium
            </li>
            <li>
              <span className="dot bg-high"></span> High
            </li>
            <li>
              <span className="dot bg-critical"></span> Critical
            </li>
          </ul>
        </div>
        <div className="legend-block glass-panel">
          <h3>Trade Routes</h3>
          <ul className="legend-list">
            <li>
              <span className="dot" style={{ background: "#60a5fa" }}></span>{" "}
              Imports (dashed)
            </li>
            <li>
              <span className="dot" style={{ background: "#10b981" }}></span>{" "}
              Exports (solid)
            </li>
          </ul>
        </div>
      </div>

      {/* Timeline */}
      <div className="bottom-timeline glass-panel">
        <span className="year">{availableYears[0] || "2010"}</span>
        <div className="timeline-track">
          {availableYears.length > 0 && (
            <>
              <div
                className="timeline-progress"
                style={{
                  width:
                    timelineIndex >= 0
                      ? `${((timelineIndex + 1) / availableYears.length) * 100}%`
                      : "0%",
                  transition: "width 0.3s",
                }}
              />
              {availableYears.map((year, i) => (
                <div
                  key={year}
                  className={`timeline-node ${i <= timelineIndex ? "active" : ""}`}
                  style={{
                    left: `${((i + 1) / (availableYears.length + 1)) * 100}%`,
                    cursor: "pointer",
                    position: "absolute",
                  }}
                  onClick={() => handleTimelineClick(year)}
                  title={year}
                />
              ))}
              <div
                className="timeline-thumb"
                style={{
                  left:
                    timelineIndex >= 0
                      ? `${((timelineIndex + 1) / (availableYears.length + 1)) * 100}%`
                      : "0%",
                  transition: "left 0.3s",
                  position: "absolute",
                }}
              >
                <div className="thumb-label glass-panel">{currentYearStr}</div>
              </div>
            </>
          )}
        </div>
        <span className="year">
          {availableYears[availableYears.length - 1] || "2025"}
        </span>
      </div>

      {/* Right Panel — slides in when country selected */}
      <AnimatePresence>
        {selectedCountry && (
          <motion.div
            key="right-panel"
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "360px",
              height: "100%",
              zIndex: 500,
              background: "rgba(12,16,28,0.97)",
              borderLeft: "1px solid var(--panel-border)",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              backdropFilter: "blur(12px)",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px 20px 16px",
                borderBottom: "1px solid var(--panel-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  {selectedCountry.name}
                </h2>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                    marginTop: "4px",
                  }}
                >
                  {currentYearStr} · {selectedCommodity}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedCountry(null);
                  setTradeRoutes({ imports: [], exports: [] });
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Risk Status */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--panel-border)",
              }}
            >
              <p
                style={{
                  fontSize: "0.7rem",
                  color: "var(--text-secondary)",
                  marginBottom: "8px",
                  letterSpacing: "1px",
                }}
              >
                RISK STATUS
              </p>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  background: `${riskColorMap[selectedCountry.risk]}20`,
                  border: `1px solid ${riskColorMap[selectedCountry.risk]}60`,
                  color: riskColorMap[selectedCountry.risk],
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                <AlertTriangle size={14} />
                {selectedCountry.risk} RISK
              </div>
              {selectedCountry.cpi && (
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-secondary)",
                    marginTop: "8px",
                  }}
                >
                  CPI Value:{" "}
                  <span style={{ color: "white", fontWeight: 600 }}>
                    {selectedCountry.cpi?.toFixed(2)}
                  </span>
                </p>
              )}
            </div>

            {/* Food Price Trend Chart */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--panel-border)",
              }}
            >
              <p
                style={{
                  fontSize: "0.7rem",
                  color: "var(--text-secondary)",
                  marginBottom: "12px",
                  letterSpacing: "1px",
                }}
              >
                GLOBAL {selectedCommodity?.toUpperCase()} PRICE TREND
              </p>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      stroke="var(--text-secondary)"
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                      interval={5}
                    />
                    <YAxis
                      stroke="var(--text-secondary)"
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#00f0ff"
                      fill="rgba(0,240,255,0.1)"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div
                  style={{
                    height: 140,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-secondary)",
                    fontSize: "0.8rem",
                  }}
                >
                  Loading price data...
                </div>
              )}
            </div>

            {/* Trade Routes */}
            <div style={{ padding: "16px 20px", flex: 1 }}>
              <p
                style={{
                  fontSize: "0.7rem",
                  color: "var(--text-secondary)",
                  marginBottom: "12px",
                  letterSpacing: "1px",
                }}
              >
                {selectedCommodity?.toUpperCase()} TRADE PARTNERS (2023)
              </p>

              {tradeLoading ? (
                <div
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.8rem",
                    textAlign: "center",
                    padding: "20px",
                  }}
                >
                  Loading trade data...
                </div>
              ) : (
                <>
                  {tradeRoutes.imports.length > 0 && (
                    <div style={{ marginBottom: "16px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          marginBottom: "8px",
                        }}
                      >
                        <ArrowDownCircle size={14} color="#60a5fa" />
                        <p
                          style={{
                            fontSize: "0.75rem",
                            color: "#60a5fa",
                            fontWeight: 600,
                          }}
                        >
                          TOP IMPORT SOURCES
                        </p>
                      </div>
                      {tradeRoutes.imports.map((imp, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "6px 0",
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                          }}
                        >
                          <span style={{ fontSize: "0.82rem" }}>
                            {imp.partner}
                          </span>
                          <span
                            style={{ fontSize: "0.75rem", color: "#60a5fa" }}
                          >
                            {imp.value?.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {tradeRoutes.exports.length > 0 && (
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          marginBottom: "8px",
                        }}
                      >
                        <ArrowUpCircle size={14} color="#10b981" />
                        <p
                          style={{
                            fontSize: "0.75rem",
                            color: "#10b981",
                            fontWeight: 600,
                          }}
                        >
                          TOP EXPORT DESTINATIONS
                        </p>
                      </div>
                      {tradeRoutes.exports.map((exp, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "6px 0",
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                          }}
                        >
                          <span style={{ fontSize: "0.82rem" }}>
                            {exp.partner}
                          </span>
                          <span
                            style={{ fontSize: "0.75rem", color: "#10b981" }}
                          >
                            {exp.value?.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {tradeRoutes.imports.length === 0 &&
                    tradeRoutes.exports.length === 0 && (
                      <div
                        style={{
                          color: "var(--text-secondary)",
                          fontSize: "0.8rem",
                          textAlign: "center",
                          padding: "20px",
                        }}
                      >
                        No trade data found for {selectedCountry.name} ·{" "}
                        {selectedCommodity}
                      </div>
                    )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MapView;
