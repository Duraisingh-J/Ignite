import React from "react";
import { COLORS } from "../theme/colors";

export default function ShimmerBlock({ width = "100%", height = 20, borderRadius = 4, style = {} }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: `linear-gradient(to right, ${COLORS.paperDim} 8%, #e0dcd2 18%, ${COLORS.paperDim} 33%)`,
        backgroundSize: "1000px 100%",
        animation: "shimmer 2s infinite linear forwards",
        ...style,
      }}
    />
  );
}
