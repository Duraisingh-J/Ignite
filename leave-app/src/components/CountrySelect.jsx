import React, { useState, useRef, useEffect } from "react";
import ct from "countries-and-timezones";
import { COLORS, FONTS } from "../theme/colors";

// Get all countries from the official library and sort them alphabetically
const ALL_COUNTRIES = Object.values(ct.getAllCountries()).sort((a, b) => 
  a.name.localeCompare(b.name)
);

export default function CountrySelect({ value, onChange, style }) {
  const [query, setQuery] = useState(value || "");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Sync internal query with external value if it changes
  useEffect(() => {
    if (value !== query && !isOpen) {
      setQuery(value || "");
    }
  }, [value, isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        // Reset query to the selected value if they typed garbage and clicked away
        setQuery(value || ""); 
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const filteredCountries = ALL_COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (country) => {
    setQuery(country.name);
    setIsOpen(false);
    // Pass the full country object back to the parent so it gets the name AND code
    onChange(country); 
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Search for a country..."
        style={{ ...style, width: "100%", boxSizing: "border-box" }}
      />
      
      {isOpen && (
        <ul style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          maxHeight: 250,
          overflowY: "auto",
          background: "#fff",
          border: `1px solid ${COLORS.line}`,
          borderRadius: 8,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          margin: 0,
          marginTop: 4,
          padding: 0,
          listStyle: "none",
          zIndex: 1000
        }}>
          {filteredCountries.length > 0 ? (
            filteredCountries.map((country) => (
              <li
                key={country.id}
                onClick={() => handleSelect(country)}
                style={{
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontFamily: FONTS.body,
                  fontSize: 14,
                  color: COLORS.ink,
                  borderBottom: `1px solid ${COLORS.lineSoft}`,
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.paperDim}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >
                {country.name} <span style={{ color: COLORS.inkSoft, fontSize: 12 }}>({country.id})</span>
              </li>
            ))
          ) : (
            <li style={{ padding: "10px 14px", color: COLORS.inkSoft, fontSize: 14, fontFamily: FONTS.body }}>
              No countries found.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
