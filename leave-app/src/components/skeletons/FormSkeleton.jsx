import React from "react";
import ShimmerBlock from "../ShimmerBlock";

export default function FormSkeleton({ title = "Form" }) {
  return (
    <div style={{ maxWidth: 850, margin: "0 auto", padding: "40px 0" }}>
      <ShimmerBlock width={100} height={14} borderRadius={4} style={{ marginBottom: 12 }} />
      <ShimmerBlock width={200} height={36} borderRadius={8} style={{ marginBottom: 24 }} />
      
      <div style={{ maxWidth: 500, display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <ShimmerBlock width={120} height={14} style={{ marginBottom: 8 }} />
          <ShimmerBlock width="100%" height={40} borderRadius={8} />
        </div>
        <div>
          <ShimmerBlock width={100} height={14} style={{ marginBottom: 8 }} />
          <ShimmerBlock width="100%" height={40} borderRadius={8} />
        </div>
        <div>
          <ShimmerBlock width={150} height={14} style={{ marginBottom: 8 }} />
          <ShimmerBlock width="100%" height={100} borderRadius={8} />
        </div>
        
        <ShimmerBlock width={120} height={40} borderRadius={8} style={{ marginTop: 16 }} />
      </div>
    </div>
  );
}
