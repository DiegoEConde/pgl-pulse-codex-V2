import type { Metadata } from "next";
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "PGL Pulse",
  description: "Sistema operativo de gestion para ventas, compras, caja, rutas y stock",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body><AppProvider><AuthProvider>{children}</AuthProvider></AppProvider></body>
    </html>
  );
}
