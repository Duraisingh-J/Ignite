import React from "react";
import ShimmerBlock from "../ShimmerBlock";

export default function DashboardSkeleton({ title = "Dashboard" }) {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 0" }}>
      <ShimmerBlock width={100} height={14} borderRadius={4} style={{ marginBottom: 12 }} />
      <ShimmerBlock width={160} height={36} borderRadius={8} style={{ marginBottom: 24 }} />
      
      {/* Top Cards Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 40 }}>
        <ShimmerBlock width="100%" height={110} borderRadius={12} />
        <ShimmerBlock width="100%" height={110} borderRadius={12} />
        <ShimmerBlock width="100%" height={110} borderRadius={12} />
        <ShimmerBlock width="100%" height={110} borderRadius={12} />
      </div>

      {/* Main Content Area */}
      <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
        <div style={{ flex: 2 }}>
          <ShimmerBlock width={180} height={20} style={{ marginBottom: 16 }} />
          <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: "1px solid #E4E1D8" }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ padding: "16px 0", borderBottom: i !== 3 ? "1px solid #f5f5f5" : "none" }}>
                <ShimmerBlock width="30%" height={16} style={{ marginBottom: 8 }} />
                <ShimmerBlock width="60%" height={14} />
              </div>
            ))}
          </div>
        </div>
        
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          <ShimmerBlock width={120} height={20} style={{ marginBottom: 4 }} />
          <ShimmerBlock width="100%" height={150} borderRadius={12} />
          <ShimmerBlock width="100%" height={150} borderRadius={12} />
        </div>
      </div>
    </div>
  );
}
