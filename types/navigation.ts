export type PageId = "inicio" | "compras" | "ventas" | "reparto" | "stock" | "datos" | "reportes";

export type NavigationItem = {
  id: PageId;
  label: string;
};
