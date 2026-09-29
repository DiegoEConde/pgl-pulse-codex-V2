"use client";
import { Children, useId, useState, type ReactNode } from "react";

export default function WorkspaceTabs({ labels, children, onChange }: { labels: string[]; children: ReactNode; onChange?: (index: number) => void }) {
  const [selected, setSelected] = useState(0);
  const id = useId();
  // Los paneles se ocultan sin desmontarse para conservar filtros y formularios.
  const panels = Children.toArray(children);
  return <div className="workspace-tabs">
    <div className="workspace-tablist" role="tablist" aria-label="Secciones de la pantalla">
      {labels.map((label, index) => <button key={label} role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={selected === index} tabIndex={selected === index ? 0 : -1} onClick={() => { setSelected(index); onChange?.(index); }} onKeyDown={event => {
        const next = event.key === "ArrowRight" ? (index + 1) % labels.length : event.key === "ArrowLeft" ? (index + labels.length - 1) % labels.length : event.key === "Home" ? 0 : event.key === "End" ? labels.length - 1 : null;
        if (next !== null) { event.preventDefault(); setSelected(next); onChange?.(next); document.getElementById(`${id}-tab-${next}`)?.focus(); }
      }}>{label}</button>)}
    </div>
    {panels.map((panel, index) => <div key={index} className="workspace-tabpanel" role="tabpanel" id={`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`} hidden={selected !== index}>{panel}</div>)}
  </div>;
}
