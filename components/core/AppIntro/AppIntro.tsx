"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import logo from "@/assets/pgl-logo.png";
import styles from "./AppIntro.module.css";

export default function AppIntro({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!ready) return;
    // Sincroniza la salida con el CSS y respeta la preferencia de movimiento reducido.
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 800 : 5600;
    const timer = window.setTimeout(() => setFinished(true), duration);
    return () => window.clearTimeout(timer);
  }, [ready]);

  return (
    <div className={styles.stage} data-playing={ready && !finished} data-finished={finished}>
      <div className={styles.application} inert={!finished} aria-hidden={!finished}>
        {children}
      </div>
      {!finished && <div className={styles.intro} role="status" aria-label="Iniciando PGL Pulse">
        <div className={styles.halo} aria-hidden="true" />
        <Image className={styles.logo} src={logo} alt="PGL Electrónica" priority sizes="(max-width: 680px) 84vw, 640px" onLoad={() => setReady(true)} onError={() => setFinished(true)} />
        <div className={`pulse ${styles.pulse}`} aria-hidden="true" />
      </div>}
    </div>
  );
}
