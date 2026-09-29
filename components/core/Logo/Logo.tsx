"use client";

import Image from "next/image";
import { Orbitron } from "next/font/google";
import { useApp } from "@/contexts/AppContext";
import pglLogo from "@/assets/pgl-logo.png";
import styles from "./Logo.module.css";

const orbitron = Orbitron({ subsets: ["latin"], weight: "600" });

export default function Logo() {
  const { navigate } = useApp();
  return (
    <button className={`brand ${styles.brand}`} onClick={() => navigate("inicio")} aria-label="PGL Pulse - Ir al inicio">
      <svg className={styles.heartbeat} viewBox="0 0 48 40" fill="none" aria-hidden="true">
        <path d="M2 22h9l5-9 7 23 7-32 5 18h11" />
      </svg>
      <span className={styles.logoWindow} aria-hidden="true">
        <Image className={styles.logo} src={pglLogo} alt="" sizes="100px" priority />
      </span>
      <span className={`${styles.word} ${orbitron.className}`} aria-hidden="true">pulse</span>
    </button>
  );
}

