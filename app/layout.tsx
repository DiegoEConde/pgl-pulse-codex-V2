import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { AppProvider } from "@/contexts/AppContext";
import { ProgramProvider } from "@/contexts/ProgramContext";
import "./globals.css";

const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "PGL Pulse",
  description: "Sistema operativo de gestión centrado en la unidad física",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable}`}>
      <body><AppProvider><ProgramProvider>{children}</ProgramProvider></AppProvider></body>
    </html>
  );
}
