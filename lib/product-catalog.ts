import type { MasterRecord } from "@/config/catalogs";

export function categoryLabel(value: string) {
  return value.toLocaleLowerCase("es").replace(/(^|\s)(\S)/g, (_, space: string, letter: string) => space + letter.toLocaleUpperCase("es"));
}

export function productAttributes(record: MasterRecord): Record<string, string> {
  const attributes = typeof record.atributos === "object" && record.atributos !== null ? record.atributos : {};
  return Object.fromEntries(Object.entries(attributes).filter(([key]) => key !== "color"));
}

export function sameProduct(left: MasterRecord, right: MasterRecord) {
  const normalize = (value: unknown) => String(value ?? "").trim().toLocaleLowerCase("es");
  if (!["categoria", "nombre", "marca"].every(key => normalize(left[key]) === normalize(right[key]))) return false;
  const a = productAttributes(left), b = productAttributes(right);
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].every(key => (a[key] ?? "") === (b[key] ?? ""));
}
