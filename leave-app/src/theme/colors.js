// Design tokens for the leave management app.
// Palette: paper / ink / navy (primary) / gold (accent, "sundial") / teal (approved) / clay (rejected)
export const COLORS = {
  paper: "#FAF9F6",
  paperDim: "#F1EFE9",
  ink: "#1B2430",
  inkSoft: "#5B6472",
  navy: "#22314F",
  navyDeep: "#16213A",
  gold: "#C68A2E",
  goldSoft: "#F3E3C4",
  teal: "#2E6E62",
  tealSoft: "#DFEDE9",
  clay: "#B5533C",
  claySoft: "#F3E0DA",
  line: "#E4E1D8",
  card: "#FFFFFF",
};

// Add this import once (e.g. in index.html <head> or index.css):
// @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
export const FONTS = {
  display: "'Fraunces', serif",
  body: "'Inter', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

export const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: `1px solid ${COLORS.line}`,
  fontFamily: FONTS.body,
  fontSize: 14,
  color: COLORS.ink,
  background: "#fff",
  boxSizing: "border-box",
};
