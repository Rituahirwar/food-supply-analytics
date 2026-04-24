import React, { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import "./Topbar.css";

const COMMODITIES = ["Cereals", "Oils", "Sugar", "Dairy", "Meat"];

const ALL_COUNTRIES = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Angola",
  "Argentina",
  "Australia",
  "Austria",
  "Bangladesh",
  "Belgium",
  "Bolivia",
  "Brazil",
  "Canada",
  "Chile",
  "China",
  "Colombia",
  "Croatia",
  "Czech Republic",
  "Denmark",
  "Ecuador",
  "Egypt",
  "Ethiopia",
  "Finland",
  "France",
  "Germany",
  "Ghana",
  "Greece",
  "Guatemala",
  "Hungary",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kuwait",
  "Malaysia",
  "Mexico",
  "Morocco",
  "Myanmar",
  "Netherlands",
  "New Zealand",
  "Nigeria",
  "Norway",
  "Pakistan",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Romania",
  "Russia",
  "Saudi Arabia",
  "South Africa",
  "South Korea",
  "Spain",
  "Sudan",
  "Sweden",
  "Switzerland",
  "Thailand",
  "Turkey",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States of America",
  "Uruguay",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zimbabwe",
];

const Topbar = ({
  selectedCommodity,
  setSelectedCommodity,
  onCountrySelect,
}) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (val.trim().length === 0) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    const filtered = ALL_COUNTRIES.filter((c) =>
      c.toLowerCase().includes(val.toLowerCase()),
    ).slice(0, 6);
    setSuggestions(filtered);
    setShowDropdown(filtered.length > 0);
  };

  const handleSelect = (country) => {
    setQuery(country);
    setShowDropdown(false);
    setSuggestions([]);
    if (onCountrySelect) onCountrySelect(country);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") setShowDropdown(false);
    if (e.key === "Enter" && suggestions.length > 0)
      handleSelect(suggestions[0]);
  };

  return (
    <header className="topbar">
      <div className="search-wrapper" style={{ position: "relative" }}>
        <div className="search-container glass-panel">
          <Search size={18} className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search country..."
            className="search-input"
            value={query}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            autoComplete="off"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setSuggestions([]);
                setShowDropdown(false);
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: "0 4px",
                fontSize: "16px",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </div>

        {showDropdown && (
          <div
            ref={dropdownRef}
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              right: 0,
              background: "rgba(12,16,28,0.97)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              zIndex: 9999,
              overflow: "hidden",
              backdropFilter: "blur(12px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            {suggestions.map((country) => (
              <div
                key={country}
                onMouseDown={() => handleSelect(country)}
                style={{
                  padding: "10px 16px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  color: "rgba(255,255,255,0.85)",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(0,240,255,0.08)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <span style={{ fontSize: "12px" }}>🌍</span>
                {country}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="filters-container glass-panel">
        <div className="commodity-tags">
          {COMMODITIES.map((c) => (
            <span
              key={c}
              className={`tag ${c.toLowerCase()} ${selectedCommodity === c ? "active" : ""}`}
              onClick={() => setSelectedCommodity && setSelectedCommodity(c)}
            >
              {c === "Cereals" && "🌾"}
              {c === "Oils" && "💧"}
              {c === "Sugar" && "🍬"}
              {c === "Dairy" && "🥛"}
              {c === "Meat" && "🥩"} {c}
            </span>
          ))}
        </div>

      </div>
    </header>
  );
};

export default Topbar;
