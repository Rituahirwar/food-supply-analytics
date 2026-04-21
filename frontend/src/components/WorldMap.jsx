import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { useMemo } from "react";

const riskColors = {
  LOW: "#22c55e",
  MEDIUM: "#eab308",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
  NO_DATA: "#cbd5e1",
};

export default function WorldMap({
  countryData,
  activeCountry,
  onHoverCountry,
}) {
  const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;

  // Convert country data to markers
  const markers = useMemo(() => {
    const countryCoordinates = {
      "United States": [37.0902, -95.7129],
      Canada: [56.1304, -106.3468],
      Mexico: [23.6345, -102.5528],
      Brazil: [-14.235, -51.9253],
      Argentina: [-38.4161, -63.6167],
      "United Kingdom": [55.3781, -3.436],
      France: [46.2276, 2.2137],
      Germany: [51.1657, 10.4515],
      Russia: [61.524, 105.3188],
      "Saudi Arabia": [23.8859, 45.0792],
      Nigeria: [9.082, 8.6753],
      "South Africa": [-30.5595, 22.9375],
      India: [20.5937, 78.9629],
      China: [35.8617, 104.1954],
      Japan: [36.2048, 138.2529],
      Australia: [-25.2744, 133.7751],
    };

    return Object.entries(countryData)
      .map(([country, data]) => {
        const coords = countryCoordinates[country];
        if (!coords) return null;

        return {
          country,
          coords,
          risk_level: data.risk_level,
          cpi_value: data.cpi_value,
        };
      })
      .filter(Boolean);
  }, [countryData]);

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      style={{ width: "100%", height: "100%" }}
      className="map-container"
    >
      <TileLayer
        url={`https://api.maptiler.com/maps/base-v4-dark/{z}/{x}/{y}.png?key=${apiKey}`}
        attribution="© MapTiler © OpenStreetMap contributors"
        minZoom={2}
        maxZoom={12}
      />

      {markers.map((marker) => (
        <CircleMarker
          key={marker.country}
          center={marker.coords}
          radius={12}
          fillColor={riskColors[marker.risk_level] || riskColors.NO_DATA}
          fillOpacity={0.8}
          color="rgba(255, 255, 255, 0.3)"
          weight={2}
          onMouseEnter={() => onHoverCountry(marker)}
          onMouseLeave={() => onHoverCountry(null)}
        >
          <Popup>
            <div style={{ fontSize: "12px", minWidth: "150px" }}>
              <strong>{marker.country}</strong>
              <br />
              Risk: {marker.risk_level}
              <br />
              CPI: {marker.cpi_value}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
