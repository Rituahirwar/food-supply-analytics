import { useMemo, useState } from "react";
import { fetchPredictionData, fetchRiskData } from "../services/api";
import useFetch from "../hooks/useFetch";
import Navbar from "../components/Navbar";
import WorldMap from "../components/WorldMap";
import TimelineSlider from "../components/TimelineSlider";

const riskLabels = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export default function Dashboard() {
  const [predictionMode, setPredictionMode] = useState(false);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const [hoveredRegion, setHoveredRegion] = useState(null);

  const token = window.localStorage.getItem("token");
  const {
    data: riskResponse,
    loading: riskLoading,
    error: riskError,
  } = useFetch(() => fetchRiskData(token), [token]);
  const {
    data: predictionResponse,
    loading: predictionLoading,
    error: predictionError,
  } = useFetch(() => fetchPredictionData(token), [token]);

  const riskData = riskResponse?.risk_data || [];
  const predictionData = predictionResponse?.predictions || [];
  const currentPrice = predictionResponse?.current_price ?? null;

  const countryData = useMemo(() => {
    const map = {};
    riskData.forEach((item) => {
      map[item.country] = item;
    });
    return map;
  }, [riskData]);

  const timelineLabels = useMemo(() => {
    const labels = ["Now"];
    predictionData.forEach((prediction) => {
      const date = new Date(prediction.month);
      labels.push(
        date.toLocaleDateString(undefined, {
          month: "short",
          year: "numeric",
        }),
      );
    });
    return labels;
  }, [predictionData]);

  const selectedPrice =
    selectedMonthIndex === 0
      ? currentPrice
      : predictionData[selectedMonthIndex - 1]?.predicted_price;
  const selectedLabel =
    selectedMonthIndex === 0 ? "Current" : timelineLabels[selectedMonthIndex];

  const sparklineData = predictionData.length
    ? predictionData
    : Array.from({ length: 6 }, (_, index) => ({ predicted_price: index + 1 }));
  const maxSparklinePrice = Math.max(
    ...sparklineData.map((p) => p.predicted_price),
    1,
  );

  const activeRisk = hoveredRegion?.risk_level
    ? riskLabels[hoveredRegion.risk_level]
    : "No data";
  const activePrice =
    hoveredRegion?.cpi_value != null ? hoveredRegion.cpi_value : "Unavailable";

  return (
    <div className="dashboard-shell">
      <Navbar
        predictionMode={predictionMode}
        onTogglePrediction={() => setPredictionMode((value) => !value)}
      />

      <main className="dashboard-content">
        <section className="dashboard-main-panel">
          <div className="dashboard-intro">
            <div>
              <p className="eyebrow">Food Supply Analytics</p>
              <h1>Global risk and price forecast</h1>
              <p className="intro-copy">
                Visualize live country risk categories and global prediction
                forecasts from backend data.
              </p>
            </div>
            <div className="status-pill">
              <span>
                {predictionMode
                  ? "Prediction mode active"
                  : "Default risk view"}
              </span>
            </div>
          </div>

          <div className="dashboard-map-wrapper">
            <div className="map-panel-container full-width">
              <WorldMap
                countryData={countryData}
                activeCountry={hoveredRegion}
                onHoverCountry={setHoveredRegion}
              />
            </div>

            {hoveredRegion && (
              <aside className="dashboard-details-overlay">
                <div className="details-card">
                  <p className="details-title">Hover details</p>
                  <div className="details-row">
                    <span className="details-label">Region</span>
                    <span>{hoveredRegion?.country || "Select a country"}</span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Risk status</span>
                    <span>{activeRisk}</span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Latest CPI value</span>
                    <span>{activePrice}</span>
                  </div>
                  <div className="details-chart">
                    <div className="sparkline-bar">
                      {sparklineData.map((item, index) => (
                        <div
                          key={index}
                          className="sparkline-segment"
                          style={{
                            height: `${20 + ((item.predicted_price ?? 1) / maxSparklinePrice) * 60}px`,
                          }}
                        />
                      ))}
                    </div>
                    <p className="details-note">Global price trend preview</p>
                  </div>
                </div>

                <div className="details-card">
                  <p className="details-title">Forecast snapshot</p>
                  {predictionLoading ? (
                    <p>Loading forecast…</p>
                  ) : predictionError ? (
                    <p>Unable to load forecast</p>
                  ) : (
                    <>
                      <div className="forecast-value">
                        <span>{selectedLabel}</span>
                        <strong>
                          {selectedPrice != null
                            ? `$${selectedPrice.toLocaleString()}`
                            : "Unavailable"}
                        </strong>
                      </div>
                      <div className="forecast-meta">
                        <span>
                          {selectedMonthIndex === 0
                            ? "Current global price"
                            : "Predicted global price"}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </aside>
            )}
          </div>

          <div className="timeline-panel">
            <div className="timeline-heading">
              <div>
                <p className="eyebrow">Price forecast timeline</p>
                <h2>Past, present, and future months</h2>
              </div>
            </div>
            <TimelineSlider
              labels={timelineLabels}
              selectedIndex={selectedMonthIndex}
              onChange={setSelectedMonthIndex}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
