import React from "react";

export default function DataRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline py-2.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground sm:w-48 shrink-0 mb-0.5 sm:mb-0">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}