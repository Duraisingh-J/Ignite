import React from "react";
import ShimmerBlock from "../ShimmerBlock";

export default function CalendarSkeleton() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 0" }}>
      <ShimmerBlock width={100} height={14} borderRadius={4} style={{ marginBottom: 12 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <ShimmerBlock width={250} height={36} borderRadius={8} />
        <ShimmerBlock width={180} height={36} borderRadius={8} />
      </div>
      
      {/* Calendar Grid */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "20px", border: "1px solid #E4E1D8", minHeight: 600 }}>
        {/* Days of week row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 12, marginBottom: 16 }}>
          {[1,2,3,4,5,6,7].map(i => (
            <ShimmerBlock key={i} width="100%" height={20} borderRadius={4} />
          ))}
        </div>
        
        {/* Calendar Cells */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "100px", gap: 12 }}>
          {Array.from({ length: 35 }).map((_, i) => (
            <ShimmerBlock key={i} width="100%" height="100%" borderRadius={8} style={{ opacity: i < 3 || i > 31 ? 0.3 : 1 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
