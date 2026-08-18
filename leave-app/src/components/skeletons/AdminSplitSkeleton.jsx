import React from "react";
import ShimmerBlock from "../ShimmerBlock";
import { FONTS } from "../../theme/colors";

export default function AdminSplitSkeleton({ title = "Admin" }) {
  return (
    <div style={{ maxWidth: 850, margin: "0 auto", padding: "40px 0" }}>
      <ShimmerBlock width={60} height={14} borderRadius={4} style={{ marginBottom: 12 }} />
      <ShimmerBlock width={180} height={36} borderRadius={8} style={{ marginBottom: 24 }} />
      
      <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
        {/* Left Form Skeleton */}
        <div style={{ flex: 1, minWidth: 320, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <ShimmerBlock width={80} height={14} style={{ marginBottom: 6 }} />
            <ShimmerBlock width="100%" height={40} borderRadius={8} />
          </div>
          <div>
            <ShimmerBlock width={100} height={14} style={{ marginBottom: 6 }} />
            <ShimmerBlock width="100%" height={40} borderRadius={8} />
          </div>
          <div>
            <ShimmerBlock width={70} height={14} style={{ marginBottom: 6 }} />
            <ShimmerBlock width="100%" height={80} borderRadius={8} />
          </div>
          <ShimmerBlock width="100%" height={40} borderRadius={8} style={{ marginTop: 16 }} />
        </div>
        
        {/* Right List Skeleton */}
        <div style={{ flex: 1.5, display: "flex", flexDirection: "column", gap: 12 }}>
          <ShimmerBlock width="100%" height={80} borderRadius={12} />
          <ShimmerBlock width="100%" height={80} borderRadius={12} />
          <ShimmerBlock width="100%" height={80} borderRadius={12} />
        </div>
      </div>
    </div>
  );
}
