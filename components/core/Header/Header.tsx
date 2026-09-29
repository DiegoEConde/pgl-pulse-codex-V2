"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useProgram } from "@/contexts/ProgramContext";
import Logo from "../Logo/Logo";
import Navigation from "../Navigation/Navigation";

export default function Header() {
  const { loading, error, refreshing, refresh } = useProgram();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="topbar">
      <Logo />
      <Navigation open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      <button className="system-state connection-button" disabled={loading || refreshing} onClick={() => void refresh()} aria-label="Actualizar datos"><span /><div><b>{loading || refreshing ? "Actualizando" : error ? "Sin conexión" : "Conectado"}</b><small>Supabase · Actualizar</small></div></button>
      <button className="mobile-menu" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}>
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
    </header>
  );
}
