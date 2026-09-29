"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import styles from "./ReportsScreen.module.css";
export default function ReportModal({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}) {
 const ref=useRef<HTMLDialogElement>(null);
 // El diálogo nativo contiene el foco; al cerrar lo devuelve al control que lo abrió.
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;const dialog=ref.current;dialog?.showModal();return()=>{dialog?.close();previous?.focus();};},[]);
 return <dialog ref={ref} className={styles.modal} aria-label={title} onCancel={event=>{event.preventDefault();onClose();}}>
  <header className={styles.modalHeader}><h2>{title}</h2><button type="button" aria-label="Cerrar modal" onClick={onClose}><X size={20}/></button></header>
  <div className={styles.modalBody}>{children}</div>
 </dialog>;
}
