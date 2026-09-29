"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { PageId } from "@/types/navigation";

type AppContextValue = {
  currentPage: PageId;
  navigate: (page: PageId) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<PageId>("inicio");
  return <AppContext.Provider value={{ currentPage, navigate: setCurrentPage }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp debe utilizarse dentro de AppProvider");
  return context;
}
