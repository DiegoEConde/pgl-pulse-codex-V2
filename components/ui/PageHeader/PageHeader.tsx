"use client";
import type { ReactNode } from "react";
import { useProgram } from "@/contexts/ProgramContext";
import { formatDate } from "@/lib/dates";
export default function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  const { today } = useProgram();
  return <header className="page-head"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action ?? <div className="date-block"><b>Operación del día</b>{formatDate(today)}</div>}</header>;
}
