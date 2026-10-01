import type { CatalogId, MasterRecord } from "@/config/catalogs";

export async function persistRecord(_catalog: CatalogId, _record: MasterRecord, _creating: boolean) {
  void _catalog;
  void _record;
  void _creating;
  throw new Error("Los catalogos reales estan deshabilitados en el mockup v2.");
}

export function catalogError(error: unknown) {
  return error instanceof Error ? error.message : "No se pudo guardar el registro.";
}
