"use client";

import { navigationItems } from "@/config/navigation";
import { useApp } from "@/contexts/AppContext";
import type { NavigationItem, PageId } from "@/types/navigation";

export default function Navigation({ open, onNavigate, items = navigationItems, activePage }: { open: boolean; onNavigate?: () => void; items?: NavigationItem[]; activePage?: PageId }) {
  const { currentPage, navigate } = useApp();
  const selectedPage = activePage ?? currentPage;
  return (
    <nav className={`nav ${open ? "open" : ""}`} aria-label="Navegación principal">
      {items.map((item) => (
        <button key={item.id} className={`nav-item ${selectedPage === item.id ? "active" : ""}`} onClick={() => { navigate(item.id); onNavigate?.(); }}>
          {item.label}
        </button>
      ))}
    </nav>
  );
}
