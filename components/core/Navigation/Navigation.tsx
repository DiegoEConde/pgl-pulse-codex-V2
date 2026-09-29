"use client";

import { navigationItems } from "@/config/navigation";
import { useApp } from "@/contexts/AppContext";

export default function Navigation({ open, onNavigate }: { open: boolean; onNavigate?: () => void }) {
  const { currentPage, navigate } = useApp();
  return (
    <nav className={`nav ${open ? "open" : ""}`} aria-label="Navegación principal">
      {navigationItems.map((item) => (
        <button key={item.id} className={`nav-item ${currentPage === item.id ? "active" : ""}`} onClick={() => { navigate(item.id); onNavigate?.(); }}>
          {item.label}
        </button>
      ))}
    </nav>
  );
}
