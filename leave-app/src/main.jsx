import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Minimal reset; the rest of the styling is inline via theme/colors.js.
const reset = document.createElement("style");
reset.textContent = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; }
  @keyframes shimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
  }
`;
document.head.appendChild(reset);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
