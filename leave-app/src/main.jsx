import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Minimal reset; the rest of the styling is inline via theme/colors.js.
const reset = document.createElement("style");
reset.textContent = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; }
`;
document.head.appendChild(reset);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
