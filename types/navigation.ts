export type PageId =
  | "inicio"
  | "compras"
  | "ventas"
  | "stock"
  | "reparto"
  | "caja"
  | "datos"
  | "reportes";

export type NavigationItem = {
  id: PageId;
  label: string;
};
