const crops = ["Wheat", "Barley", "Rice", "Corn"];

export default function Navbar({ predictionMode, onTogglePrediction }) {
  return (
    <header className="dashboard-navbar">
      <div className="navbar-start">
        <button className="nav-pill active">Overall Inflation</button>
        <div className="nav-dropdown">
          <button className="nav-pill">Crop Prices</button>
          <div className="dropdown-menu">
            {crops.map((crop) => (
              <div key={crop} className="dropdown-item">
                {crop}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="navbar-center">
        <div className="search-input">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search Country or Commodity..."
            aria-label="Search"
          />
        </div>
      </div>

      <div className="navbar-end">
        <button className="nav-pill">Risk Alerts</button>
        <button
          className={`nav-pill ${predictionMode ? "active" : ""}`}
          onClick={onTogglePrediction}
        >
          Prediction Mode
        </button>
      </div>
    </header>
  );
}
