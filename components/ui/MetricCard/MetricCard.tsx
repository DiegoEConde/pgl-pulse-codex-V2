import type { ReactNode } from "react";

export default function MetricCard({ label, value, detail, icon, color = "var(--blue)" }: { label: string; value: string; detail?: string; icon: ReactNode; color?: string }) {
  return <article className="metric" style={{ "--accent": color } as React.CSSProperties}><div className="metric-top"><span>{label}</span><i className="metric-icon">{icon}</i></div><strong>{value}</strong>{detail && <small>{detail}</small>}</article>;
}

