"use client";
import { Children, cloneElement, isValidElement, useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from "react";

type Section = ReactElement<{ children?: ReactNode }>;
export default function PagedTable({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [capacity, setCapacity] = useState(4);
  const sections = Children.toArray(children).filter(isValidElement) as Section[];
  const body = sections.find(section => section.type === "tbody");
  const rows = Children.toArray(body?.props.children);
  const pages = Math.max(1, Math.ceil(rows.length / capacity));
  const current = Math.min(page, pages - 1);
  const signature = rows.map(row => isValidElement(row) ? row.key : "").join("|");
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    // Conserva la fila más alta para que la capacidad no oscile al cambiar de página.
    let measuredRowHeight = 64;
    const resize = () => {
      // En celular muestra todas las filas y permite desplazarse.
      if (window.innerWidth <= 740) { setCapacity(Math.max(rows.length, 1)); return; }
      const top = element.getBoundingClientRect().top;
      const head = element.querySelector("thead")?.getBoundingClientRect().height ?? 36;
      const rowHeights = [...element.querySelectorAll("tbody tr")].map(row => row.getBoundingClientRect().height);
      measuredRowHeight = Math.max(measuredRowHeight, ...rowHeights);
      const rowHeight = measuredRowHeight;
      const available = window.innerHeight - top - head - 110;
      setCapacity(Math.max(1, Math.floor(available / rowHeight)));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    window.addEventListener("resize", resize);
    return () => { observer.disconnect(); window.removeEventListener("resize", resize); };
  }, [signature, rows.length]);
  return <div className="paged-table" ref={root}>
    <table>{sections.map((section, index) => section.type === "tbody" ? cloneElement(section, { key: index }, rows.slice(current * capacity, (current + 1) * capacity)) : section)}</table>
    <footer className="table-pagination"><span>{rows.length ? current * capacity + 1 : 0}–{Math.min((current + 1) * capacity, rows.length)} de {rows.length}</span><div><button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Página anterior">Anterior</button><span>{current + 1} / {pages}</span><button type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label="Página siguiente">Siguiente</button></div></footer>
  </div>;
}