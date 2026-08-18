import React from "react";
import ShimmerBlock from "../ShimmerBlock";

export default function TableSkeleton() {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 0" }}>
      <ShimmerBlock width={120} height={14} borderRadius={4} style={{ marginBottom: 12 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <ShimmerBlock width={200} height={36} borderRadius={8} />
        <ShimmerBlock width={150} height={36} borderRadius={8} />
      </div>
      
      <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: "1px solid #E4E1D8" }}>
        {/* Table Header */}
        <div style={{ display: "flex", gap: 16, borderBottom: "1px solid #E4E1D8", paddingBottom: 16, marginBottom: 16 }}>
          <ShimmerBlock width="20%" height={16} />
          <ShimmerBlock width="25%" height={16} />
          <ShimmerBlock width="15%" height={16} />
          <ShimmerBlock width="20%" height={16} />
          <ShimmerBlock width="20%" height={16} />
        </div>
        
        {/* Table Rows */}
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ display: "flex", gap: 16, padding: "12px 0", borderBottom: i !== 5 ? "1px solid #f5f5f5" : "none" }}>
            <ShimmerBlock width="18%" height={16} />
            <ShimmerBlock width="22%" height={16} />
            <ShimmerBlock width="12%" height={16} />
            <ShimmerBlock width="15%" height={16} />
            <ShimmerBlock width="25%" height={24} borderRadius={12} />
          </div>
        ))}
      </div>
    </div>
  );
}
