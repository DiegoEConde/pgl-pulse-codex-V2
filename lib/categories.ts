export type Category = { id: number; nombre: string };
export type CategoryCharacteristic = {
  id: number; categoria_id: number; clave: string; etiqueta: string;
  tipo: "lista" | "entero"; valores: string[]; minimo: number | null;
  maximo: number | null; obligatoria: boolean;
};

export function sortedValues(field: CategoryCharacteristic) {
  const magnitude = (value: string) => Number.parseFloat(value) * (/TB$/i.test(value) ? 1024 : 1);
  return [...field.valores].sort((a, b) => ["ram", "rom", "pulgadas"].includes(field.clave)
    ? magnitude(a) - magnitude(b) : a.localeCompare(b, "es"));
}
